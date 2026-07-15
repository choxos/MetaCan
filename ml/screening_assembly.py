from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from pydantic import JsonValue, TypeAdapter, ValidationError

from ml.screening_chunks import InvalidChunk, ValidatedChunk
from ml.screening_round import (
    AssemblyResult,
    ChunkKey,
    RoundContract,
    RoundIncomplete,
    ScreeningArm,
    atomic_write_text,
    chunk_path,
    inspect_existing,
    provenance_path,
)

_OBJECT_ADAPTER = TypeAdapter(dict[str, JsonValue])


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_path(path: Path) -> str:
    return _sha256_bytes(path.read_bytes())


def _canonical_json(value: JsonValue) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _preexisting_provenance(
    contract: RoundContract,
    key: ChunkKey,
    validated: ValidatedChunk,
) -> dict[str, JsonValue]:
    path = chunk_path(contract, key)
    meta_path = path.parent / f"meta_{key.number:03d}.json"
    backend: str | None = None
    if meta_path.is_file():
        try:
            meta = _OBJECT_ADAPTER.validate_json(meta_path.read_text(encoding="utf-8"))
        except ValidationError:
            meta = {}
        candidate = meta.get("backend")
        if isinstance(candidate, str):
            backend = candidate
    model_id = "gpt-5.6-luna" if key.arm is ScreeningArm.CODEX else "google/gemma-4-31b-it"
    expected_ids = _canonical_json(list(validated.expectation.ids)).encode()
    return {
        "accepted_at": datetime.fromtimestamp(path.stat().st_mtime, tz=UTC).isoformat(),
        "arm": key.arm.value,
        "attempt": None,
        "backend": backend,
        "chunk_number": key.number,
        "expected_ids_sha256": _sha256_bytes(expected_ids),
        "model_id": model_id,
        "origin": "preexisting",
        "output_sha256": _sha256_bytes(validated.to_json().encode()),
        "provenance_complete": False,
        "record_count": len(validated.records),
        "rubric_sha256": _sha256_path(contract.rubric_path),
        "schema_sha256": _sha256_path(contract.schema_path),
        "source_stream": "unknown",
        "validation": {"codes": [], "valid": True},
    }


def _load_provenance(
    contract: RoundContract,
    key: ChunkKey,
    validated: ValidatedChunk,
) -> dict[str, JsonValue]:
    sidecar = provenance_path(contract, key)
    if not sidecar.is_file():
        return _preexisting_provenance(contract, key, validated)
    try:
        payload = _OBJECT_ADAPTER.validate_json(sidecar.read_text(encoding="utf-8"))
    except ValidationError as error:
        raise RoundIncomplete(f"invalid provenance for {key.arm.value} {key.number}") from error
    expected = _preexisting_provenance(contract, key, validated)
    guarded_fields = (
        "arm",
        "chunk_number",
        "expected_ids_sha256",
        "output_sha256",
        "record_count",
        "rubric_sha256",
        "schema_sha256",
        "validation",
    )
    if any(payload.get(field) != expected[field] for field in guarded_fields):
        raise RoundIncomplete(f"provenance mismatch for {key.arm.value} chunk {key.number:03d}")
    return payload


def _validated_arm(
    contract: RoundContract, arm: ScreeningArm
) -> tuple[list[dict[str, JsonValue]], list[dict[str, JsonValue]]]:
    records_by_id: dict[str, dict[str, JsonValue]] = {}
    provenance: list[dict[str, JsonValue]] = []
    failures: list[str] = []
    for expectation in contract.expectations:
        key = ChunkKey(arm, int(expectation.number))
        inspected = inspect_existing(contract, key)
        if inspected is None:
            failures.append(f"{key.number:03d}:missing")
            continue
        if isinstance(inspected, InvalidChunk):
            codes = ",".join(sorted({issue.code.value for issue in inspected.issues}))
            failures.append(f"{key.number:03d}:{codes}")
            continue
        provenance.append(_load_provenance(contract, key, inspected))
        for record in inspected.records:
            parsed = _OBJECT_ADAPTER.validate_json(record.json_text)
            records_by_id[str(record.work_id)] = parsed
    if failures:
        preview = ", ".join(failures[:10])
        raise RoundIncomplete(f"{arm.value} is incomplete: {preview}")
    ordered: list[dict[str, JsonValue]] = []
    for batch_record in contract.batch:
        work_id = batch_record.get("id")
        if not isinstance(work_id, str) or work_id not in records_by_id:
            raise RoundIncomplete(f"{arm.value} is missing batch id {work_id}")
        ordered.append(records_by_id[work_id])
    if len(records_by_id) != len(contract.batch):
        raise RoundIncomplete(f"{arm.value} does not have exact batch set equality")
    return ordered, provenance


def assemble_round(contract: RoundContract) -> AssemblyResult:
    codex, codex_provenance = _validated_arm(contract, ScreeningArm.CODEX)
    gemma, gemma_provenance = _validated_arm(contract, ScreeningArm.GEMMA)
    expected_chunks = len(contract.expectations)
    opus_chunks = len(list((contract.round_dir / "raw_opus").glob("chunk_*.json")))
    status_payload: dict[str, JsonValue] = {
        "arms": {
            "codex": {
                "chunks_expected": expected_chunks,
                "chunks_present": expected_chunks,
                "included": True,
                "records": len(codex),
                "status": "complete",
            },
            "gemma": {
                "chunks_expected": expected_chunks,
                "chunks_present": expected_chunks,
                "included": True,
                "records": len(gemma),
                "status": "complete",
            },
            "opus": {
                "action": "paused",
                "chunks_expected": expected_chunks,
                "chunks_present": opus_chunks,
                "included": False,
                "status": "incomplete",
            },
        },
        "batch_records": len(contract.batch),
    }
    codex_path = contract.round_dir / "labels_codex.json"
    gemma_path = contract.round_dir / "labels_gemma.json"
    manifest_path = contract.round_dir / "chunk_provenance.json"
    status_path = contract.round_dir / "round_status.json"
    manifest = codex_provenance + gemma_provenance
    atomic_write_text(codex_path, json.dumps(codex, ensure_ascii=False, indent=1) + "\n")
    atomic_write_text(gemma_path, json.dumps(gemma, ensure_ascii=False, indent=1) + "\n")
    atomic_write_text(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    atomic_write_text(status_path, json.dumps(status_payload, ensure_ascii=False, indent=2) + "\n")
    return AssemblyResult(
        codex_labels=codex_path,
        gemma_labels=gemma_path,
        provenance_manifest=manifest_path,
        status=status_path,
    )
