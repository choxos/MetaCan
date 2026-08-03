"""Parse and validate model label chunks at the trust boundary."""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum, unique
from pathlib import Path
from typing import ClassVar, Final, NewType, NotRequired, TypedDict

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError, model_validator
from pydantic_core import PydanticCustomError

type JsonValue = str | int | float | bool | None | list[JsonValue] | dict[str, JsonValue]

WorkId = NewType("WorkId", str)


@unique
class Category(StrEnum):
    METARESEARCH = "metaresearch"
    METAEPI_NARROW = "metaepi_narrow"
    METAEPI_BROAD = "metaepi_broad"
    BIBLIOMETRICS = "bibliometrics"
    STS = "sts"
    SCHOLARLY_COMMUNICATION = "scholarly_communication"
    OPEN_SCIENCE = "open_science"
    RESEARCH_INTEGRITY = "research_integrity"
    INSUFFICIENT_PAYLOAD = "insufficient_payload"


@unique
class Domain(StrEnum):
    METHODS = "methods"
    REPORTING = "reporting"
    REPRODUCIBILITY = "reproducibility"
    EVALUATION = "evaluation"
    INCENTIVES = "incentives"


@unique
class StudyDesign(StrEnum):
    RANDOMIZED_TRIAL = "randomized_trial"
    NONRANDOMIZED_TRIAL = "nonrandomized_trial"
    OBSERVATIONAL = "observational"
    SYSTEMATIC_REVIEW = "systematic_review"
    META_ANALYSIS = "meta_analysis"
    CASE_REPORT = "case_report"
    QUALITATIVE = "qualitative"
    SIMULATION_OR_MODELING = "simulation_or_modeling"
    BENCH_OR_EXPERIMENTAL = "bench_or_experimental"
    THEORETICAL_OR_CONCEPTUAL = "theoretical_or_conceptual"
    NOT_APPLICABLE = "not_applicable"
    DESIGN_OTHER = "design_other"


@unique
class Genre(StrEnum):
    EMPIRICAL = "empirical"
    REVIEW = "review"
    METHODS = "methods"
    COMMENTARY = "commentary"
    EDITORIAL = "editorial"
    PROTOCOL = "protocol"
    DATASET = "dataset"
    SOFTWARE = "software"
    OTHER = "other"


@unique
class Confidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class LabelRecord(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="forbid", frozen=True)

    id: WorkId = Field(pattern=r"^W\d+$")
    categories: tuple[Category, ...]
    domain: Domain | None = None
    study_design: StudyDesign
    genre: Genre
    about_ca_system: bool
    about_ca_topic: bool
    confidence: Confidence
    reason: str | None = Field(default=None, max_length=400)

    @model_validator(mode="after")
    def check_category_contract(self) -> LabelRecord:
        if len(set(self.categories)) != len(self.categories):
            raise PydanticCustomError("duplicate_categories", "categories must be unique")
        has_metaresearch = Category.METARESEARCH in self.categories
        if has_metaresearch and self.domain is None:
            raise PydanticCustomError(
                "missing_domain",
                "domain is required when categories contains metaresearch",
            )
        if not has_metaresearch and self.domain is not None:
            raise PydanticCustomError(
                "unexpected_domain",
                "domain must be null when categories excludes metaresearch",
            )
        return self


class LabelPayload(TypedDict):
    id: str
    categories: list[str]
    domain: str | None
    study_design: str
    genre: str
    about_ca_system: bool
    about_ca_topic: bool
    confidence: str
    reason: NotRequired[str]


@dataclass(frozen=True, slots=True)
class ValidChunk:
    records: tuple[LabelRecord, ...]


@dataclass(frozen=True, slots=True)
class InvalidChunk:
    errors: tuple[str, ...]


type ChunkValidation = ValidChunk | InvalidChunk

JSON_ADAPTER: Final[TypeAdapter[JsonValue]] = TypeAdapter(JsonValue)
LABELS_ADAPTER: Final[TypeAdapter[tuple[LabelRecord, ...]]] = TypeAdapter(tuple[LabelRecord, ...])


