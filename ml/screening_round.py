from __future__ import annotations

import hashlib
import json
import os
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum, unique
from pathlib import Path
from typing import Literal, NewType

from pydantic import JsonValue, TypeAdapter, ValidationError

from ml.screening_chunks import (
    ChunkExpectation,
    ChunkNumber,
    ChunkValidation,
    InvalidChunk,
    ValidatedChunk,
    WorkId,
    validate_chunk_text,
)

ChunkIndex = NewType("ChunkIndex", int)
CandidateOrigin = Literal["preexisting", "repair"]
SourceStream = Literal["stdout", "stderr", "response", "unknown"]


@unique
class ScreeningArm(StrEnum):
    CODEX = "codex"
    GEMMA = "gemma"


@dataclass(frozen=True, slots=True)
class ChunkKey:
    arm: ScreeningArm
    number: int


@dataclass(frozen=True, slots=True)
class CandidateProvenance:
    model_id: str | None
    backend: str | None
    attempt: int | None
    source_stream: SourceStream
    origin: CandidateOrigin


@dataclass(frozen=True, slots=True)
class RoundContract:
    round_dir: Path
    batch: tuple[dict[str, JsonValue], ...]
    expectations: tuple[ChunkExpectation, ...]
    schema_path: Path
    rubric_path: Path

    def expectation(self, number: int) -> ChunkExpectation:
        if number < 1 or number > len(self.expectations):
            raise ValueError(f"chunk number {number} is outside the round contract")
        return self.expectations[number - 1]


@dataclass(frozen=True, slots=True)
class QuarantineReceipt:
    candidate_path: Path
    report_path: Path


@dataclass(frozen=True, slots=True)
class AssemblyResult:
    codex_labels: Path
    gemma_labels: Path
    provenance_manifest: Path
    status: Path


class RoundContractError(ValueError):
    pass


class CandidateRejected(ValueError):
    def __init__(self, failure: InvalidChunk) -> None:
        self.failure = failure
        codes = ", ".join(sorted({issue.code.value for issue in failure.issues}))
        super().__init__(f"chunk candidate rejected: {codes}")


class RoundIncomplete(ValueError):
    pass


_BATCH_ADAPTER = TypeAdapter(list[dict[str, JsonValue]])


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_path(path: Path) -> str:
    return _sha256_bytes(path.read_bytes())


def _canonical_json(value: JsonValue) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def load_round_contract(
    round_dir: Path,
    *,
    chunk_size: int = 25,
    schema_path: Path | None = None,
    rubric_path: Path | None = None,
) -> RoundContract:
    if chunk_size < 1:
        raise RoundContractError("chunk size must be positive")
    root = Path(__file__).resolve().parents[1]
    schema = schema_path or root / "docs/protocol/screening-schema-v3.json"
    rubric = rubric_path or root / "docs/protocol/rubric-v3.md"
    try:
        batch = _BATCH_ADAPTER.validate_json((round_dir / "batch.json").read_text(encoding="utf-8"))
    except (OSError, ValidationError) as error:
        raise RoundContractError("batch.json is missing or invalid") from error
    ids: list[WorkId] = []
    for index, record in enumerate(batch):
        work_id = record.get("id")
        if not isinstance(work_id, str) or not work_id.startswith("W"):
            raise RoundContractError(f"batch record {index} has an invalid id")
        ids.append(WorkId(work_id))
    if not ids or len(ids) != len(set(ids)):
        raise RoundContractError("batch ids must be nonempty and unique")
    expectations = tuple(
        ChunkExpectation(
            number=ChunkNumber(index + 1),
            ids=tuple(ids[offset : offset + chunk_size]),
        )
        for index, offset in enumerate(range(0, len(ids), chunk_size))
    )
    return RoundContract(
        round_dir=round_dir,
        batch=tuple(batch),
        expectations=expectations,
        schema_path=schema,
        rubric_path=rubric,
    )


def chunk_path(contract: RoundContract, key: ChunkKey) -> Path:
    return contract.round_dir / f"raw_{key.arm.value}" / f"chunk_{key.number:03d}.json"


