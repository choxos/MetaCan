#!/bin/bash
# Grok 4.5 (medium effort) screening arm. Usage: run_screen_grok.sh <run-name>
#
# The HARNESS writes the label files from the model's stdout; the model never
# touches the filesystem. That is the D11 lesson as architecture: an agent
# cannot fabricate a file it was never allowed to write.
set -u
RUN=${1:?usage: run_screen_grok.sh <run-name>}
DIR=pilot/screening/frame1k
OUT=$DIR/$RUN
RAW=$OUT/raw
mkdir -p "$RAW"

# NO --json-schema: constrained decoding took >7 minutes per chunk against 1:49
# without it, and the validator already rejects anything malformed. The schema
# lives in the prompt; the guarantee lives in the validator.
for p in "$DIR"/prompts/prompt_*.txt; do
  ch=$(basename "$p" | sed 's/prompt_\(.*\)\.txt/\1/')
  out=$OUT/labels_${ch}.json
  [ -s "$out" ] && continue     # resumable: a validated chunk is not re-run
  echo "[grok $RUN] chunk $ch"
  /Users/choxos/.grok/bin/grok --prompt-file "$p" -m grok-4.5 --reasoning-effort medium \
      --disable-web-search --no-subagents \
      > "$RAW/stdout_${ch}.txt" 2> "$RAW/stderr_${ch}.txt"
  # keep only the JSON array (defensive: strip anything around it)
  python3 - "$RAW/stdout_${ch}.txt" "$out" <<'EOF'
import json, sys
raw = open(sys.argv[1]).read()
start = raw.find('[')
end = raw.rfind(']')
try:
    labels = json.loads(raw[start:end+1])
    assert isinstance(labels, list) and len(labels) > 0
    json.dump(labels, open(sys.argv[2], 'w'))
except Exception as e:
    print(f"chunk parse failed: {e}", file=sys.stderr)
EOF
done

echo "[grok $RUN] all chunks attempted; validating against the manifest"
Rscript pilot/validate_frame1k_labels.R "$OUT"
