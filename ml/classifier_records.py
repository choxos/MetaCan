from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Final

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Teacher(StrEnum):
    CODEX = "codex"
    GEMMA = "gemma"


class TargetFamily(StrEnum):
    CATEGORY = "category"
    STUDY_DESIGN = "study_design"


class Category(StrEnum):
    METARESEARCH = "metaresearch"
    META_EPI_NARROW = "metaepi_narrow"
    META_EPI_BROAD = "metaepi_broad"
    BIBLIOMETRICS = "bibliometrics"
    STS = "sts"
    SCHOLARLY_COMMUNICATION = "scholarly_communication"
    OPEN_SCIENCE = "open_science"
    RESEARCH_INTEGRITY = "research_integrity"
    INSUFFICIENT_PAYLOAD = "insufficient_payload"


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


class Domain(StrEnum):
    METHODS = "methods"
    REPORTING = "reporting"
    REPRODUCIBILITY = "reproducibility"
    EVALUATION = "evaluation"
    INCENTIVES = "incentives"


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


class Confidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True, slots=True)
class DataContractError(Exception):
    detail: str

    def __str__(self) -> str:
        return self.detail


@dataclass(frozen=True, slots=True)
class TargetSpec:
    name: str
    family: TargetFamily


CATEGORY_TARGETS: Final = tuple(
    TargetSpec(category.value, TargetFamily.CATEGORY)
    for category in Category
    if category is not Category.INSUFFICIENT_PAYLOAD
)
STUDY_DESIGN_TARGETS: Final = tuple(
    TargetSpec(design.value, TargetFamily.STUDY_DESIGN) for design in StudyDesign
)
ALL_TARGETS: Final = CATEGORY_TARGETS + STUDY_DESIGN_TARGETS


class WorkRecord(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    id: str = Field(pattern=r"^W\d+$")
    title: str | None = None
    venue: str | None = None
    topic: str | None = None
    field: str | None = None
    lang: str | None = None
    type: str | None = None
    year: int | None = None
    stratum: str | None = None
    weight: float = Field(default=1.0, gt=0.0)


class ClassificationRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(pattern=r"^W\d+$")
    categories: tuple[Category, ...]
    domain: Domain | None = None
    study_design: StudyDesign
    genre: Genre
    about_ca_system: bool
    about_ca_topic: bool
    confidence: Confidence
    reason: str | None = Field(default=None, max_length=400)

    @field_validator("categories")
    @classmethod
    def categories_are_unique(cls, value: tuple[Category, ...]) -> tuple[Category, ...]:
        if len(value) != len(set(value)):
            raise DataContractError("categories contain duplicates")
        if Category.INSUFFICIENT_PAYLOAD in value and len(value) != 1:
            raise DataContractError("insufficient payload must be the only category")
        return value

    @model_validator(mode="after")
    def domain_matches_metaresearch(self) -> ClassificationRecord:
        is_meta = Category.METARESEARCH in self.categories
        if is_meta and self.domain is None:
            raise DataContractError("domain is required for metaresearch")
        if not is_meta and self.domain is not None:
            raise DataContractError("domain must be null outside metaresearch")
        return self


def target_by_name(name: str) -> TargetSpec:
    for target in ALL_TARGETS:
        if target.name == name:
            return target
    raise DataContractError(f"unknown classifier target {name}")


def target_value(
    classification: ClassificationRecord | None,
    target: TargetSpec,
) -> bool | None:
    if classification is None or Category.INSUFFICIENT_PAYLOAD in classification.categories:
        return None
    if target.family is TargetFamily.CATEGORY:
        return target.name in {category.value for category in classification.categories}
    if target.family is TargetFamily.STUDY_DESIGN:
        return classification.study_design.value == target.name
    raise DataContractError(f"unsupported target family {target.family}")
