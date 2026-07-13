#!/bin/bash
# Label one loop round's batch with one teacher, under rubric v3.1 / schema v3.
# Same harness contract as every screen before it: the model writes to stdout, the
# HARNESS writes the label files, and the validator is the only authority on
# completeness. Usage: run_loop_round.sh <round:001> <grok|codex>
set -u
ROUND=${1:?usage: run_loop_round.sh <round> <grok|codex>}
MODEL=${2:?usage: run_loop_round.sh <round> <grok|codex>}
DIR=pilot/screening/loop/round_${ROUND}
RAW=$DIR/raw_${MODEL}
mkdir -p "$RAW"
: > "$DIR/partial_${MODEL}.jsonl"
for p in "$DIR"/prompts/prompt_*.txt; do
  ch=$(basename "$p" | sed 's/prompt_\(.*\)\.txt/\1/')
  out=$RAW/chunk_${ch}.json
  [ -s "$out" ] && continue
  echo "[loop $ROUND $MODEL] chunk $ch"
  if [ "$MODEL" = "grok" ]; then
    /Users/choxos/.grok/bin/grok --prompt-file "$p" -m grok-4.5 --reasoning-effort medium \
      --disable-web-search --no-subagents > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
  else
    codex exec --model gpt-5.6-luna -c model_reasoning_effort='"medium"' --sandbox read-only \
      --skip-git-repo-check "$(cat "$p")" > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
  fi
  python3 - "$RAW/stdout_${ch}.txt" "$out" <<'PY'
import json, sys
raw = open(sys.argv[1]).read()
best = None; i = raw.find('[')
while i != -1:
    j = raw.rfind(']')
    while j > i:
        try:
            c = json.loads(raw[i:j+1])
            if isinstance(c, list) and c and isinstance(c[0], dict) and 'categories' in c[0]:
                best = c
            break
        except Exception:
            j = raw.rfind(']', 0, j)
    if best: break
    i = raw.find('[', i + 1)
if best:
    json.dump(best, open(sys.argv[2], 'w'))
else:
    print("no v3 JSON array in stdout", file=sys.stderr); sys.exit(3)
PY
done
# assemble: chunks -> one labels file, then VALIDATE (set equality + schema)
python3 ml/validate_round.py "$ROUND" "$MODEL"
