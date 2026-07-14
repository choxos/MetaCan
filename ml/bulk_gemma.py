"""Gemma arm over round_100, threaded, resumable, same layout as every other arm.

The first run died at chunk 7 with PermissionError: macOS intermittently revokes
~/Documents access from long-running processes, and one unguarded exception in a
thread took down the whole executor while the log looked routine. So every chunk
guards broadly (an EPERM inside build_prompt or json.dump costs one chunk, one
pass, not the process), and an outer loop re-enters until nothing is left, giving
up only after 30 consecutive passes with zero progress, which is a real failure
and not a permission window.
"""
import concurrent.futures as cf
import json, os, sys, time
sys.path.insert(0, ".")
from ml import gemma

RD = "pilot/screening/loop/round_100"
RAW = f"{RD}/raw_gemma"

batch = None
for attempt in range(60):
    try:
        os.makedirs(RAW, exist_ok=True)
        batch = json.load(open(f"{RD}/batch.json"))
        break
    except OSError as e:
        print(f"startup blocked ({e}); retrying in 10s", flush=True)
        time.sleep(10)
if batch is None:
    sys.exit("could not read batch.json after 60 attempts")

chunks = [batch[i:i + 25] for i in range(0, len(batch), 25)]


def work(k):
    out = f"{RAW}/chunk_{k + 1:03d}.json"
    if os.path.exists(out):
        return k, "done"
    try:
        arr, err = gemma.label(chunks[k], backend="nvidia")
        if arr:
            json.dump(arr, open(out, "w"))
            return k, f"ok {len(arr)}"
        return k, f"FAIL {err[:60]}"
    except Exception as e:
        return k, f"FAIL {type(e).__name__}: {str(e)[:60]}"


stall = 0
while True:
    todo = [k for k in range(len(chunks)) if not os.path.exists(f"{RAW}/chunk_{k + 1:03d}.json")]
    if not todo:
        print("all chunks present", flush=True)
        break
    print(f"pass: {len(todo)}/{len(chunks)} chunks to run", flush=True)
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        for k, st in ex.map(work, todo):
            print(f"chunk {k + 1:03d}: {st}", flush=True)
    left = [k for k in todo if not os.path.exists(f"{RAW}/chunk_{k + 1:03d}.json")]
    stall = stall + 1 if len(left) == len(todo) else 0
    if stall >= 30:
        print(f"30 stalled passes with {len(left)} chunks failing; giving up", flush=True)
        sys.exit(1)
    if left:
        time.sleep(30)
