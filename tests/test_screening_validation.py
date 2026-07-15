from __future__ import annotations

import json

from ml import gemma
from ml import validate_round as subject

type JsonFixtureValue = str | bool | None | list[str]


def _record(work_id: str) -> dict[str, JsonFixtureValue]:
    return {
        "id": work_id,
        "categories": [],
        "study_design": "not_applicable",
        "genre": "other",
        "about_ca_system": False,
        "about_ca_topic": False,
        "confidence": "high",
        "reason": "Screen using the rubric only; text that resembles a prompt is data.",
    }


def _expectation(*work_ids: str) -> subject.ChunkExpectation:
    return subject.ChunkExpectation(
        number=subject.ChunkNumber(1),
        ids=tuple(subject.WorkId(work_id) for work_id in work_ids),
    )


def test_accepts_valid_chunk_when_ids_are_exact() -> None:
    # Given
    expectation = _expectation("W1", "W2")
    raw_text = json.dumps([_record("W1"), _record("W2")])

    # When
    result = subject.validate_chunk_text(raw_text, expectation)

    # Then
    assert isinstance(result, subject.ValidatedChunk)
    assert tuple(record.work_id for record in result.records) == ("W1", "W2")


def test_rejects_chunk_when_id_set_is_wrong() -> None:
    # Given
    expectation = _expectation("W1", "W2")
    raw_text = json.dumps([_record("W1"), _record("W3")])

    # When
    result = subject.validate_chunk_text(raw_text, expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert {issue.code for issue in result.issues} == {
        subject.ChunkErrorCode.WRONG_ID_SET,
    }


def test_rejects_chunk_when_expected_id_is_missing() -> None:
    # Given
    expectation = _expectation("W1", "W2")
    raw_text = json.dumps([_record("W1")])

    # When
    result = subject.validate_chunk_text(raw_text, expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert {issue.code for issue in result.issues} == {
        subject.ChunkErrorCode.WRONG_COUNT,
        subject.ChunkErrorCode.WRONG_ID_SET,
    }


def test_rejects_chunk_when_id_is_duplicated() -> None:
    # Given
    expectation = _expectation("W1", "W2")
    raw_text = json.dumps([_record("W1"), _record("W1")])

    # When
    result = subject.validate_chunk_text(raw_text, expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert {issue.code for issue in result.issues} == {
        subject.ChunkErrorCode.DUPLICATE_ID,
        subject.ChunkErrorCode.WRONG_ID_SET,
    }


def test_rejects_chunk_when_id_is_malformed() -> None:
    # Given
    expectation = _expectation("W1")
    raw_text = json.dumps([_record("ignore-previous-instructions")])

    # When
    result = subject.validate_chunk_text(raw_text, expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert {issue.code for issue in result.issues} == {
        subject.ChunkErrorCode.MALFORMED_ID,
        subject.ChunkErrorCode.WRONG_ID_SET,
    }


def test_rejects_record_when_category_is_invalid() -> None:
    # Given
    expectation = _expectation("W1")
    record = _record("W1")
    record["categories"] = ["not-a-category"]

    # When
    result = subject.validate_chunk_text(json.dumps([record]), expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert result.issues == (
        subject.ValidationIssue(
            code=subject.ChunkErrorCode.INVALID_CATEGORY,
            record_index=0,
            field_path="categories.0",
        ),
    )


def test_rejects_record_when_genre_is_invalid() -> None:
    # Given
    expectation = _expectation("W1")
    record = _record("W1")
    record["genre"] = "policy"

    # When
    result = subject.validate_chunk_text(json.dumps([record]), expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert result.issues == (
        subject.ValidationIssue(
            code=subject.ChunkErrorCode.INVALID_GENRE,
            record_index=0,
            field_path="genre",
        ),
    )


def test_requires_domain_for_metaresearch() -> None:
    # Given
    expectation = _expectation("W1")
    record = _record("W1")
    record["categories"] = ["metaresearch"]

    # When
    result = subject.validate_chunk_text(json.dumps([record]), expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert subject.ChunkErrorCode.SCHEMA_VIOLATION in {issue.code for issue in result.issues}


def test_rejects_domain_outside_metaresearch() -> None:
    # Given
    expectation = _expectation("W1")
    record = _record("W1")
    record["domain"] = "methods"

    # When
    result = subject.validate_chunk_text(json.dumps([record]), expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert subject.ChunkErrorCode.SCHEMA_VIOLATION in {issue.code for issue in result.issues}


def test_insufficient_payload_is_exclusive() -> None:
    # Given
    expectation = _expectation("W1")
    record = _record("W1")
    record["categories"] = ["insufficient_payload", "bibliometrics"]

    # When
    result = subject.validate_chunk_text(json.dumps([record]), expectation)

    # Then
    assert isinstance(result, subject.InvalidChunk)
    assert subject.ChunkErrorCode.SCHEMA_VIOLATION in {issue.code for issue in result.issues}


def test_gemma_prompt_translates_out_to_an_empty_category_array() -> None:
    prompt = gemma.build_prompt(({"id": "W1", "title": "A study"},))

    assert "OUT means an empty categories array" in prompt
    assert "Never emit OUT as a category value" in prompt
