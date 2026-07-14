"""Recover chunks whose labels exist on disk but were never harvested.

THE BUG THIS REPAIRS
--------------------
run_loop_round.sh parses the model's answer out of STDOUT. For 42 of round_100's
414 codex chunks, the codex CLI wrote the complete JSON array to STDERR and left
stdout empty, so the harness said "no v3 JSON array in stdout" and moved on. The
wrapper then retried those chunks thirty times, and each retry failed the same
way, deterministically, on labels that were already sitting in the run directory.
Thirty passes of a resilient wrapper cannot fix a parser that is reading the
wrong stream.

So this script re-reads BOTH streams for every missing chunk and salvages any
array that parses and matches the chunk's expected ids. A salvaged chunk is
identical to a fresh one; the validator checks set equality against batch.json
either way, and anything that does not match the ids it claims is discarded here
rather than trusted.

Chunks with no recoverable array in either stream are listed for a re-run: those
are the ones the EPERM window killed before codex produced anything at all.
"""

from __future__ import annotations

import json
import os
import sys

RD = "pilot/screening/loop/round_100"
CHUNK = 25


def extract_array(raw: str):
    """Same contract as the harness: the model writes prose, the HARNESS writes labels."""
    i = raw.find("[")
    while i != -1:
        j = raw.rfind("]")
        while j > i:
            try:
                c = json.loads(raw[i:j + 1])
                if isinstance(c, list) and c and isinstance(c[0], dict) and "categories" in c[0]:
                    return c
                break
            except Exception:
                j = raw.rfind("]", 0, j)
        i = raw.find("[", i + 1)
    return None


def main(arm="codex"):
    raw_dir = f"{RD}/raw_{arm}"
    batch = json.load(open(f"{RD}/batch.json"))
    chunks = [batch[i:i + CHUNK] for i in range(0, len(batch), CHUNK)]

    salvaged, unrecoverable, mismatched = [], [], []
    for k, recs in enumerate(chunks, start=1):
        out = f"{raw_dir}/chunk_{k:03d}.json"
        if os.path.exists(out) and os.path.getsize(out) > 0:
            continue
        want = {r["id"] for r in recs}
        found = None
        for stream in ("stdout", "stderr"):
            p = f"{raw_dir}/{stream}_{k:03d}.txt"
            if not os.path.exists(p):
                continue
            try:
                raw = open(p, errors="replace").read()
            except OSError:
                continue
            arr = extract_array(raw)
            if not arr:
                continue
            got = {r.get("id") for r in arr}
            # THE CHECK THAT MAKES SALVAGE SAFE: a stream may hold a stale array from
            # an earlier attempt, or a truncated one. Only an array whose ids ARE this
            # chunk's ids is this chunk's labels.
            if got == want:
                found = arr
                break
            mismatched.append((k, stream, len(got & want), len(want)))
        if found:
            json.dump(found, open(out, "w"))
            salvaged.append(k)
        else:
            unrecoverable.append(k)

    print(f"[salvage {arm}] salvaged {len(salvaged)} chunks from disk: "
          f"{' '.join(f'{k:03d}' for k in salvaged) or 'none'}")
    if mismatched:
        print(f"[salvage {arm}] {len(mismatched)} arrays found but rejected on id mismatch "
              f"(partial/stale output, NOT trusted):")
        for k, s, hit, tot in mismatched[:10]:
            print(f"    chunk {k:03d} ({s}): {hit}/{tot} ids match")
    print(f"[salvage {arm}] {len(unrecoverable)} chunks have no recoverable array and must be re-run: "
          f"{' '.join(f'{k:03d}' for k in unrecoverable) or 'none'}")
    n = len([1 for k in range(1, len(chunks) + 1)
             if os.path.exists(f"{raw_dir}/chunk_{k:03d}.json")])
    print(f"[salvage {arm}] {n}/{len(chunks)} chunks now present")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "codex")