def _validation_errors(error: ValidationError) -> tuple[str, ...]:
    return tuple(
        f"{'.'.join(str(part) for part in detail['loc'])}: {detail['msg']}"
        for detail in error.errors(include_url=False)
    )


def validate_candidate(candidate: JsonValue, expected_ids: Sequence[str]) -> ChunkValidation:
    """Parse one candidate array and require exact chunk membership."""
    try:
        records = LABELS_ADAPTER.validate_python(candidate)
    except ValidationError as error:
        return InvalidChunk(errors=_validation_errors(error))

    expected = set(expected_ids)
    actual_ids = [str(record.id) for record in records]
    actual = set(actual_ids)
    errors: list[str] = []
    duplicate_ids = sorted({work_id for work_id in actual_ids if actual_ids.count(work_id) > 1})
    if duplicate_ids:
        errors.append("duplicate ids: " + ", ".join(duplicate_ids))
    missing = sorted(expected - actual)
    if missing:
        errors.append("missing ids: " + ", ".join(missing))
    unexpected = sorted(actual - expected)
    if unexpected:
        errors.append("unexpected ids: " + ", ".join(unexpected))
    if len(records) != len(expected_ids):
        errors.append(f"record count: expected {len(expected_ids)}, received {len(records)}")
    return InvalidChunk(errors=tuple(errors)) if errors else ValidChunk(records=records)


def _extract_candidates(raw: str) -> tuple[JsonValue, ...]:
    candidates: list[JsonValue] = []
    start = raw.find("[")
    while start >= 0:
        end = raw.rfind("]")
        while end > start:
            try:
                candidates.append(JSON_ADAPTER.validate_json(raw[start : end + 1]))
                break
            except ValidationError:
                end = raw.rfind("]", 0, end)
        start = raw.find("[", start + 1)
    return tuple(candidates)


def validate_streams(streams: Sequence[str], expected_ids: Sequence[str]) -> ChunkValidation:
    """Return the first valid array found across model output streams."""
    rejected: list[str] = []
    candidate_count = 0
    for raw in streams:
        for candidate in _extract_candidates(raw):
            candidate_count += 1
            result = validate_candidate(candidate, expected_ids)
            match result:
                case ValidChunk():
                    return result
                case InvalidChunk(errors=errors):
                    rejected.extend(f"candidate {candidate_count}: {error}" for error in errors)
    if candidate_count == 0:
        return InvalidChunk(errors=("no JSON array found in model output",))
    return InvalidChunk(errors=tuple(rejected))


def serialize_chunk(chunk: ValidChunk) -> tuple[LabelPayload, ...]:
    payloads: list[LabelPayload] = []
    for record in chunk.records:
        payload: LabelPayload = {
            "id": str(record.id),
            "categories": [category.value for category in record.categories],
            "domain": record.domain.value if record.domain is not None else None,
            "study_design": record.study_design.value,
            "genre": record.genre.value,
            "about_ca_system": record.about_ca_system,
            "about_ca_topic": record.about_ca_topic,
            "confidence": record.confidence.value,
        }
        if record.reason is not None:
            payload["reason"] = record.reason
        payloads.append(payload)
    return tuple(payloads)


def correction_prompt(prompt: str, result: InvalidChunk) -> str:
    feedback = {
        "errors": list(result.errors),
        "instruction": "Return a corrected full JSON array for the original records.",
    }
    return prompt + "\n\nVALIDATION_FEEDBACK_JSON\n" + json.dumps(feedback, ensure_ascii=False)


def validate_chunk_file(path: Path, expected_ids: Sequence[str]) -> ChunkValidation:
    try:
        candidate = JSON_ADAPTER.validate_json(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return InvalidChunk(errors=("chunk file is missing",))
    except OSError as error:
        return InvalidChunk(errors=(f"chunk file cannot be read: {error}",))
    except ValidationError:
        return InvalidChunk(errors=("chunk file is not valid JSON",))
    return validate_candidate(candidate, expected_ids)


def write_valid_chunk(path: Path, chunk: ValidChunk) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    _ = temporary.write_text(
        json.dumps(serialize_chunk(chunk), ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    _ = temporary.replace(path)
