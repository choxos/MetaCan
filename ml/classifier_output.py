from __future__ import annotations

# pyright: reportUnknownMemberType=false
from pathlib import Path
from typing import Protocol

import pyarrow.parquet as pq
from pydantic import ValidationError

from ml.classifier_apply import (
    PART_CONTRACT_VERSION,
    ApplicationContract,
    CheckpointContractError,
)
from ml.classifier_artifacts import atomic_write_json, sha256_file
from ml.classifier_model import LoadedArtifact
from ml.classifier_part_io import ordered_ids_hash, prediction_schema


class OutputState(Protocol):
    @property
    def artifact(self) -> LoadedArtifact: ...

    @property
    def total_rows(self) -> int: ...

    @property
    def frame_hash(self) -> str: ...

    @property
    def fingerprint(self) -> str: ...


def application_sidecar(output: Path) -> Path:
    return output.with_suffix(f"{output.suffix}.json")


def verify_output(
    state: OutputState,
    output: Path,
    expected_ids_hash: str,
    expected_parts: int,
) -> ApplicationContract:
    sidecar = application_sidecar(output)
    try:
        existing = ApplicationContract.model_validate_json(sidecar.read_text(encoding="utf-8"))
    except (OSError, ValidationError) as error:
        raise CheckpointContractError("invalid merged output contract") from error
    expected = ApplicationContract(
        version=PART_CONTRACT_VERSION,
        fingerprint=state.fingerprint,
        classifier_version=state.artifact.bundle.classifier_version,
        total_rows=state.total_rows,
        part_count=expected_parts,
        frame_hash=state.frame_hash,
        model_hash=state.artifact.model_hash,
        feature_contract_hash=state.artifact.bundle.feature_contract_hash,
        schema_hash=state.artifact.bundle.schema_hash,
        ordered_ids_hash=expected_ids_hash,
        output_hash=existing.output_hash,
    )
    if existing != expected or sha256_file(output) != existing.output_hash:
        raise CheckpointContractError("merged output contract mismatch")
    parquet = pq.ParquetFile(output)
    if parquet.metadata.num_rows != state.total_rows:
        raise CheckpointContractError("merged output row count mismatch")
    if not parquet.schema_arrow.equals(prediction_schema()):
        raise CheckpointContractError("merged output schema mismatch")
    output_ids = pq.read_table(output, columns=["id"])
    if ordered_ids_hash(output_ids) != expected_ids_hash:
        raise CheckpointContractError("merged output ordered id mismatch")
    return existing


def write_output_contract(
    state: OutputState,
    output: Path,
    ids_hash: str,
    part_count: int,
) -> ApplicationContract:
    contract = ApplicationContract(
        version=PART_CONTRACT_VERSION,
        fingerprint=state.fingerprint,
        classifier_version=state.artifact.bundle.classifier_version,
        total_rows=state.total_rows,
        part_count=part_count,
        frame_hash=state.frame_hash,
        model_hash=state.artifact.model_hash,
        feature_contract_hash=state.artifact.bundle.feature_contract_hash,
        schema_hash=state.artifact.bundle.schema_hash,
        ordered_ids_hash=ids_hash,
        output_hash=sha256_file(output),
    )
    atomic_write_json(application_sidecar(output), contract.model_dump(mode="json"))
    return contract
