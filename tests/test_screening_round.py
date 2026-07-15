from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from ml import screening_round as subject
from ml.screening_chunks import InvalidChunk, ValidatedChunk


def _record(work_id: str) -> dict[str, object]:
    return {
        "id": work_id,
        "categories": [],
        "study_design": "not_applicable",
        "genre": "other",
        "about_ca_system": False,
        "about_ca_topic": False,
        "confidence": "high",
    }


def _contract(tmp_path: Path) -> subject.RoundContract:
    round_dir = tmp_path / "round_100"
    round_dir.mkdir()
    batch = [
        {"id": "W2", "weight": 2.0, "stratum": "b"},
        {"id": "W1", "weight": 1.0, "stratum": "a"},
        {"id": "W3", "weight": 3.0, "stratum": "b"},
    ]
    (round_dir / "batch.json").write_text(json.dumps(batch), encoding="utf-8")
    return subject.load_round_contract(round_dir, chunk_size=2)


def _provenance() -> subject.CandidateProvenance:
    return subject.CandidateProvenance(
        model_id="test-model",
        backend="fixture",
        attempt=1,
        source_stream="stdout",
        origin="repair",
    )


def test_accept_candidate_writes_only_after_validation(tmp_path: Path) -> None:
    contract = _contract(tmp_path)
    key = subject.ChunkKey(subject.ScreeningArm.CODEX, 1)

    with pytest.raises(subject.CandidateRejected):
        subject.accept_candidate(contract, key, "[]", _provenance())

    assert not subject.chunk_path(contract, key).exists()

    accepted = subject.accept_candidate(
        contract,
        key,
        json.dumps([_record("W2"), _record("W1")]),
        _provenance(),
    )

    assert isinstance(accepted, ValidatedChunk)
    assert subject.chunk_path(contract, key).exists()
    sidecar = json.loads(subject.provenance_path(contract, key).read_text())
    assert sidecar["validation"] == {"codes": [], "valid": True}
    assert sidecar["record_count"] == 2


def test_quarantine_existing_preserves_invalid_candidate(tmp_path: Path) -> None:
    contract = _contract(tmp_path)
    key = subject.ChunkKey(subject.ScreeningArm.GEMMA, 1)
    path = subject.chunk_path(contract, key)
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps([_record("W99")]), encoding="utf-8")

    inspected = subject.inspect_existing(contract, key)
    assert isinstance(inspected, InvalidChunk)

    quarantined = subject.quarantine_existing(contract, key)

    assert quarantined is not None
    assert quarantined.candidate_path.exists()
    assert quarantined.report_path.exists()
    assert not path.exists()
    report = json.loads(quarantined.report_path.read_text())
    assert report["codes"] == ["wrong_count", "wrong_id_set"]


def test_assembly_requires_both_complete_arms(tmp_path: Path) -> None:
    contract = _contract(tmp_path)
    subject.accept_candidate(
        contract,
        subject.ChunkKey(subject.ScreeningArm.CODEX, 1),
        json.dumps([_record("W2"), _record("W1")]),
        _provenance(),
    )

    with pytest.raises(subject.RoundIncomplete):
        subject.assemble_round(contract)


def test_assembly_preserves_batch_order_and_pauses_opus(tmp_path: Path) -> None:
    contract = _contract(tmp_path)
    for arm in subject.ScreeningArm:
        subject.accept_candidate(
            contract,
            subject.ChunkKey(arm, 1),
            json.dumps([_record("W2"), _record("W1")]),
            _provenance(),
        )
        subject.accept_candidate(
            contract,
            subject.ChunkKey(arm, 2),
            json.dumps([_record("W3")]),
            _provenance(),
        )
    opus = contract.round_dir / "raw_opus" / "chunk_001.json"
    opus.parent.mkdir()
    opus.write_text("preserve me", encoding="utf-8")
    before = hashlib.sha256(opus.read_bytes()).hexdigest()

    result = subject.assemble_round(contract)

    codex = json.loads(result.codex_labels.read_text())
    gemma = json.loads(result.gemma_labels.read_text())
    manifest = json.loads(result.provenance_manifest.read_text())
    status = json.loads(result.status.read_text())
    assert [record["id"] for record in codex] == ["W2", "W1", "W3"]
    assert [record["id"] for record in gemma] == ["W2", "W1", "W3"]
    assert len(manifest) == 4
    assert len({(row["arm"], row["chunk_number"]) for row in manifest}) == 4
    assert status["arms"]["opus"] == {
        "action": "paused",
        "chunks_expected": 2,
        "chunks_present": 1,
        "included": False,
        "status": "incomplete",
    }
    assert hashlib.sha256(opus.read_bytes()).hexdigest() == before
