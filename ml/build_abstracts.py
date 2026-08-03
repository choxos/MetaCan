#!/usr/bin/env python3
"""De-invert every frame abstract into data/db/abstracts.parquet.

The frame table deliberately stores no abstract (the inverted indexes are
8.6 GB of the frame's 9.3 GB of text and the VPS could not hold them), so the
v1 student trained and predicted on title+metadata alone. The raw harvest
(data/frame/canadian_works.parquet) kept `abstract_idx` for every work, and
the v2 encoder runs its inference LOCALLY, so v2 can finally read what the
teachers read: this script materializes id -> abstract text once, and both
training and frame inference join against it.

STREAMED in 200k-row chunks on purpose: the inverted indexes are 8.6 GB of
JSON and this machine is also holding a 31B model in unified memory for the
gemma frame run. Loading everything at once would swap the box; a chunk plus
its worker copies peaks well under 1 GB.

OpenAlex ships abstracts as an inverted index (token -> positions). Position
lists reconstruct the text exactly; unknown positions are skipped, never
invented.

Run: python3 ml/build_abstracts.py
"""

from __future__ import annotations

import json
import os
from multiprocessing import Pool

import duckdb

SOURCE = "data/frame/canadian_works.parquet"
OUT = "data/db/abstracts.parquet"
DB = "data/db/abstracts_build.duckdb"
CHUNK = 200_000


def deinvert(idx_json: str | None) -> str | None:
    if not idx_json:
        return None
    try:
        idx = json.loads(idx_json)
    except json.JSONDecodeError:
        return None
    if not isinstance(idx, dict) or not idx:
        return None
    words: dict[int, str] = {}
    for token, positions in idx.items():
        if not isinstance(positions, list):
            continue
        for p in positions:
            if isinstance(p, int) and p >= 0:
                words[p] = token
    if not words:
        return None
    text = " ".join(words[p] for p in sorted(words)).strip()
    return text or None


def main() -> None:
    if os.path.exists(DB):
        os.remove(DB)
    sink = duckdb.connect(DB)
    sink.execute("CREATE TABLE t (id VARCHAR, abstract VARCHAR)")

    src = duckdb.connect()
    cur = src.execute(
        f"SELECT replace(id, 'https://openalex.org/', '') AS id, abstract_idx FROM '{SOURCE}'"
    )
    total = n_with = 0
    with Pool(6) as pool:
        while True:
            rows = cur.fetchmany(CHUNK)
            if not rows:
                break
            abstracts = pool.map(deinvert, (r[1] for r in rows), chunksize=2_000)
            sink.executemany(
                "INSERT INTO t VALUES (?, ?)",
                [(r[0], a) for r, a in zip(rows, abstracts) if a],
            )
            total += len(rows)
            n_with += sum(1 for a in abstracts if a)
            print(f"{total:,} works, {n_with:,} abstracts", flush=True)

    sink.execute(f"COPY (SELECT * FROM t) TO '{OUT}' (FORMAT parquet, COMPRESSION zstd)")
    n = sink.execute(f"SELECT count(*) FROM '{OUT}'").fetchone()[0]
    print(f"DEINVERSION COMPLETE: {n:,} abstracts in {OUT}", flush=True)
    sink.close()
    os.remove(DB)


if __name__ == "__main__":
    main()
