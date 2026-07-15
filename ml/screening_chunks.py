from __future__ import annotations

import json
import re
from collections.abc import Iterator
from dataclasses import dataclass
from enum import StrEnum, unique
from pathlib import Path
from typing import Final, NewType, Protocol, cast

from jsonschema import Draft7Validator
from jsonschema.exceptions import ValidationError as SchemaValidationError
from pydantic import JsonValue, TypeAdapter, ValidationError

WorkId = NewType("WorkId", str)
ChunkNumber = NewType("ChunkNumber", int)


@unique
class ChunkErrorCode(StrEnum):
    INVALID_JSON = "invalid_json"
    NOT_ARRAY = "not_array"
    INVALID_RECORD = "invalid_record"
    WRONG_COUNT = "wrong_count"
    DUPLICATE_ID = "duplicate_id"
    MALFORMED_ID = "malformed_id"
    WRONG_ID_SET = "wrong_id_set"
    INVALID_CATEGORY = "invalid_category"
    INVALID_GENRE = "invalid_genre"
    SCHEMA_VIOLATION = "schema_violation"


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    code: ChunkErrorCode
    record_index: int | None = None
    field_path: str | None = None


@dataclass(frozen=True, slots=True)
class ChunkExpectation:
    number: ChunkNumber
    ids: tuple[WorkId, ...]


@dataclass(frozen=True, slots=True)
class ValidatedRecord:
    work_id: WorkId
    json_text: str


@dataclass(frozen=True, slots=True)
class ValidatedChunk:
    expectation: ChunkExpectation
    records: tuple[ValidatedRecord, ...]

    def to_json(self) -> str:
        return "[" + ",".join(record.json_text for record in self.records) + "]\n"


@dataclass(frozen=True, slots=True)
class InvalidChunk:
    expectation: ChunkExpectation
    issues: tuple[ValidationIssue, ...]


type ChunkValidation = ValidatedChunk | InvalidChunk

_JSON_ADAPTER: Final[TypeAdapter[JsonValue]] = TypeAdapter(JsonValue)
_WORK_ID_PATTERN: Final = re.compile(r"W\d+")
_SCHEMA_PATH: Final = Path(__file__).resolve().parents[1] / "docs/protocol/screening-schema-v3.json"
_SCHEMA = json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))
Draft7Validator.check_schema(_SCHEMA)
_ITEM_VALIDATOR: Final = Draft7Validator(_SCHEMA["items"])
_SCHEMA_CODE_BY_RULE: Final = {
    ("pattern", "id"): ChunkErrorCode.MALFORMED_ID,
    ("enum", "categories"): ChunkErrorCode.INVALID_CATEGORY,
    ("enum", "genre"): ChunkErrorCode.INVALID_GENRE,
}


class _SchemaValidator(Protocol):
    def iter_errors(self, instance: JsonValue) -> Iterator[SchemaValidationError]: ...


_TYPED_ITEM_VALIDATOR = cast(_SchemaValidator, _ITEM_VALIDATOR)


def _schema_issue(error: SchemaValidationError, record_index: int) -> ValidationIssue:
    path = tuple(str(part) for part in error.absolute_path)
    top_field = path[0] if path else ""
    code = _SCHEMA_CODE_BY_RULE.get(
        (str(error.validator), top_field),
        ChunkErrorCode.SCHEMA_VIOLATION,
    )
    return ValidationIssue(
        code=code,
        record_index=record_index,
        field_path=".".join(path) or None,
    )


def validate_record_schema(
    record: dict[str, JsonValue], record_index: int = 0
) -> tuple[ValidationIssue, ...]:
    return tuple(
        _schema_issue(error, record_index) for error in _TYPED_ITEM_VALIDATOR.iter_errors(record)
    )


def validate_chunk_text(raw_text: str, expectation: ChunkExpectation) -> ChunkValidation:
    try:
        parsed: JsonValue = _JSON_ADAPTER.validate_json(raw_text)
    except ValidationError:
        return InvalidChunk(
            expectation=expectation,
            issues=(ValidationIssue(code=ChunkErrorCode.INVALID_JSON),),
        )

    match parsed:
        case list() as values:
            records: list[ValidatedRecord] = []
            schema_issues: list[ValidationIssue] = []
            for index, value in enumerate(values):
                match value:
                    case dict() as record:
                        schema_issues.extend(validate_record_schema(record, index))
                        work_id = record.get("id")
                        match work_id:
                            case str() as identifier:
                                records.append(
                                    ValidatedRecord(
                                        work_id=WorkId(identifier),
                                        json_text=json.dumps(
                                            record,
                                            ensure_ascii=False,
                                            sort_keys=True,
                                            separators=(",", ":"),
                                        ),
                                    )
                                )
                            case _:
                                return InvalidChunk(
                                    expectation=expectation,
                                    issues=(
                                        ValidationIssue(
                                            code=ChunkErrorCode.INVALID_RECORD,
                                            record_index=index,
                                            field_path="id",
                                        ),
                                    ),
                                )
                    case _:
                        return InvalidChunk(
                            expectation=expectation,
                            issues=(
                                ValidationIssue(
                                    code=ChunkErrorCode.INVALID_RECORD,
                                    record_index=index,
                                ),
                            ),
                        )
            id_issues: list[ValidationIssue] = []
            record_ids = tuple(record.work_id for record in records)
            if len(records) != len(expectation.ids):
                id_issues.append(ValidationIssue(code=ChunkErrorCode.WRONG_COUNT))
            if len(set(record_ids)) != len(record_ids):
                id_issues.append(ValidationIssue(code=ChunkErrorCode.DUPLICATE_ID))
            if any(_WORK_ID_PATTERN.fullmatch(work_id) is None for work_id in record_ids):
                id_issues.append(ValidationIssue(code=ChunkErrorCode.MALFORMED_ID))
            if set(record_ids) != set(expectation.ids):
                id_issues.append(ValidationIssue(code=ChunkErrorCode.WRONG_ID_SET))
            if id_issues:
                return InvalidChunk(
                    expectation=expectation,
                    issues=tuple(id_issues + schema_issues),
                )
            if schema_issues:
                return InvalidChunk(
                    expectation=expectation,
                    issues=tuple(schema_issues),
                )
            return ValidatedChunk(expectation=expectation, records=tuple(records))
        case _:
            return InvalidChunk(
                expectation=expectation,
                issues=(ValidationIssue(code=ChunkErrorCode.NOT_ARRAY),),
            )
