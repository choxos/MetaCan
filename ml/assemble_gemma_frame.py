#!/usr/bin/env python3
"""Assemble the full-frame direct Gemma labels into one validated parquet.

The frame run (ml/gemma_frame.py) wrote 171,977 chunk files. Each labeled
record carries its OWN work id (the model echoes the id it was given), so that
embedded id is the authoritative binding between a work and its labels, not the
record's position in the file. This matters: the run loaded the frame with
ORDER BY id at its start, but works_full.parquet was rebuilt during the v2
encoder work, so a fresh ORDER BY id no longer lines up positionally with the
chunks. The embedded ids still cover the frame exactly (verified: 4,299,418
distinct, zero duplicates, zero strays), so this assembler keys on them.

It is the trust boundary between that sprawl and everything downstream: it
takes each record's embedded id, rejects any id not in the frozen frame,
rejects duplicates, revalidates every label value against the live enums,
carries the serving backend per work (the run used four backends and the
advisor review requires rate checks by backend before these labels are
trusted), and refuses to write anything unless exactly the frame's 4,299,418
ids come out the other side.

Provenance note carried in the meta file: this instrument is TITLE-ONLY
(id, title, year, lang, type, venue, topic, field; no abstract), unlike the
round-100 teacher pass, which read abstracts. Same model family, different
instrument; downstream code must not treat them as interchangeable.

Run:    python3 -m ml.assemble_gemma_frame
Reads:  data/gemma_frame/shard_*/chunk_*.json (+ meta_*.json)
Writes: data/db/gemma_frame_labels.parquet + .meta.json
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

from ml.chunk_validation import Category, Domain, Genre, StudyDesign

FRAME = Path("data/db/works_full.parquet")
CHUNK_ROOT = Path("data/gemma_frame")
OUT_PATH = Path("data/db/gemma_frame_labels.parquet")
META_PATH = Path("data/db/gemma_frame_labels.meta.json")

CHUNK = 25
TOTAL_CHUNKS = 171_977
FRAME_ROWS = 4_299_418

CATEGORY_VALUES = frozenset(c.value for c in Category)
DOMAIN_VALUES = frozenset(d.value for d in Domain)
DESIGN_VALUES = frozenset(d.value for d in StudyDesign)
GENRE_VALUES = frozenset(g.value for g in Genre)
CONFIDENCE_VALUES = frozenset({"low", "medium", "high"})

SCHEMA = pa.schema(
    [
        ("id", pa.string()),
        ("categories", pa.list_(pa.string())),
        ("domain", pa.string()),
        ("study_design", pa.string()),
        ("genre", pa.string()),
        ("about_ca_system", pa.bool_()),
        ("about_ca_topic", pa.bool_()),
        ("confidence", pa.string()),
        ("backend", pa.string()),
    ]
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def frame_ids() -> set[str]:
    con = duckdb.connect()
    rows = con.execute(f"SELECT id FROM '{FRAME}'").fetchall()
    ids = {r[0] for r in rows}
    assert len(ids) == FRAME_ROWS, len(ids)
    return ids


def validate_record(rec: dict, frame: set[str], seen: set[str], chunk: int) -> dict:
    rid = rec["id"]
    if rid not in frame:
        raise RuntimeError(f"chunk {chunk}: id {rid} is not in the frame")
    if rid in seen:
        raise RuntimeError(f"chunk {chunk}: duplicate id {rid}")
    cats = rec["categories"]
    if not isinstance(cats, list) or not set(cats) <= CATEGORY_VALUES:
        raise RuntimeError(f"chunk {chunk}: bad categories {cats!r} on {rec['id']}")
    if rec["domain"] is not None and rec["domain"] not in DOMAIN_VALUES:
        raise RuntimeError(f"chunk {chunk}: bad domain {rec['domain']!r} on {rec['id']}")
    if rec["study_design"] not in DESIGN_VALUES:
        raise RuntimeError(f"chunk {chunk}: bad study_design {rec['study_design']!r} on {rec['id']}")
    if rec["genre"] not in GENRE_VALUES:
        raise RuntimeError(f"chunk {chunk}: bad genre {rec['genre']!r} on {rec['id']}")
    if rec["confidence"] not in CONFIDENCE_VALUES:
        raise RuntimeError(f"chunk {chunk}: bad confidence {rec['confidence']!r} on {rec['id']}")
    if not isinstance(rec["about_ca_system"], bool) or not isinstance(rec["about_ca_topic"], bool):
        raise RuntimeError(f"chunk {chunk}: non-bool about_ca flags on {rec['id']}")
    return rec


def main() -> None:
    frame = frame_ids()
    seen: set[str] = set()
    writer = pq.ParquetWriter(OUT_PATH, SCHEMA, compression="zstd")
    n_written = 0
    backends: dict[str, int] = {}
    batch: dict[str, list] = {name: [] for name in SCHEMA.names}

    def flush() -> None:
        nonlocal n_written
        if not batch["id"]:
            return
        writer.write_table(pa.table(batch, schema=SCHEMA))
        n_written += len(batch["id"])
        for column in batch.values():
            column.clear()

    for k in range(TOTAL_CHUNKS):
        shard = CHUNK_ROOT / f"shard_{k // 1000:04d}"
        chunk_file = shard / f"chunk_{k:06d}.json"
        if not chunk_file.exists():
            raise RuntimeError(f"missing chunk {k}: {chunk_file}")
        meta_file = shard / f"meta_{k:06d}.json"
        backend = json.loads(meta_file.read_text())["backend"] if meta_file.exists() else "unknown"
        records = json.loads(chunk_file.read_text())
        for rec in records:
            rec = validate_record(rec, frame, seen, k)
            seen.add(rec["id"])
            batch["id"].append(rec["id"])
            batch["categories"].append(rec["categories"])
            batch["domain"].append(rec["domain"])
            batch["study_design"].append(rec["study_design"])
            batch["genre"].append(rec["genre"])
            batch["about_ca_system"].append(rec["about_ca_system"])
            batch["about_ca_topic"].append(rec["about_ca_topic"])
            batch["confidence"].append(rec["confidence"])
            batch["backend"].append(backend)
        backends[backend] = backends.get(backend, 0) + 1
        if len(batch["id"]) >= 250_000:
            flush()
        if k % 20_000 == 0:
            print(f"  chunk {k:,}/{TOTAL_CHUNKS:,} ({n_written:,} works written)")
    flush()
    writer.close()

    assert seen == frame, f"assembled id set != frame ({len(seen)} vs {len(frame)})"
    con = duckdb.connect()
    n_rows, n_ids = con.execute(
        f"SELECT count(*), count(DISTINCT id) FROM '{OUT_PATH}'"
    ).fetchone()
    assert n_rows == FRAME_ROWS and n_ids == FRAME_ROWS, (n_rows, n_ids)
    matched = con.execute(f"""
        SELECT count(*) FROM '{OUT_PATH}' l JOIN '{FRAME}' w USING (id)
    """).fetchone()[0]
    assert matched == FRAME_ROWS, matched

    META_PATH.write_text(
        json.dumps(
            {
                "generated_at_utc": datetime.now(UTC).isoformat(),
                "n_labels": n_rows,
                "instrument": "gemma direct, title-only payload (no abstract); "
                "not interchangeable with the abstract-fed round-100 teacher pass",
                "payload_cols": ["id", "title", "year", "lang", "type", "venue", "topic", "field"],
                "chunks": TOTAL_CHUNKS,
                "chunks_by_backend": backends,
                "source_frame": {"path": str(FRAME), "sha256": sha256(FRAME)},
                "output": {"path": str(OUT_PATH), "sha256": sha256(OUT_PATH)},
                "label_status": "machine_direct_unvalidated",
            },
            indent=2,
        )
        + "\n"
    )
    print(f"ASSEMBLY COMPLETE: {n_rows:,} labels, backends {backends}")


if __name__ == "__main__":
    main()
