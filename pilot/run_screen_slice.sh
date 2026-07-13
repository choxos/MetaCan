#!/bin/bash
# Run the Grok and GPT screening arms CONCURRENTLY for a bounded slice of time.
#
# WHY A SLICE RUNNER EXISTS AT ALL
# --------------------------------
# Detached background runs of these arms lose filesystem permission part-way
# through: every read starts returning "Operation not permitted", the loop keeps
# going, and the runner reports "all chunks attempted" having silently failed most
# of them. That is the worst possible failure shape, because the RUNNER's exit
# status is fine and only the label files are missing.
#
# The manifest validator is what makes this survivable: a chunk counts only if a
# label file exists and reconciles by set equality. A chunk killed mid-flight
# writes NO file (the parse-and-write step never runs), so it is simply retried on
# the next slice. Nothing is half-written, so nothing is half-trusted.
#
# Usage: run_screen_slice.sh <seconds>
set -u
SECS=${1:-540}
cd "$(dirname "$0")/.." || exit 1

before_g=$(ls pilot/screening/frame1k/grok_r1/labels_*.json 2>/dev/null | wc -l | tr -d ' ')
before_c=$(ls pilot/screening/frame1k/codex_r1/labels_*.json 2>/dev/null | wc -l | tr -d ' ')

# The runners validate at the end and exit nonzero while chunks are still missing.
# That is correct behavior for them and noise for us, so the slice ignores it and
# reports progress in the only currency that counts: label files on disk.
( timeout "$SECS" bash pilot/run_screen_grok.sh  grok_r1  > logs/grok_5k.log  2>&1 ) &
( timeout "$SECS" bash pilot/run_screen_codex.sh codex_r1 > logs/codex_5k.log 2>&1 ) &
wait

after_g=$(ls pilot/screening/frame1k/grok_r1/labels_*.json 2>/dev/null | wc -l | tr -d ' ')
after_c=$(ls pilot/screening/frame1k/codex_r1/labels_*.json 2>/dev/null | wc -l | tr -d ' ')

# The denominator is COUNTED, not hardcoded. It WAS hardcoded to 100, and then the
# partition repair added chunks 101-112, so the runner cheerfully printed "101/100"
# and would have printed "100/100 complete" with 12 chunks missing. A progress meter
# that cannot exceed 100% is a progress meter that lies as soon as the work grows.
total=$(ls pilot/screening/frame1k/prompts/prompt_*.txt 2>/dev/null | wc -l | tr -d ' ')

echo "grok : ${before_g} -> ${after_g} / ${total}  (+$((after_g - before_g)))"
echo "gpt  : ${before_c} -> ${after_c} / ${total}  (+$((after_c - before_c)))"
[ "$after_g" -eq "$total" ] && [ "$after_c" -eq "$total" ] && echo "BOTH ARMS COMPLETE"
exit 0
