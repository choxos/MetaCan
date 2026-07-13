#!/bin/bash
# Re-screen the contested works under rubric v2. Same harness architecture as v1:
# the model writes to stdout, the HARNESS writes the label files, the validator is
# the only authority on completeness.
set -u
MODEL=${1:?usage: run_screen_v2.sh <grok|codex>}
DIR=pilot/screening/frame1k/v2
OUT=$DIR/${MODEL}_v2; RAW=$OUT/raw
mkdir -p "$RAW"
for p in "$DIR"/prompts/prompt_*.txt; do
  ch=$(basename "$p" | sed 's/prompt_\(.*\)\.txt/\1/')
  out=$OUT/labels_${ch}.json
  [ -s "$out" ] && continue
  echo "[$MODEL v2] chunk $ch"
  if [ "$MODEL" = "grok" ]; then
    /Users/choxos/.grok/bin/grok --prompt-file "$p" -m grok-4.5 --reasoning-effort medium \
      --disable-web-search --no-subagents > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
  else
    codex exec --model gpt-5.6-luna -c model_reasoning_effort='"high"' --sandbox read-only \
      "$(cat "$p")" > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
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
            if isinstance(c, list) and c and isinstance(c[0], dict) and 'tier' in c[0]: best = c
            break
        except Exception: j = raw.rfind(']', 0, j)
    i = raw.find('[', i + 1)
    if best: break
if best: json.dump(best, open(sys.argv[2], 'w'))
else: print("no JSON array", file=sys.stderr)
PY
done
echo "[$MODEL v2] done: $(ls $OUT/labels_*.json 2>/dev/null | wc -l | tr -d ' ') chunks"
