from __future__ import annotations

from pathlib import Path
from typing import Final

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from ml.classifier_artifacts import sha256_file

PART_CONTRACT_VERSION: Final = 1
PART_SIZE: Final = 100_000


class CheckpointContractError(ValueError):
    pass


class PartContract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    version: int = Field(ge=1)
    part_name: str = Field(pattern=r"^part-\d{5}\.parquet$")
    offset_start: int = Field(ge=0)
    offset_end: int = Field(gt=0)
    row_count: int = Field(gt=0)
    first_id: str = Field(pattern=r"^W\d+$")
    last_id: str = Field(pattern=r"^W\d+$")
    input_slice_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    ordered_ids_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    frame_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    model_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    feature_contract_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    schema_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    output_hash: str = Field(pattern=r"^[0-9a-f]{64}$")

    @model_validator(mode="after")
    def offsets_match_count(self) -> PartContract:
        if self.offset_end - self.offset_start != self.row_count:
            raise ValueError("part offsets do not match row count")
        return self


class ApplicationContract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    version: int = Field(ge=1)
    fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")
    classifier_version: str = Field(min_length=1)
    total_rows: int = Field(gt=0)
    part_count: int = Field(gt=0)
    frame_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    model_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    feature_contract_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    schema_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    ordered_ids_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    output_hash: str = Field(pattern=r"^[0-9a-f]{64}$")


def partition_sizes(total_rows: int, part_size: int = PART_SIZE) -> tuple[int, ...]:
    if total_rows < 1 or part_size < 1:
        raise ValueError("row and part counts must be positive")
    full, remainder = divmod(total_rows, part_size)
    sizes = (part_size,) * full
    return sizes + ((remainder,) if remainder else ())


def read_checkpoint(path: Path) -> PartContract:
    try:
        return PartContract.model_validate_json(path.read_text(encoding="utf-8"))
    except (OSError, ValidationError) as error:
        raise CheckpointContractError(f"invalid checkpoint {path.name}") from error


def verify_checkpoint(
    part_path: Path,
    sidecar_path: Path,
    expected: PartContract,
) -> PartContract:
    existing = read_checkpoint(sidecar_path)
    expected_fields = expected.model_dump()
    existing_fields = existing.model_dump()
    mismatches = sorted(
        name for name, value in expected_fields.items() if existing_fields.get(name) != value
    )
    if mismatches:
        raise CheckpointContractError(
            f"checkpoint contract mismatch: {', '.join(mismatches)}"
        )
    if not part_path.is_file() or sha256_file(part_path) != existing.output_hash:
        raise CheckpointContractError("checkpoint output hash mismatch")
    return existing


def validate_part_inventory(parts_dir: Path, expected_parts: int) -> tuple[Path, ...]:
    if expected_parts < 1:
        raise ValueError("expected parts must be positive")
    expected_parquet = {
        parts_dir / f"part-{index:05d}.parquet" for index in range(expected_parts)
    }
    expected_json = {parts_dir / f"part-{index:05d}.json" for index in range(expected_parts)}
    actual_parquet = set(parts_dir.glob("part-*.parquet"))
    actual_json = set(parts_dir.glob("part-*.json"))
    if actual_parquet != expected_parquet or actual_json != expected_json:
        raise CheckpointContractError("mixed or incomplete part inventory")
    return tuple(sorted(actual_parquet))
