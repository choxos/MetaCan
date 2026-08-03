#!/usr/bin/env python3
"""Apply the v2 encoder student to every work in the frame.

Same PredictionRow contract as ml/apply_distillation.py, to the field: the
shard schema, the candidate/consensus policy (ml/prediction_policy, imported,
not copied), the disagreement and uncertainty maxima, and the
machine_predicted_unvalidated status all match. The scorer is the SPECTER2
fine-tune from ml/train_encoder.py and the input now includes the de-inverted
abstract (ml/build_abstracts.py): the text the teachers actually read.
deploy/prepare_predictions.py still needs its v1 paths pointed here at load
time; the meta file carries the same n_predictions and output sha256 fields
it expects, so that is a path change, not a schema change.

RERUN SAFETY, after review. Shards live under a MODEL-VERSIONED directory,
so two model versions cannot interleave; a shard is skipped only after its
row count matches the expectation for that position and its model_version
matches the loaded artifact; the final consolidation asserts the row and
distinct-id counts equal the frame's 4,299,418 exactly.

Head-order safety: the saved config's binary_targets and categorical_values
must equal the live enums IN ORDER, or the run aborts before scoring row one.

Run:    nohup python3 -m ml.apply_encoder >> logs/apply_encoder.log 2>&1 &
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import duckdb
import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import torch
from transformers import AutoTokenizer

from ml.apply_distillation import PREDICTION_SCHEMA
from ml.chunk_validation import Category
from ml.distillation_inference import PredictionRow, _domain, _uncertainty
from ml.distillation_targets import BINARY_TARGETS, CATEGORICAL_TARGETS
from ml.prediction_policy import binary_decision, categorical_decision
from ml.train_encoder import (
    MPS_MEMORY_FRACTION,
    TEACHERS,
    EncoderStudent,
)

SOURCE_PATH = Path("data/db/works_full.parquet")
ABSTRACTS = Path("data/db/abstracts.parquet")
MODEL_DIR = Path("data/db/encoder_model")
PARTS_ROOT = Path("data/db/frame_prediction_parts_v2")
OUTPUT_PATH = Path("data/db/frame_predictions_v2.parquet")
META_PATH = Path("data/db/frame_predictions_v2.meta.json")

SHARD = 100_000
# Halves itself on MPS OOM. 48 measured only 22 works/s with the GPU far from
# saturated (the ollama lane is CLOUD-hosted; nothing else wants the GPU), so
# the length-sorted batches get room to be big.
BATCH = 128
FRAME_ROWS = 4_299_418


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def load_model() -> tuple[EncoderStudent, AutoTokenizer, dict]:
    config = json.loads((MODEL_DIR / "config.json").read_text())
    # The saved head order IS the contract. If the live enums drifted since
    # training, scores would silently relabel; refuse instead.
    live_binary = [t.name for t in BINARY_TARGETS]
    if config["binary_targets"] != live_binary:
        raise RuntimeError(
            f"binary target order drift: saved {config['binary_targets']}, live {live_binary}"
        )
    for ct in CATEGORICAL_TARGETS:
        if config["categorical_values"][ct.name] != list(ct.values):
            raise RuntimeError(f"categorical value drift on {ct.name}")

    sizes = {name: len(values) for name, values in config["categorical_values"].items()}
    # Build straight from the saved encoder: constructing from the remote base
    # first would transiently hold two encoders in memory for nothing.
    model = EncoderStudent(len(config["binary_targets"]), sizes, encoder_source=MODEL_DIR / "encoder")
    heads = torch.load(MODEL_DIR / "heads.pt", map_location="cpu")
    model.binary_heads.load_state_dict(heads["binary_heads"])
    model.categorical_heads.load_state_dict(heads["categorical_heads"])
    saved = config.get("weight_hashes", {}).get("heads.pt")
    if saved and saved != sha256(MODEL_DIR / "heads.pt"):
        raise RuntimeError("heads.pt does not match the hash recorded at training time")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR / "tokenizer")
    return model, tokenizer, config


def frame_batches():
    con = duckdb.connect()
    cur = con.execute(f"""
        SELECT w.id, w.title, w.venue, w.topic, w.field, w.lang, w.type, w.year, a.abstract
        FROM '{SOURCE_PATH}' w
        LEFT JOIN '{ABSTRACTS}' a ON a.id = w.id
        ORDER BY w.id
    """)
    while True:
        rows = cur.fetchmany(SHARD)
        if not rows:
            return
        yield rows


def row_text(row) -> str:
    """MUST stay byte-identical with ml/train_encoder.py's encoder_text."""
    _, title, venue, topic, field, lang, typ, year, abstract = row
    tail = "; ".join(str(x) for x in (venue, topic, field, lang, typ, year) if x)
    return f"{(title or '').strip()} [SEP] {(abstract or '').strip()} [SEP] {tail}"


