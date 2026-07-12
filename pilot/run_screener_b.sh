#!/bin/bash
# Screener B: GPT-5.6 (codex) labels the stratified sample against the same
# locked rubric as screener A, independently.
#
# Two things this script exists to remember, both learned the hard way:
#
#   1. Run at most TWO codex sessions at once. Higher parallelism silently
#      throttles: sessions die without writing, and without logging why.
#   2. Keep the worker loop inside a bash script with a shebang. The calling
#      shell here is zsh, where `export -f` does not export functions, so an
#      inline `xargs ... bash -c 'go ...'` finds no `go` and fails instantly,
#      producing an empty run that looks like a rate limit but is not one.
#
# Idempotent: an existing, non-empty chunk file is skipped, so re-running fills
# gaps rather than redoing work.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

PROMPTS="${1:?usage: run_screener_b.sh <prompt-dir>}"
OUT="pilot/screening/codex"
LOGS="${TMPDIR:-/tmp}/metacan-screener-b"
PAR=2
N_CHUNKS=26

mkdir -p "$OUT" "$LOGS"

screen_chunk() {
  local n="$1"
  local out="$OUT/chunk_${n}.json"

  if [ -s "$out" ]; then
    echo "  [$n] skip"
    return 0
  fi

  # Two attempts. A codex session that dies mid-write leaves nothing behind, so
  # the file's existence is the only success signal worth trusting.
  local try
  for try in 1 2; do
    timeout 900 codex exec \
      --sandbox workspace-write \
      --skip-git-repo-check \
      < "$PROMPTS/p_${n}.txt" \
      > "$LOGS/chunk_${n}.log" 2>&1

    if [ -s "$out" ]; then
      echo "  [$n] ok (try $try)"
      return 0
    fi
    sleep 15
  done

  echo "  [$n] FAILED: see $LOGS/chunk_${n}.log"
  return 1
}
export -f screen_chunk
export OUT PROMPTS LOGS

echo "screener B: $(ls "$OUT"/*.json 2>/dev/null | wc -l | tr -d ' ')/$N_CHUNKS present; filling gaps at -P $PAR"

seq -w 1 "$N_CHUNKS" | xargs -P "$PAR" -I{} bash -c 'screen_chunk "$@"' _ {}

echo "=== screener B: $(ls "$OUT"/*.json 2>/dev/null | wc -l | tr -d ' ')/$N_CHUNKS ==="
