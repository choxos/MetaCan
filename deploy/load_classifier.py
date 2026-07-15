#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import math
import struct
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import TextIO, cast

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.classifier_apply import ApplicationContract  # noqa: E402
from ml.classifier_artifacts import sha256_file  # noqa: E402
from ml.classifier_part_io import prediction_schema  # noqa: E402
from ml.classifier_records import ALL_TARGETS, Teacher  # noqa: E402

SCORE_ENCODING = "uint16_le_65535"
SCORE_SCALE = 65_535


@dataclass(frozen=True, slots=True)
class Release:
    predictions: Path
    metadata: dict[str, object]
    contract: ApplicationContract
    version: str
    targets: tuple[str, ...]
    codex_targets: tuple[str, ...]
    gemma_targets: tuple[str, ...]
    decision_targets: tuple[str, ...]
    interpretation: str


def fail(message: str) -> SystemExit:
    return SystemExit(f"load_classifier: {message}")


def mapping(value: object, name: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise fail(f"metadata field {name} must be an object")
    return cast(dict[str, object], value)


def text(value: object, name: str) -> str:
    if not isinstance(value, str) or not value:
        raise fail(f"metadata field {name} must be nonempty text")
    return value


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def pg_text_array(values: tuple[str, ...] | list[str]) -> str:
    escaped = ('"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"' for value in values)
    return "{" + ",".join(escaped) + "}"


def pg_packed_scores(values: list[float]) -> str:
    quantized: list[int] = []
    for value in values:
        if not math.isfinite(value) or not 0.0 <= value <= 1.0:
            raise fail(f"classifier score is outside [0, 1]: {value!r}")
        quantized.append(math.floor(value * SCORE_SCALE + 0.5))
    payload = struct.pack(f"<{len(quantized)}H", *quantized)
    return "\\x" + payload.hex()


def available_targets(metadata: dict[str, object], teacher: Teacher) -> tuple[str, ...]:
    heads = metadata.get("heads")
    if not isinstance(heads, list):
        raise fail("metadata heads must be an array")
    head_items = cast(list[object], heads)
    statuses: dict[str, str] = {}
    for item in head_items:
        head = mapping(item, "heads[]")
        if head.get("teacher") != teacher.value:
            continue
        target = text(head.get("target"), "heads[].target")
        status = text(head.get("status"), "heads[].status")
        if target in statuses:
            raise fail(f"duplicate {teacher.value} head for {target}")
        statuses[target] = status
    targets = tuple(target.name for target in ALL_TARGETS)
    if set(statuses) != set(targets):
        raise fail(f"metadata does not describe every {teacher.value} target")
    return tuple(target for target in targets if statuses[target] == "available")


def read_release(predictions: Path, metadata_path: Path, contract_path: Path) -> Release:
    try:
        raw_metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        metadata = mapping(raw_metadata, "root")
        contract = ApplicationContract.model_validate_json(
            contract_path.read_text(encoding="utf-8")
        )
    except (OSError, json.JSONDecodeError) as error:
        raise fail(str(error)) from error

    version = text(metadata.get("classifier_version"), "classifier_version")
    if version != contract.classifier_version:
        raise fail("metadata and output contract classifier versions differ")
    if metadata.get("source_tree_dirty") is not False:
        raise fail("release artifact was trained from a dirty source tree")
    if (
        text(metadata.get("feature_contract_hash"), "feature_contract_hash")
        != contract.feature_contract_hash
    ):
        raise fail("feature contract hashes differ")
    if text(metadata.get("schema_hash"), "schema_hash") != contract.schema_hash:
        raise fail("schema hashes differ")
    files = mapping(metadata.get("files"), "files")
    model_file = mapping(files.get("model.joblib"), "files.model.joblib")
    if text(model_file.get("sha256"), "files.model.joblib.sha256") != contract.model_hash:
        raise fail("model hashes differ")
    if sha256_file(predictions) != contract.output_hash:
        raise fail("prediction file hash does not match its output contract")

    parquet = pq.ParquetFile(predictions)
    if parquet.metadata.num_rows != contract.total_rows:
        raise fail("prediction row count does not match its output contract")
    if not parquet.schema_arrow.equals(prediction_schema()):
        raise fail("prediction parquet schema is not the classifier output schema")

    codex_targets = available_targets(metadata, Teacher.CODEX)
    gemma_targets = available_targets(metadata, Teacher.GEMMA)
    decision_targets = tuple(
        target.name
        for target in ALL_TARGETS
        if target.name in codex_targets and target.name in gemma_targets
    )
    return Release(
        predictions=predictions,
        metadata=metadata,
        contract=contract,
        version=version,
        targets=tuple(target.name for target in ALL_TARGETS),
        codex_targets=codex_targets,
        gemma_targets=gemma_targets,
        decision_targets=decision_targets,
        interpretation=text(metadata.get("interpretation"), "interpretation"),
    )


def write_header(release: Release, out: TextIO) -> None:
    metadata_json = json.dumps(
        release.metadata, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    c = release.contract
    out.write("\\set ON_ERROR_STOP on\nBEGIN;\n")
    out.write("UPDATE classifier_model SET active = FALSE WHERE active;\n")
    out.write(
        "DO $$ BEGIN\n"
        "  IF EXISTS (SELECT 1 FROM classifier_model WHERE version = "
        f"{sql_text(release.version)} AND output_hash <> {sql_text(c.output_hash)}) THEN\n"
        "    RAISE EXCEPTION 'classifier version already has a different output hash';\n"
        "  END IF;\n"
        "END $$;\n"
    )
    out.write(
        "INSERT INTO classifier_model (version, active, row_count, output_hash, frame_hash, "
        "model_hash, feature_contract_hash, schema_hash, score_encoding, targets, "
        "codex_targets, gemma_targets, "
        "decision_targets, interpretation, metadata) VALUES (\n"
        f"  {sql_text(release.version)}, FALSE, {c.total_rows}, {sql_text(c.output_hash)},\n"
        f"  {sql_text(c.frame_hash)}, {sql_text(c.model_hash)},\n"
        f"  {sql_text(c.feature_contract_hash)}, {sql_text(c.schema_hash)}, "
        f"{sql_text(SCORE_ENCODING)},\n"
        f"  {sql_text(pg_text_array(release.targets))}::text[],\n"
        f"  {sql_text(pg_text_array(release.codex_targets))}::text[],\n"
        f"  {sql_text(pg_text_array(release.gemma_targets))}::text[],\n"
        f"  {sql_text(pg_text_array(release.decision_targets))}::text[],\n"
        f"  {sql_text(release.interpretation)}, {sql_text(metadata_json)}::jsonb\n"
        ") ON CONFLICT (version) DO UPDATE SET\n"
        "  row_count = EXCLUDED.row_count, output_hash = EXCLUDED.output_hash,\n"
        "  frame_hash = EXCLUDED.frame_hash, model_hash = EXCLUDED.model_hash,\n"
        "  feature_contract_hash = EXCLUDED.feature_contract_hash,\n"
        "  schema_hash = EXCLUDED.schema_hash,\n"
        "  score_encoding = EXCLUDED.score_encoding,\n"
        "  targets = EXCLUDED.targets, codex_targets = EXCLUDED.codex_targets,\n"
        "  gemma_targets = EXCLUDED.gemma_targets, decision_targets = EXCLUDED.decision_targets,\n"
        "  interpretation = EXCLUDED.interpretation, metadata = EXCLUDED.metadata;\n"
        f"DELETE FROM work_prediction WHERE classifier_version = {sql_text(release.version)};\n"
        "COPY work_prediction (id, classifier_version, candidate_union, consensus_intersection, "
        "codex_scores, gemma_scores) FROM STDIN WITH (FORMAT csv);\n"
    )


def write_rows(release: Release, out: TextIO) -> None:
    score_targets = {
        Teacher.CODEX: release.codex_targets,
        Teacher.GEMMA: release.gemma_targets,
    }
    columns = ["id"]
    for teacher, targets in score_targets.items():
        columns.extend(f"score__{teacher.value}__{target}" for target in targets)
    for target in release.decision_targets:
        columns.extend((f"candidate_union__{target}", f"consensus_intersection__{target}"))

    writer = csv.writer(out, lineterminator="\n")
    written = 0
    parquet = pq.ParquetFile(release.predictions)
    for batch in parquet.iter_batches(  # pyright: ignore[reportUnknownMemberType]
        batch_size=25_000, columns=columns
    ):
        values = batch.to_pydict()
        for row_index, work_id in enumerate(values["id"]):
            codex = [
                float(values[f"score__codex__{target}"][row_index])
                for target in release.codex_targets
            ]
            gemma = [
                float(values[f"score__gemma__{target}"][row_index])
                for target in release.gemma_targets
            ]
            decisions = {
                target: (
                    values[f"candidate_union__{target}"][row_index],
                    values[f"consensus_intersection__{target}"][row_index],
                )
                for target in release.decision_targets
            }
            if any(value is None for pair in decisions.values() for value in pair):
                raise fail(f"missing combined decision for {work_id}")
            candidate = [target for target, pair in decisions.items() if pair[0] is True]
            consensus = [target for target, pair in decisions.items() if pair[1] is True]
            writer.writerow(
                (
                    work_id,
                    release.version,
                    pg_text_array(candidate),
                    pg_text_array(consensus),
                    pg_packed_scores(codex),
                    pg_packed_scores(gemma),
                )
            )
            written += 1
        if written % 500_000 == 0:
            print(f"load_classifier: streamed {written:,} rows", file=sys.stderr)
    if written != release.contract.total_rows:
        raise fail(f"streamed {written} rows, expected {release.contract.total_rows}")


def write_footer(release: Release, out: TextIO) -> None:
    out.write(
        "\\.\n"
        "DO $$ DECLARE n bigint; BEGIN\n"
        "  SELECT count(*) INTO n FROM work_prediction\n"
        f"  WHERE classifier_version = {sql_text(release.version)};\n"
        f"  IF n <> {release.contract.total_rows} THEN\n"
        "    RAISE EXCEPTION 'classifier row count mismatch';\n"
        "  END IF;\n"
        "END $$;\n"
        f"UPDATE classifier_model SET active = TRUE WHERE version = {sql_text(release.version)};\n"
        "COMMIT;\n"
        "CREATE INDEX IF NOT EXISTS work_prediction_version_id "
        "ON work_prediction (classifier_version, id);\n"
        "CREATE INDEX IF NOT EXISTS work_prediction_candidate_gin "
        "ON work_prediction USING GIN (candidate_union);\n"
        "CREATE INDEX IF NOT EXISTS work_prediction_consensus_gin "
        "ON work_prediction USING GIN (consensus_intersection);\n"
        "ANALYZE classifier_model;\nANALYZE work_prediction;\n"
        "SELECT version, active, row_count FROM classifier_model ORDER BY created_at DESC;\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate classifier outputs and stream an atomic PostgreSQL load script."
    )
    parser.add_argument("--predictions", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--contract", type=Path)
    args = parser.parse_args()
    contract = args.contract or args.predictions.with_suffix(f"{args.predictions.suffix}.json")
    release = read_release(args.predictions, args.metadata, contract)
    print(
        f"load_classifier: validated {release.version} with {release.contract.total_rows:,} rows",
        file=sys.stderr,
    )
    write_header(release, sys.stdout)
    write_rows(release, sys.stdout)
    write_footer(release, sys.stdout)


if __name__ == "__main__":
    main()
