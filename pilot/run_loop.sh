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

# the two CLI teachers in parallel; opus after them (claude CLI is not re-entrant here)
bash pilot/run_loop_round.sh "$R" grok  &
bash pilot/run_loop_round.sh "$R" codex &
wait
bash pilot/run_loop_round.sh "$R" opus

python3 ml/loop.py "$N"
