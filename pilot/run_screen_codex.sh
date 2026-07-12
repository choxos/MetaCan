#!/bin/bash
# GPT-5.6 (high effort, via the Codex CLI) screening arm.
# Usage: run_screen_codex.sh <run-name>
# Same architecture as the Grok runner: model emits JSON to stdout, the harness
# writes the files, the validator is the only authority on completeness.
set -u
RUN=${1:?usage: run_screen_codex.sh <run-name>}
DIR=pilot/screening/frame1k
OUT=$DIR/$RUN
RAW=$OUT/raw
mkdir -p "$RAW"

for p in "$DIR"/prompts/prompt_*.txt; do
  ch=$(basename "$p" | sed 's/prompt_\(.*\)\.txt/\1/')
  out=$OUT/labels_${ch}.json
  [ -s "$out" ] && continue
  echo "[codex $RUN] chunk $ch"
  codex exec --model gpt-5.6-luna -c model_reasoning_effort='"high"' \
      --sandbox read-only "$(cat "$p")" \
      > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
  python3 - "$RAW/stdout_${ch}.txt" "$out" <<'EOF'
import json, sys
raw = open(sys.argv[1]).read()
# codex stdout interleaves hook/progress noise; the answer is the last
# well-formed JSON array in the stream.
best = None
i = raw.find('[')
while i != -1:
    j = raw.rfind(']')
    while j > i:
        try:
            cand = json.loads(raw[i:j+1])
            if isinstance(cand, list) and cand and isinstance(cand[0], dict) and 'tier' in cand[0]:
                best = cand
            break
        except Exception:
            j = raw.rfind(']', 0, j)
    i = raw.find('[', i + 1)
    if best:
        break
if best:
    json.dump(best, open(sys.argv[2], 'w'))
else:
    print("no JSON array found", file=sys.stderr)
EOF
done

echo "[codex $RUN] all chunks attempted; validating against the manifest"
Rscript pilot/validate_frame1k_labels.R "$OUT"