def provenance_path(contract: RoundContract, key: ChunkKey) -> Path:
    return contract.round_dir / f"raw_{key.arm.value}" / f"provenance_{key.number:03d}.json"


def inspect_existing(contract: RoundContract, key: ChunkKey) -> ChunkValidation | None:
    path = chunk_path(contract, key)
    if not path.is_file():
        return None
    return validate_chunk_text(
        path.read_text(encoding="utf-8", errors="replace"),
        contract.expectation(key.number),
    )


def _provenance_payload(
    contract: RoundContract,
    key: ChunkKey,
    validated: ValidatedChunk,
    provenance: CandidateProvenance,
) -> dict[str, JsonValue]:
    output = validated.to_json().encode()
    expected_ids = _canonical_json(list(validated.expectation.ids)).encode()
    return {
        "accepted_at": datetime.now(UTC).isoformat(),
        "arm": key.arm.value,
        "attempt": provenance.attempt,
        "backend": provenance.backend,
        "chunk_number": key.number,
        "expected_ids_sha256": _sha256_bytes(expected_ids),
        "model_id": provenance.model_id,
        "origin": provenance.origin,
        "output_sha256": _sha256_bytes(output),
        "provenance_complete": all(
            value is not None
            for value in (provenance.model_id, provenance.backend, provenance.attempt)
        ),
        "record_count": len(validated.records),
        "rubric_sha256": _sha256_path(contract.rubric_path),
        "schema_sha256": _sha256_path(contract.schema_path),
        "source_stream": provenance.source_stream,
        "validation": {"codes": [], "valid": True},
    }


def accept_candidate(
    contract: RoundContract,
    key: ChunkKey,
    candidate: str,
    provenance: CandidateProvenance,
) -> ValidatedChunk:
    result = validate_chunk_text(candidate, contract.expectation(key.number))
    if isinstance(result, InvalidChunk):
        raise CandidateRejected(result)
    atomic_write_text(chunk_path(contract, key), result.to_json())
    payload = _provenance_payload(contract, key, result, provenance)
    atomic_write_text(provenance_path(contract, key), json.dumps(payload, indent=2) + "\n")
    return result


def _quarantine_stem(contract: RoundContract, key: ChunkKey, attempt: int) -> Path:
    directory = contract.round_dir / "quarantine" / key.arm.value / f"chunk_{key.number:03d}"
    stem = directory / f"attempt_{attempt:02d}"
    suffix = 1
    while stem.with_suffix(".json").exists():
        suffix += 1
        stem = directory / f"attempt_{attempt:02d}_{suffix:02d}"
    return stem


def quarantine_candidate(
    contract: RoundContract,
    key: ChunkKey,
    candidate: str,
    failure: InvalidChunk,
    *,
    attempt: int,
) -> QuarantineReceipt:
    stem = _quarantine_stem(contract, key, attempt)
    candidate_path = stem.with_suffix(".json")
    report_path = stem.with_suffix(".validation.json")
    codes = sorted({issue.code.value for issue in failure.issues})
    atomic_write_text(candidate_path, candidate)
    atomic_write_text(
        report_path,
        json.dumps({"codes": codes, "issue_count": len(failure.issues)}, indent=2) + "\n",
    )
    return QuarantineReceipt(candidate_path=candidate_path, report_path=report_path)


def quarantine_existing(contract: RoundContract, key: ChunkKey) -> QuarantineReceipt | None:
    path = chunk_path(contract, key)
    inspected = inspect_existing(contract, key)
    if inspected is None or isinstance(inspected, ValidatedChunk):
        return None
    receipt = quarantine_candidate(
        contract,
        key,
        path.read_text(encoding="utf-8", errors="replace"),
        inspected,
        attempt=0,
    )
    path.unlink()
    provenance_path(contract, key).unlink(missing_ok=True)
    return receipt


def assemble_round(contract: RoundContract) -> AssemblyResult:
    from ml.screening_assembly import assemble_round as _assemble_round

    return _assemble_round(contract)
