#!/bin/bash
# Outer resilience loop around run_loop_round.sh.
#
# Why it exists: macOS intermittently revokes ~/Documents access from
# long-running processes. During one of those windows a worker's `cat` on every
# prompt file returns EPERM, so the inner loop burns through all 414 chunks
# failing fast, exits cleanly, and the log ends looking finished at 22% done.
# This wrapper re-enters the arm until every chunk file exists, and gives up
# only after 30 consecutive passes with zero new chunks, which is a real,
# persistent failure and not a permission window.
ROUND=$1; MODEL=$2
if [ "$ROUND" = "100" ]; then
  case "$MODEL" in
    codex|gemma)
      exec uv run python -m ml.repair_round100 repair --arm "$MODEL"
      ;;
    opus)
      echo "[wrapper] round 100 Opus screening is paused"
      exit 2
      ;;
  esac
fi
DIR=pilot/screening/loop/round_${ROUND}
RAW=$DIR/raw_${MODEL}
TOTAL=$(ls "$DIR"/prompts/prompt_*.txt 2>/dev/null | wc -l | tr -d ' ')
[ "$TOTAL" -gt 0 ] || { echo "[wrapper] no prompts in $DIR"; exit 1; }

stall=0
while :; do
  n=$(ls "$RAW"/chunk_*.json 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" -ge "$TOTAL" ] && break
  bash pilot/run_loop_round.sh "$ROUND" "$MODEL" || true
  n2=$(ls "$RAW"/chunk_*.json 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n2" -le "$n" ]; then stall=$((stall+1)); else stall=0; fi
  if [ "$stall" -ge 30 ]; then
    echo "[wrapper] $MODEL: 30 stalled passes at $n2/$TOTAL; giving up"
    exit 1
  fi
  sleep 20
done
echo "[wrapper] $MODEL: all $TOTAL chunks present"
