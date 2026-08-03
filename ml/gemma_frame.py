"""Gemma-4-31B over the ENTIRE frame: 4,299,418 works, 25 per call, three backends.

WHAT THIS IS AND IS NOT
-----------------------
This collects a DIRECT Gemma label for every work in the frame, as its own
explicitly attributed evidence layer (model = gemma), on the PI's instruction.
Finding 32's original gate failed and stands as recorded. Test 2 (random_baseline
stratum, rationale as the bar) PASSED on 2026-07-16 once the Opus arm completed:
J(gemma, frontier_union) beat J(opus, gpt) on both prespecified targets
(pilot/results/gemma_test2.json), so under that prespecified rule Gemma is a
validated screener for the frame. What these labels claim in any release is
still governed by the deviations ledger, not assumed here.

MECHANICS, ALL LEARNED THE EXPENSIVE WAY
----------------------------------------
* Four serving stacks race one queue (Ollama cloud fastest, NVIDIA and Google
  AI Studio steady, OpenRouter free tier when it feels like it); a rate-limited
  lane hands its chunk back and contributes nothing that pass. meta sidecars
  record which backend produced every chunk, because same model name is not
  same stack.
* 171,977 chunk files cannot share a directory; they shard 1,000 per dir.
* Everything is resumable: a chunk exists iff its file exists; killing the
  process at any point loses at most the in-flight calls.
* Every chunk is validated at write time: the returned ids must BE the chunk's
  ids, else the array is discarded and retried. A stale or truncated response
  is not this chunk's labels.
* macOS revokes ~/Documents access from long processes at random, so every
  chunk guards broadly and the outer loop re-enters until done.

Run:  nohup python3 ml/gemma_frame.py >> logs/gemma_frame.log 2>&1 &
Progress: python3 ml/gemma_frame.py --status
"""

from __future__ import annotations

import concurrent.futures as cf
import glob
import json
import os
import queue
import sys
import time

sys.path.insert(0, ".")
# In the research working tree this module is ml/gemma.py; it is published
# here as ml/gemma_frame_backends.py because this repository already carries
# an earlier, differently shaped module under that name. This import is the
# only line that differs from the tree that ran.
from ml import gemma_frame_backends as gemma

FRAME = "data/db/works_full.parquet"
OUT = "data/gemma_frame"
CHUNK = 25
# NVIDIA queues per account: 12 threads measured SLOWER than 8 (60/h vs 97+),
# so its lane stays at the measured knee. No puter lane: its together-ai
# upstream failed every chunk-size prompt (~30k tokens in) with 400/500 even
# serially on 2026-07-16, while a 3-record smoke passed; the backend survives
# in ml/gemma.py for small payloads but cannot run THIS workload.
LANES = [("ollama", 16), ("nvidia", 8), ("gemini", 8), ("openrouter", 2)]
PAYLOAD_COLS = ["id", "title", "year", "lang", "type", "venue", "topic", "field"]


def out_path(k: int) -> str:
    return f"{OUT}/shard_{k // 1000:04d}/chunk_{k:06d}.json"


def load_frame():
    import duckdb
    con = duckdb.connect()
    # Deterministic order is the resume contract: chunk k is rows [25k, 25k+25)
    # of THIS ordering, forever. ORDER BY id is stable across runs and releases.
    reader = con.execute(
        f"SELECT {', '.join(PAYLOAD_COLS)} FROM '{FRAME}' ORDER BY id"
    ).arrow()
    # duckdb returns a RecordBatchReader on some versions and a Table on others;
    # materialize to a Table either way (a few GB of strings, fits comfortably).
    import pyarrow as pa
    return reader if isinstance(reader, pa.Table) else pa.Table.from_batches(reader)


def n_done() -> int:
    return sum(len(os.listdir(d)) for d in glob.glob(f"{OUT}/shard_*")) // 2 if glob.glob(f"{OUT}/shard_*") else 0


