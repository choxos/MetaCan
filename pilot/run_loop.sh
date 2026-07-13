#!/bin/bash
# One full loop round, end to end: select -> three teachers -> validate -> retrain ->
# maturity gate. Usage: run_loop.sh <round-number>   e.g. run_loop.sh 2
# Rounds are resumable: every stage skips work that already exists, so a crashed round
# is re-run with the same number and picks up where it stopped.
set -euo pipefail
N=${1:?usage: run_loop.sh <round-number>}
R=$(printf '%03d' "$N")
DIR=pilot/screening/loop/round_${R}

[ -f "$DIR/batch.json" ] || python3 ml/select_batch.py "$N"

# The two CLI teachers in parallel; opus after them (claude CLI is not re-entrant here).
# wait is per-pid and CHECKED: plain `wait` swallows background exit codes, and in round
# 006 the codex arm died at launch, produced zero labels, and the driver sailed on to the
# opus arm as if nothing had happened. Training was protected (a round only counts when
# all three arms validate), but a driver that cannot notice a dead arm is a driver that
# wastes the two arms that worked.
bash pilot/run_loop_round.sh "$R" grok  & PID_G=$!
bash pilot/run_loop_round.sh "$R" codex & PID_C=$!
FAIL=0
wait "$PID_G" || { echo "[run_loop] grok arm FAILED";  FAIL=1; }
wait "$PID_C" || { echo "[run_loop] codex arm FAILED"; FAIL=1; }
[ "$FAIL" -eq 0 ] || exit 1
bash pilot/run_loop_round.sh "$R" opus

python3 ml/loop.py "$N"