def shard_is_valid(part: Path, expected_rows: int, version: str) -> bool:
    try:
        meta = pq.read_metadata(part)
        if meta.num_rows != expected_rows:
            return False
        first = pq.read_table(part, columns=["model_version"]).column(0)
        return len(first) > 0 and first[0].as_py() == version
    except Exception:
        return False


def score_batch(model, tokenizer, device, texts: list[str], max_len: int, batch_size: int):
    """One forward pass with OOM backoff: halve the batch and retry rather
    than dying eight hours in because ollama grew."""
    while True:
        try:
            enc = tokenizer(
                texts[:batch_size],
                truncation=True,
                max_length=max_len,
                padding=True,
                return_tensors="pt",
            ).to(device)
            with torch.no_grad():
                binary, categorical = model(enc["input_ids"], enc["attention_mask"])
            return batch_size, binary, categorical
        except RuntimeError as e:
            if "memory" not in str(e).lower() or batch_size <= 4:
                raise
            batch_size = batch_size // 2
            if device.type == "mps":
                torch.mps.empty_cache()
            print(f"  OOM backoff: batch -> {batch_size}", flush=True)


def main() -> None:
    device = torch.device(
        "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    )
    if device.type == "mps":
        torch.mps.set_per_process_memory_fraction(MPS_MEMORY_FRACTION)
    model, tokenizer, config = load_model()
    model = model.to(device).eval()
    version = config["model_version"]
    max_len = config["max_len"]
    thresholds = config["thresholds"]
    print(f"{version} on {device}", flush=True)

    category_targets = BINARY_TARGETS[: len(Category)]
    parts_dir = PARTS_ROOT / version
    parts_dir.mkdir(parents=True, exist_ok=True)

    batch_size = BATCH
    shard_index = 0
    total = 0
    started = datetime.now(UTC)
    for rows in frame_batches():
        part = parts_dir / f"part_{shard_index:05d}.parquet"
        shard_index += 1
        total += len(rows)
        if part.exists():
            if shard_is_valid(part, len(rows), version):
                continue
            print(f"  {part.name} invalid (stale or truncated); rebuilding", flush=True)
            part.unlink()

        texts = [row_text(r) for r in rows]
        order = sorted(range(len(texts)), key=lambda i: len(texts[i]))
        bin_by_teacher = {t: np.empty((len(texts), len(BINARY_TARGETS)), dtype=np.float32) for t in TEACHERS}
        cat_scores = {
            (t, name): np.empty((len(texts), len(vals)), dtype=np.float32)
            for t in TEACHERS
            for name, vals in config["categorical_values"].items()
        }
        cursor = 0
        while cursor < len(order):
            idx = order[cursor : cursor + batch_size]
            used, binary, categorical = score_batch(
                model, tokenizer, device, [texts[i] for i in idx], max_len, len(idx)
            )
            idx = idx[:used]
            for t in TEACHERS:
                bin_by_teacher[t][idx] = torch.sigmoid(binary[t]).float().cpu().numpy()[: len(idx)]
                for name in config["categorical_values"]:
                    cat_scores[(t, name)][idx] = (
                        torch.softmax(categorical[t][name], dim=1).float().cpu().numpy()[: len(idx)]
                    )
            cursor += used
        if device.type == "mps":
            torch.mps.empty_cache()

        out_rows: list[PredictionRow] = []
        for i, row in enumerate(rows):
            work_id = row[0]
            codex_bin = bin_by_teacher["codex"][i]
            gemma_bin = bin_by_teacher["gemma"][i]
            decisions = {}
            for j, target in enumerate(BINARY_TARGETS):
                decisions[target.name] = binary_decision(
                    float(codex_bin[j]),
                    float(gemma_bin[j]),
                    thresholds[f"codex:{target.name}"],
                    thresholds[f"gemma:{target.name}"],
                )
            axes = {
                ct.name: categorical_decision(
                    tuple(config["categorical_values"][ct.name]),
                    tuple(float(v) for v in cat_scores[("codex", ct.name)][i]),
                    tuple(float(v) for v in cat_scores[("gemma", ct.name)][i]),
                )
                for ct in CATEGORICAL_TARGETS
            }
            domain = axes["domain"]
            metaresearch = decisions["category__metaresearch"]
            disagreements = [d.teacher_spread for d in decisions.values()]
            disagreements.extend(a.teacher_spread for a in axes.values())
            uncertainties = [
                _uncertainty(float(codex_bin[j]), thresholds[f"codex:{t.name}"])
                for j, t in enumerate(BINARY_TARGETS)
            ]
            uncertainties.extend(
                _uncertainty(float(gemma_bin[j]), thresholds[f"gemma:{t.name}"])
                for j, t in enumerate(BINARY_TARGETS)
            )
            out_rows.append(
                PredictionRow(
                    id=work_id,
                    model_version=version,
                    candidate_categories=[
                        t.category.value
                        for t in category_targets
                        if t.category is not None and decisions[t.name].candidate
                    ],
                    consensus_categories=[
                        t.category.value
                        for t in category_targets
                        if t.category is not None and decisions[t.name].consensus
                    ],
                    category_scores_codex=[float(codex_bin[j]) for j in range(len(category_targets))],
                    category_scores_gemma=[float(gemma_bin[j]) for j in range(len(category_targets))],
                    about_ca_system_candidate=decisions["about_ca_system"].candidate,
                    about_ca_system_consensus=decisions["about_ca_system"].consensus,
                    about_ca_system_score_codex=float(codex_bin[len(category_targets)]),
                    about_ca_system_score_gemma=float(gemma_bin[len(category_targets)]),
                    about_ca_topic_candidate=decisions["about_ca_topic"].candidate,
                    about_ca_topic_consensus=decisions["about_ca_topic"].consensus,
                    about_ca_topic_score_codex=float(codex_bin[len(category_targets) + 1]),
                    about_ca_topic_score_gemma=float(gemma_bin[len(category_targets) + 1]),
                    domain_scores_codex=[float(v) for v in cat_scores[("codex", "domain")][i]],
                    domain_scores_gemma=[float(v) for v in cat_scores[("gemma", "domain")][i]],
                    domain_codex=_domain(domain.codex),
                    domain_gemma=_domain(domain.gemma),
                    domain_candidate=_domain(domain.candidate) if metaresearch.candidate else None,
                    domain_consensus=(
                        _domain(domain.consensus)
                        if metaresearch.consensus and domain.consensus is not None
                        else None
                    ),
                    study_design_codex=axes["study_design"].codex,
                    study_design_gemma=axes["study_design"].gemma,
                    study_design_scores_codex=[float(v) for v in cat_scores[("codex", "study_design")][i]],
                    study_design_scores_gemma=[float(v) for v in cat_scores[("gemma", "study_design")][i]],
                    study_design_candidate=axes["study_design"].candidate,
                    study_design_consensus=axes["study_design"].consensus,
                    genre_codex=axes["genre"].codex,
                    genre_gemma=axes["genre"].gemma,
                    genre_scores_codex=[float(v) for v in cat_scores[("codex", "genre")][i]],
                    genre_scores_gemma=[float(v) for v in cat_scores[("gemma", "genre")][i]],
                    genre_candidate=axes["genre"].candidate,
                    genre_consensus=axes["genre"].consensus,
                    teacher_disagreement_score=max(disagreements),
                    threshold_uncertainty_score=max(uncertainties),
                    prediction_status="machine_predicted_unvalidated",
                )
            )

        table = pa.Table.from_pylist(out_rows, schema=PREDICTION_SCHEMA)
        tmp = part.with_suffix(".tmp")
        pq.write_table(table, tmp, compression="zstd")
        tmp.replace(part)
        rate = total / max((datetime.now(UTC) - started).total_seconds(), 1)
        print(f"shard {part.name}: {total:,} works cumulative, {rate:.0f} works/s", flush=True)

    con = duckdb.connect()
    con.execute(f"""
        COPY (SELECT * FROM read_parquet('{parts_dir}/part_*.parquet') ORDER BY id)
        TO '{OUTPUT_PATH}' (FORMAT parquet, COMPRESSION zstd)
    """)
    n_rows, n_ids, n_versions = con.execute(
        f"SELECT count(*), count(DISTINCT id), count(DISTINCT model_version) FROM '{OUTPUT_PATH}'"
    ).fetchone()
    if n_rows != FRAME_ROWS or n_ids != FRAME_ROWS or n_versions != 1:
        raise RuntimeError(
            f"consolidation mismatch: {n_rows:,} rows, {n_ids:,} ids,"
            f" {n_versions} model versions; expected {FRAME_ROWS:,}/{FRAME_ROWS:,}/1"
        )
    META_PATH.write_text(json.dumps({
        "model_version": version,
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "n_predictions": n_rows,
        "source": str(SOURCE_PATH),
        "abstracts": str(ABSTRACTS),
        "abstracts_sha256": config.get("input_hashes", {}).get(str(ABSTRACTS)),
        "output": {"path": str(OUTPUT_PATH), "sha256": sha256(OUTPUT_PATH)},
        "prediction_status": "machine_predicted_unvalidated",
    }, indent=2))
    print(f"APPLY ENCODER COMPLETE: {n_rows:,} rows, {n_ids:,} distinct ids", flush=True)


if __name__ == "__main__":
    main()
