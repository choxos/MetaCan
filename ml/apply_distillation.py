from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import ClassVar

import duckdb
import joblib
import pyarrow as pa
import pyarrow.parquet as pq
from pydantic import BaseModel, ConfigDict
from scipy import sparse

from ml.chunk_validation import Category, JSON_ADAPTER, JsonValue
from ml.distillation_features import FrameRecord, frame_text, vectorizer
from ml.distillation_inference import prediction_rows
from ml.distillation_targets import CATEGORICAL_TARGETS
from ml.distillation_training import DistillationBundle
from ml.train_distillation import sha256

SOURCE_PATH = Path("data/db/works_full.parquet")
MODEL_REPORT_PATH = Path("pilot/results/distillation_model.json")
OUTPUT_PATH = Path("data/db/frame_predictions.parquet")
META_PATH = Path("data/db/frame_predictions.meta.json")
SUMMARY_PATH = Path("pilot/results/frame_predictions.json")
FRAME_COLUMNS = ("id", "title", "venue", "topic", "field", "lang", "type", "year")


class ArtifactReference(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore", frozen=True)
    path: Path
    sha256: str


class ModelReport(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore", frozen=True)
    model_version: str
    artifact: ArtifactReference


PREDICTION_SCHEMA = pa.schema(
    [
        pa.field("id", pa.string()),
        pa.field("model_version", pa.string()),
        pa.field("candidate_categories", pa.list_(pa.string())),
        pa.field("consensus_categories", pa.list_(pa.string())),
        pa.field("category_scores_codex", pa.list_(pa.float32())),
        pa.field("category_scores_gemma", pa.list_(pa.float32())),
        pa.field("about_ca_system_candidate", pa.bool_()),
        pa.field("about_ca_system_consensus", pa.bool_()),
        pa.field("about_ca_system_score_codex", pa.float32()),
        pa.field("about_ca_system_score_gemma", pa.float32()),
        pa.field("about_ca_topic_candidate", pa.bool_()),
        pa.field("about_ca_topic_consensus", pa.bool_()),
        pa.field("about_ca_topic_score_codex", pa.float32()),
        pa.field("about_ca_topic_score_gemma", pa.float32()),
        pa.field("domain_scores_codex", pa.list_(pa.float32())),
        pa.field("domain_scores_gemma", pa.list_(pa.float32())),
        pa.field("domain_codex", pa.string()),
        pa.field("domain_gemma", pa.string()),
        pa.field("domain_candidate", pa.string()),
        pa.field("domain_consensus", pa.string()),
        pa.field("study_design_codex", pa.string()),
        pa.field("study_design_gemma", pa.string()),
        pa.field("study_design_scores_codex", pa.list_(pa.float32())),
        pa.field("study_design_scores_gemma", pa.list_(pa.float32())),
        pa.field("study_design_candidate", pa.string()),
        pa.field("study_design_consensus", pa.string()),
        pa.field("genre_codex", pa.string()),
        pa.field("genre_gemma", pa.string()),
        pa.field("genre_scores_codex", pa.list_(pa.float32())),
        pa.field("genre_scores_gemma", pa.list_(pa.float32())),
        pa.field("genre_candidate", pa.string()),
        pa.field("genre_consensus", pa.string()),
        pa.field("teacher_disagreement_score", pa.float32()),
        pa.field("threshold_uncertainty_score", pa.float32()),
        pa.field("prediction_status", pa.string()),
    ]
)


def write_json(path: Path, payload: JsonValue) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    _ = temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    _ = temporary.replace(path)


def load_bundle() -> tuple[DistillationBundle, ModelReport]:
    report = ModelReport.model_validate_json(MODEL_REPORT_PATH.read_text(encoding="utf-8"))
    observed_hash = sha256(report.artifact.path)
    if observed_hash != report.artifact.sha256:
        raise RuntimeError("model artifact hash does not match its training report")
    loaded = joblib.load(report.artifact.path)
    if not isinstance(loaded, DistillationBundle):
        raise TypeError("model artifact does not contain a DistillationBundle")
    if loaded.model_version != report.model_version:
        raise RuntimeError("model artifact version does not match its training report")
    return loaded, report


def source_records(table: pa.Table) -> tuple[tuple[str, ...], tuple[FrameRecord, ...]]:
    columns = table.to_pydict()
    ids = tuple(str(value) for value in columns["id"])
    records = tuple(
        FrameRecord(
            title=columns["title"][index],
            venue=columns["venue"][index],
            topic=columns["topic"][index],
            field=columns["field"][index],
            lang=columns["lang"][index],
            type=columns["type"][index],
            year=columns["year"][index],
        )
        for index in range(len(ids))
    )
    return ids, records


def valid_part(path: Path, expected_rows: int) -> bool:
    try:
        parquet = pq.ParquetFile(path)
        return parquet.metadata.num_rows == expected_rows and parquet.schema_arrow == PREDICTION_SCHEMA
    except (OSError, pa.ArrowException):
        return False


def merge_parts(parts: tuple[Path, ...]) -> None:
    temporary = OUTPUT_PATH.with_suffix(OUTPUT_PATH.suffix + ".tmp")
    writer = pq.ParquetWriter(temporary, PREDICTION_SCHEMA, compression="zstd")
    try:
        for part in parts:
            writer.write_table(pq.read_table(part))
    finally:
        writer.close()
    _ = temporary.replace(OUTPUT_PATH)


def category_counts(path: Path) -> dict[str, JsonValue]:
    connection = duckdb.connect()
    expressions: list[str] = []
    for category in Category:
        value = category.value
        expressions.append(
            f"sum(CASE WHEN list_contains(candidate_categories, '{value}') THEN 1 ELSE 0 END)"
        )
        expressions.append(
            f"sum(CASE WHEN list_contains(consensus_categories, '{value}') THEN 1 ELSE 0 END)"
        )
    values = connection.execute(
        "SELECT " + ", ".join(expressions) + f" FROM read_parquet('{path}')"
    ).fetchone()
    if values is None:
        raise RuntimeError("frame prediction summary query returned no row")
    return {
        category.value: {
            "candidate": int(values[index * 2]),
            "consensus": int(values[index * 2 + 1]),
        }
        for index, category in enumerate(Category)
    }


def run(limit_row_groups: int | None = None) -> None:
    bundle, report = load_bundle()
    source = pq.ParquetFile(SOURCE_PATH)
    total_groups = source.num_row_groups
    target_groups = min(limit_row_groups or total_groups, total_groups)
    parts_dir = Path("data/db/frame_prediction_parts") / bundle.model_version
    parts_dir.mkdir(parents=True, exist_ok=True)
    transform = vectorizer()
    for row_group in range(target_groups):
        part = parts_dir / f"part_{row_group:04d}.parquet"
        expected_rows = source.metadata.row_group(row_group).num_rows
        if valid_part(part, expected_rows):
            print(f"row group {row_group + 1}/{total_groups}: checkpoint valid", flush=True)
            continue
        table = source.read_row_group(row_group, columns=list(FRAME_COLUMNS))
        ids, records = source_records(table)
        matrix = sparse.csr_matrix(transform.transform(tuple(frame_text(record) for record in records)))
        predictions = prediction_rows(ids, bundle, matrix)
        output = pa.Table.from_pylist(list(predictions), schema=PREDICTION_SCHEMA)
        temporary = part.with_suffix(part.suffix + ".tmp")
        pq.write_table(output, temporary, compression="zstd")
        _ = temporary.replace(part)
        print(f"row group {row_group + 1}/{total_groups}: wrote {len(ids):,}", flush=True)

    if target_groups != total_groups:
        print(f"checkpointed {target_groups}/{total_groups} row groups; final merge deferred", flush=True)
        return
    parts = tuple(parts_dir / f"part_{index:04d}.parquet" for index in range(total_groups))
    if any(not valid_part(part, source.metadata.row_group(index).num_rows) for index, part in enumerate(parts)):
        raise RuntimeError("one or more checkpoint parts are absent or invalid")
    merge_parts(parts)
    output_rows = pq.ParquetFile(OUTPUT_PATH).metadata.num_rows
    if output_rows != source.metadata.num_rows:
        raise RuntimeError(f"expected {source.metadata.num_rows} predictions, wrote {output_rows}")
    counts = category_counts(OUTPUT_PATH)
    part_hashes = {str(part): sha256(part) for part in parts}
    payload = JSON_ADAPTER.validate_python({
        "model_version": bundle.model_version,
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "n_predictions": output_rows,
        "prediction_status": "machine_predicted_unvalidated",
        "candidate_policy": "positive_for_either_distilled_teacher_head",
        "consensus_policy": "positive_for_both_distilled_teacher_heads",
        "category_order": [category.value for category in Category],
        "categorical_score_order": {
            target.name: list(target.values) for target in CATEGORICAL_TARGETS
        },
        "category_counts": counts,
        "source": {"path": str(SOURCE_PATH), "sha256": sha256(SOURCE_PATH)},
        "model_artifact": {
            "path": str(report.artifact.path),
            "sha256": report.artifact.sha256,
        },
        "output": {"path": str(OUTPUT_PATH), "sha256": sha256(OUTPUT_PATH)},
        "checkpoint_parts": part_hashes,
        "limitations": [
            "predictions are teacher distillation outputs and not human validated labels",
            "scores are not frame calibrated probabilities",
            "direct Codex and Gemma labels exist only for the 10,348 work training sample",
        ],
    })
    write_json(META_PATH, payload)
    write_json(SUMMARY_PATH, payload)
    print(f"wrote {output_rows:,} predictions to {OUTPUT_PATH}", flush=True)


if __name__ == "__main__":
    run(int(sys.argv[1]) if len(sys.argv) > 1 else None)
