from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml import screening_repair as subject
from ml.screening_round import ChunkKey, ScreeningArm, load_round_contract


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


def _round(tmp_path: Path) -> tuple[subject.RoundContract, ChunkKey]:
    round_dir = tmp_path / "round_100"
    round_dir.mkdir()
    (round_dir / "batch.json").write_text(json.dumps([{"id": "W1"}]), encoding="utf-8")
    return load_round_contract(round_dir), ChunkKey(ScreeningArm.CODEX, 1)


def test_extracts_valid_candidate_from_second_stream(tmp_path: Path) -> None:
    contract, key = _round(tmp_path)
    valid = json.dumps([_record("W1")])
    output = subject.AttemptOutput(
        model_id="fixture",
        backend="local",
        streams=(
            subject.StreamOutput("stdout", "prose [not json]"),
            subject.StreamOutput("stderr", f"prefix\n{valid}\nsuffix"),
        ),
    )

    accepted = subject.accept_attempt_output(contract, key, output, attempt=1)

    assert accepted is not None
    assert accepted.source_stream == "stderr"
    assert accepted.attempt == 1


def test_repair_accepts_only_third_valid_attempt(tmp_path: Path) -> None:
    contract, key = _round(tmp_path)
    calls: list[int] = []

    def runner(attempt: int) -> subject.AttemptOutput:
        calls.append(attempt)
        candidate = [] if attempt < 3 else [_record("W1")]
        return subject.AttemptOutput(
            model_id="fixture",
            backend="local",
            streams=(subject.StreamOutput("response", json.dumps(candidate)),),
        )

    result = subject.repair_chunk(contract, key, runner, max_attempts=3)

    assert result.attempt == 3
    assert calls == [1, 2, 3]
    assert result.chunk_path.exists()


def test_repair_stops_after_three_invalid_attempts(tmp_path: Path) -> None:
    contract, key = _round(tmp_path)
    calls: list[int] = []

    def runner(attempt: int) -> subject.AttemptOutput:
        calls.append(attempt)
        return subject.AttemptOutput(
            model_id="fixture",
            backend="local",
            streams=(subject.StreamOutput("response", "[]"),),
        )

    with pytest.raises(subject.RepairExhausted):
        subject.repair_chunk(contract, key, runner, max_attempts=3)

    assert calls == [1, 2, 3]
    assert not subject.chunk_path(contract, key).exists()


def test_valid_existing_chunk_skips_model_call(tmp_path: Path) -> None:
    contract, key = _round(tmp_path)
    path = subject.chunk_path(contract, key)
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps([_record("W1")]), encoding="utf-8")

    def runner(attempt: int) -> subject.AttemptOutput:
        raise AssertionError(f"unexpected model call {attempt}")

    result = subject.repair_chunk(contract, key, runner, max_attempts=3)

    assert result.attempt == 0
    assert result.source_stream == "existing"
