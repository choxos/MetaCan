from __future__ import annotations

import json
import sys
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

import duckdb
import pyarrow.parquet as pq

from ml.apply_distillation import PREDICTION_SCHEMA
from ml.chunk_validation import JSON_ADAPTER, JsonValue
from ml.round_provenance import sha256

SOURCE_PATH = Path("data/db/frame_predictions.parquet")
SOURCE_META_PATH = Path("data/db/frame_predictions.meta.json")
OUTPUT_PATH = Path("data/db/frame_predictions.csv.gz")
MANIFEST_PATH = Path("data/db/frame_predictions.copy.json")

COPY_COLUMNS = (
    "id",
    "model_version",
    "candidate_categories",
    "consensus_categories",
    "category_scores_codex",
    "category_scores_gemma",
    "about_ca_system_candidate",
    "about_ca_system_consensus",
    "about_ca_system_score_codex",
    "about_ca_system_score_gemma",
    "about_ca_topic_candidate",
    "about_ca_topic_consensus",
    "about_ca_topic_score_codex",
    "about_ca_topic_score_gemma",
    "domain_scores_codex",
    "domain_scores_gemma",
    "domain_codex",
    "domain_gemma",
    "domain_candidate",
    "domain_consensus",
    "study_design_codex",
    "study_design_gemma",
    "study_design_scores_codex",
    "study_design_scores_gemma",
    "study_design_candidate",
    "study_design_consensus",
    "genre_codex",
    "genre_gemma",
    "genre_scores_codex",
    "genre_scores_gemma",
    "genre_candidate",
    "genre_consensus",
    "teacher_disagreement_score",
    "threshold_uncertainty_score",
    "prediction_status",
)

TEXT_ARRAY_COLUMNS = frozenset(("candidate_categories", "consensus_categories"))
FLOAT_ARRAY_COLUMNS = frozenset(
    (
        "category_scores_codex",
        "category_scores_gemma",
        "domain_scores_codex",
        "domain_scores_gemma",
        "study_design_scores_codex",
        "study_design_scores_gemma",
        "genre_scores_codex",
        "genre_scores_gemma",
    )
)


def sql_path(path: Path) -> str:
    return str(path.resolve()).replace("'", "''")


def copy_expression(column: str) -> str:
    if column in TEXT_ARRAY_COLUMNS:
        return (
            "'{' || array_to_string("
            f"list_transform({column}, value -> '\"' || value || '\"'), ','"
            f") || '}}' AS {column}"
        )
    if column in FLOAT_ARRAY_COLUMNS:
        return f"'{{' || array_to_string({column}, ',') || '}}' AS {column}"
    return column


def write_postgres_copy(source: Path, output: Path) -> int:
    parquet = pq.ParquetFile(source)
    if parquet.schema_arrow != PREDICTION_SCHEMA:
        raise ValueError("prediction parquet schema does not match the declared contract")
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    expressions = ",\n  ".join(copy_expression(column) for column in COPY_COLUMNS)
    query = f"""COPY (
SELECT
  {expressions}
FROM read_parquet('{sql_path(source)}')
) TO '{sql_path(temporary)}' (FORMAT CSV, HEADER TRUE, COMPRESSION GZIP)"""
    connection = duckdb.connect()
    try:
        _ = connection.execute(query)
    finally:
        connection.close()
    if not temporary.exists() or temporary.stat().st_size == 0:
        raise RuntimeError("DuckDB did not produce the compressed copy file")
    _ = temporary.replace(output)
    return parquet.metadata.num_rows


def mapping(value: JsonValue, name: str) -> dict[str, JsonValue]:
    if not isinstance(value, dict):
        raise ValueError(f"{name} must be an object")
    return value


def verify_source(
    source: Path, metadata_path: Path
) -> tuple[dict[str, JsonValue], int, str]:
    metadata = mapping(
        JSON_ADAPTER.validate_json(metadata_path.read_text(encoding="utf-8")),
        "prediction metadata",
    )
    output = mapping(metadata.get("output"), "prediction metadata output")
    expected_hash = output.get("sha256")
    expected_rows = metadata.get("n_predictions")
    model_version = metadata.get("model_version")
    if not isinstance(expected_hash, str) or sha256(source) != expected_hash:
        raise ValueError("prediction parquet hash does not match its metadata")
    if not isinstance(expected_rows, int) or pq.ParquetFile(source).metadata.num_rows != expected_rows:
        raise ValueError("prediction parquet row count does not match its metadata")
    if not isinstance(model_version, str):
        raise ValueError("prediction metadata has no model version")
    return metadata, expected_rows, model_version


def write_json(path: Path, payload: JsonValue) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    _ = temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    _ = temporary.replace(path)


def run(
    source: Path = SOURCE_PATH,
    source_meta: Path = SOURCE_META_PATH,
    output: Path = OUTPUT_PATH,
    manifest: Path = MANIFEST_PATH,
) -> JsonValue:
    metadata, expected_rows, model_version = verify_source(source, source_meta)
    written = write_postgres_copy(source, output)
    if written != expected_rows:
        raise RuntimeError(f"expected {expected_rows} rows, prepared {written}")
    payload = JSON_ADAPTER.validate_python(
        {
            "version": 1,
            "created_at_utc": datetime.now(UTC).isoformat(),
            "model_version": model_version,
            "rows": written,
            "prediction_status": metadata.get("prediction_status"),
            "source_parquet": {"path": str(source), "sha256": sha256(source)},
            "source_metadata": {"path": str(source_meta), "sha256": sha256(source_meta)},
            "postgres_copy": {"path": str(output), "sha256": sha256(output)},
            "columns": list(COPY_COLUMNS),
            "array_encoding": "PostgreSQL array literals inside RFC 4180 CSV fields",
            "null_encoding": "unquoted empty CSV field",
            "load_command": (
                f"gzip -dc {output} | "
                "psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -c "
                "\"\\copy work_prediction FROM STDIN WITH (FORMAT csv, HEADER true)\""
            ),
        }
    )
    write_json(manifest, payload)
    return payload


def main(args: Sequence[str]) -> int:
    if args and len(args) != 2:
        print("usage: prepare_predictions [source.parquet source.meta.json]", file=sys.stderr)
        return 2
    if args:
        source, source_meta = Path(args[0]), Path(args[1])
        output = source.with_suffix(".csv.gz")
        manifest = source.with_suffix(".copy.json")
    else:
        source, source_meta, output, manifest = (
            SOURCE_PATH, SOURCE_META_PATH, OUTPUT_PATH, MANIFEST_PATH,
        )
    payload = mapping(run(source, source_meta, output, manifest), "copy manifest")
    print(f"prepared {payload['rows']:,} rows at {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