def status():
    files = glob.glob(f"{OUT}/shard_*/chunk_*.json")
    total = 171_977
    print(f"{len(files):,}/{total:,} chunks ({len(files) * CHUNK:,} works, {len(files)/total:.1%})")
    by = {}
    for m in glob.glob(f"{OUT}/shard_*/meta_*.json"):
        try:
            b = json.load(open(m))["backend"]
            by[b] = by.get(b, 0) + 1
        except Exception:
            pass
    print("by backend:", by)


def main():
    tbl = None
    for _ in range(30):
        try:
            os.makedirs(OUT, exist_ok=True)
            tbl = load_frame()
            break
        except OSError as e:
            print(f"startup blocked ({e}); retrying in 20s", flush=True)
            time.sleep(20)
    if tbl is None:
        sys.exit("could not read the frame after 30 attempts")

    n = tbl.num_rows
    n_chunks = (n + CHUNK - 1) // CHUNK
    print(f"frame: {n:,} works -> {n_chunks:,} chunks of {CHUNK}", flush=True)

    def records(k: int):
        sl = tbl.slice(k * CHUNK, CHUNK).to_pylist()
        for r in sl:
            r["abstract"] = None      # deployment condition: title-only payload
        return sl

    stall = 0
    while True:
        todo = [k for k in range(n_chunks) if not os.path.exists(out_path(k))]
        if not todo:
            print("ALL CHUNKS PRESENT", flush=True)
            break
        t0 = time.time()
        print(f"pass: {len(todo):,}/{n_chunks:,} chunks to run", flush=True)

        q = queue.Queue()
        for k in todo:
            q.put(k)

        done_this_pass = [0]

        def lane(backend):
            done = 0
            while True:
                try:
                    k = q.get_nowait()
                except queue.Empty:
                    return backend, done
                p = out_path(k)
                if os.path.exists(p):
                    continue
                try:
                    recs = records(k)
                    want = {r["id"] for r in recs}
                    arr, err = gemma.label(recs, backend=backend, retries=2)
                    if arr and {x.get("id") for x in arr} == want:
                        os.makedirs(os.path.dirname(p), exist_ok=True)
                        json.dump(arr, open(p, "w"))
                        json.dump({"backend": backend, "n": len(arr)},
                                  open(f"{os.path.dirname(p)}/meta_{k:06d}.json", "w"))
                        done += 1
                        done_this_pass[0] += 1
                        if done_this_pass[0] % 100 == 0:
                            rate = done_this_pass[0] / (time.time() - t0) * 3600
                            left = (len(todo) - done_this_pass[0]) / max(rate, 1)
                            print(f"  {done_this_pass[0]:,} this pass; {rate:,.0f} chunks/h; "
                                  f"~{left:.1f}h left", flush=True)
                    else:
                        if arr:
                            err = "id set mismatch (stale or truncated response)"
                        q.put(k)
                        time.sleep(2)
                except Exception as e:
                    q.put(k)
                    time.sleep(2)

        threads = [b for b, cnt in LANES for _ in range(cnt)]
        with cf.ThreadPoolExecutor(max_workers=len(threads)) as ex:
            futs = [ex.submit(lane, b) for b in threads]
            tally = {}
            for f in cf.as_completed(futs):
                try:
                    b, d = f.result()
                    tally[b] = tally.get(b, 0) + d
                except Exception as e:
                    print(f"lane died: {type(e).__name__}: {e}", flush=True)
        print(f"pass done in {(time.time()-t0)/3600:.2f}h; by backend: {tally}", flush=True)

        left = [k for k in todo if not os.path.exists(out_path(k))]
        stall = stall + 1 if len(left) == len(todo) else 0
        if stall >= 50:
            print(f"50 stalled passes with {len(left):,} chunks failing on every backend; giving up", flush=True)
            sys.exit(1)
        if left:
            time.sleep(60)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--status":
        status()
    else:
        main()
