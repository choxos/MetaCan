from __future__ import annotations

# pyright: reportUnknownMemberType=false
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import pyarrow.parquet as pq

from ml.classifier_apply import (
    PART_CONTRACT_VERSION,
    PART_SIZE,
    CheckpointContractError,
    PartContract,
    partition_sizes,
    read_checkpoint,
    validate_part_inventory,
    verify_checkpoint,
)
from ml.classifier_artifacts import (
    atomic_write_json,
    atomic_write_parquet,
    canonical_sha256,
    sha256_file,
)
from ml.classifier_model import LoadedArtifact, load_artifact
from ml.classifier_output import verify_output, write_output_contract
from ml.classifier_part_io import (
    FramePart,
    frame_row_count,
    iter_frame_parts,
    merge_parts,
    ordered_ids,
    ordered_ids_hash,
    prediction_schema,
    score_part,
    table_hash,
    update_ids_hash,
)


@dataclass(frozen=True, slots=True)
class ApplyConfig:
    frame: Path
    artifact: Path
    parts: Path
    output: Path
    limit: int | None
    resume: bool


@dataclass(frozen=True, slots=True)
class VerifyConfig:
    frame: Path
    artifact: Path
    parts: Path
    output: Path | None
    limit: int | None


@dataclass(frozen=True, slots=True)
class ApplicationState:
    artifact: LoadedArtifact
    total_rows: int
    frame_hash: str
    fingerprint: str
    parts_dir: Path


def _state(config: ApplyConfig | VerifyConfig) -> ApplicationState:
    artifact = load_artifact(config.artifact)
    available = frame_row_count(config.frame)
    if config.limit is not None and config.limit < 1:
        raise ValueError("limit must be positive")
    total_rows = available if config.limit is None else min(config.limit, available)
    frame_hash = sha256_file(config.frame)
    fingerprint = canonical_sha256(
        {
            "frame_hash": frame_hash,
            "model_hash": artifact.model_hash,
            "feature_contract_hash": artifact.bundle.feature_contract_hash,
            "schema_hash": artifact.bundle.schema_hash,
            "total_rows": total_rows,
            "part_size": PART_SIZE,
        }
    )
    return ApplicationState(
        artifact,
        total_rows,
        frame_hash,
        fingerprint,
        config.parts / fingerprint,
    )


def _paths(directory: Path, index: int) -> tuple[Path, Path]:
    stem = f"part-{index:05d}"
    return directory / f"{stem}.parquet", directory / f"{stem}.json"


def _contract(
    state: ApplicationState,
    part: FramePart,
    output_hash: str,
) -> PartContract:
    identifiers = ordered_ids(part.table)
    return PartContract(
        version=PART_CONTRACT_VERSION,
        part_name=f"part-{part.index:05d}.parquet",
        offset_start=part.offset_start,
        offset_end=part.offset_end,
        row_count=part.table.num_rows,
        first_id=identifiers[0],
        last_id=identifiers[-1],
        input_slice_hash=table_hash(part.table),
        ordered_ids_hash=ordered_ids_hash(part.table),
        frame_hash=state.frame_hash,
        model_hash=state.artifact.model_hash,
        feature_contract_hash=state.artifact.bundle.feature_contract_hash,
        schema_hash=state.artifact.bundle.schema_hash,
        output_hash=output_hash,
    )


def _verify_part(
    state: ApplicationState,
    frame_part: FramePart,
    part_path: Path,
    sidecar_path: Path,
) -> PartContract:
    existing = read_checkpoint(sidecar_path)
    expected = _contract(state, frame_part, existing.output_hash)
    verified = verify_checkpoint(part_path, sidecar_path, expected)
    table = pq.read_table(part_path)
    if not table.schema.equals(prediction_schema()):
        raise CheckpointContractError(f"prediction schema mismatch in {part_path.name}")
    if table.num_rows != frame_part.table.num_rows:
        raise CheckpointContractError(f"row count mismatch in {part_path.name}")
    if ordered_ids(table) != ordered_ids(frame_part.table):
        raise CheckpointContractError(f"ordered id mismatch in {part_path.name}")
    return verified


def apply_artifact(config: ApplyConfig) -> dict[str, object]:
    state = _state(config)
    state.parts_dir.mkdir(parents=True, exist_ok=True)
    if not config.resume and any(state.parts_dir.glob("part-*")):
        raise CheckpointContractError("checkpoint directory is not empty; use resume")
    ids_digest = hashlib.sha256()
    for frame_part in iter_frame_parts(config.frame, state.total_rows, PART_SIZE):
        part_path, sidecar_path = _paths(state.parts_dir, frame_part.index)
        update_ids_hash(ids_digest, ordered_ids(frame_part.table))
        if config.resume and part_path.is_file() and sidecar_path.is_file():
            _verify_part(state, frame_part, part_path, sidecar_path)
            print(f"part {frame_part.index + 1}: verified checkpoint", flush=True)
            continue
        predictions = score_part(state.artifact.bundle, frame_part.table)
        atomic_write_parquet(part_path, predictions)
        contract = _contract(state, frame_part, sha256_file(part_path))
        atomic_write_json(sidecar_path, contract.model_dump(mode="json"))
        _verify_part(state, frame_part, part_path, sidecar_path)
        print(f"part {frame_part.index + 1}: written and verified", flush=True)
    sizes = partition_sizes(state.total_rows)
    parts = validate_part_inventory(state.parts_dir, len(sizes))
    merge_parts(parts, config.output, prediction_schema())
    ids_hash = ids_digest.hexdigest()
    write_output_contract(state, config.output, ids_hash, len(parts))
    verified = verify_output(state, config.output, ids_hash, len(parts))
    report: dict[str, object] = {
        "classifier_version": verified.classifier_version,
        "fingerprint": verified.fingerprint,
        "rows": verified.total_rows,
        "parts": verified.part_count,
        "parts_directory": str(state.parts_dir),
        "output": str(config.output),
        "output_sha256": verified.output_hash,
    }
    print(json.dumps(report, indent=2, sort_keys=True), flush=True)
    return report


def verify_application(config: VerifyConfig) -> dict[str, object]:
    state = _state(config)
    sizes = partition_sizes(state.total_rows)
    validate_part_inventory(state.parts_dir, len(sizes))
    ids_digest = hashlib.sha256()
    for frame_part in iter_frame_parts(config.frame, state.total_rows, PART_SIZE):
        part_path, sidecar_path = _paths(state.parts_dir, frame_part.index)
        _verify_part(state, frame_part, part_path, sidecar_path)
        update_ids_hash(ids_digest, ordered_ids(frame_part.table))
    ids_hash = ids_digest.hexdigest()
    output_contract = (
        None
        if config.output is None
        else verify_output(state, config.output, ids_hash, len(sizes))
    )
    report: dict[str, object] = {
        "classifier_version": state.artifact.bundle.classifier_version,
        "fingerprint": state.fingerprint,
        "rows": state.total_rows,
        "parts": len(sizes),
        "output_sha256": None if output_contract is None else output_contract.output_hash,
        "status": "verified",
    }
    print(json.dumps(report, indent=2, sort_keys=True), flush=True)
    return report
