#!/bin/bash
# Label one loop round's batch with one teacher, under rubric v3.1 / schema v3.
# Same harness contract as every screen before it: the model writes to stdout, the
# HARNESS writes the label files, and the validator is the only authority on
# completeness. Usage: run_loop_round.sh <round:001> <grok|codex>
set -u
ROUND=${1:?usage: run_loop_round.sh <round> <grok|codex|gemma>}
MODEL=${2:?usage: run_loop_round.sh <round> <grok|codex|gemma|opus>}
if [ "$ROUND" = "100" ]; then
  case "$MODEL" in
    codex|gemma)
      exec uv run python -m ml.repair_round100 repair --arm "$MODEL"
      ;;
    opus)
      echo "round 100 Opus screening is paused"
      exit 2
      ;;
  esac
fi
DIR=pilot/screening/loop/round_${ROUND}
RAW=$DIR/raw_${MODEL}
mkdir -p "$RAW"
: > "$DIR/partial_${MODEL}.jsonl"
for p in "$DIR"/prompts/prompt_*.txt; do
  ch=$(basename "$p" | sed 's/prompt_\(.*\)\.txt/\1/')
  out=$RAW/chunk_${ch}.json
  [ -s "$out" ] && continue
  # mkdir is atomic: with N parallel workers on one arm, exactly one wins each chunk.
  lock=$RAW/.lock_${ch}
  mkdir "$lock" 2>/dev/null || continue
  trap 'rmdir "$lock" 2>/dev/null' EXIT
  echo "[loop $ROUND $MODEL] chunk $ch"
  if [ "$MODEL" = "grok" ]; then
    /Users/choxos/.grok/bin/grok --prompt-file "$p" -m grok-4.5 --reasoning-effort medium \
      --disable-web-search --no-subagents > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
  elif [ "$MODEL" = "opus" ]; then
    claude -p --model claude-opus-4-8 --max-turns 3 \
      "$(cat "$p")" > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
  else
    # </dev/null is load-bearing: with the prompt passed as an argument, codex still
    # polls stdin, and a backgrounded harness hands it a pipe that never closes, so the
    # call hangs forever printing 'Reading additional input from stdin...' (round 006).
    codex exec --model gpt-5.6-luna -c model_reasoning_effort='"medium"' --sandbox read-only \
      --skip-git-repo-check "$(cat "$p")" < /dev/null > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
  fi
  rmdir "$lock" 2>/dev/null
  # BOTH STREAMS, NOT JUST STDOUT.
  #
  # The codex CLI sometimes writes its whole answer to stderr and leaves stdout
  # empty. This parser read stdout only, so 42 of round_100's 414 chunks were
  # declared "no v3 JSON array" while their labels sat complete in stderr_NNN.txt,
  # and the resilient wrapper then retried each of them thirty times, failing
  # identically every time. A retry loop cannot rescue a parser pointed at the
  # wrong stream. Read where the model actually wrote.
  python3 - "$RAW/stdout_${ch}.txt" "$RAW/stderr_${ch}.txt" "$out" <<'PY'
import json, sys

def extract(path):
    try:
        raw = open(path, errors='replace').read()
    except OSError:
        return None
    i = raw.find('[')
    while i != -1:
        j = raw.rfind(']')
        while j > i:
            try:
                c = json.loads(raw[i:j+1])
                if isinstance(c, list) and c and isinstance(c[0], dict) and 'categories' in c[0]:
                    return c
                break
            except Exception:
                j = raw.rfind(']', 0, j)
        i = raw.find('[', i + 1)
    return None

best = extract(sys.argv[1]) or extract(sys.argv[2])
if best:
    json.dump(best, open(sys.argv[3], 'w'))
else:
    print("no v3 JSON array in stdout OR stderr", file=sys.stderr); sys.exit(3)
PY
done
# assemble: chunks -> one labels file, then VALIDATE (set equality + schema)
python3 ml/validate_round.py "$ROUND" "$MODEL"
