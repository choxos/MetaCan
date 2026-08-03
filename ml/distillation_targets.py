from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from ml.chunk_validation import Category, Domain, Genre, LabelRecord, StudyDesign


class BinaryField(StrEnum):
    CATEGORY = "category"
    ABOUT_CA_SYSTEM = "about_ca_system"
    ABOUT_CA_TOPIC = "about_ca_topic"


class CategoricalField(StrEnum):
    DOMAIN = "domain"
    STUDY_DESIGN = "study_design"
    GENRE = "genre"


@dataclass(frozen=True, slots=True)
class BinaryTarget:
    name: str
    field: BinaryField
    category: Category | None = None


@dataclass(frozen=True, slots=True)
class CategoricalTarget:
    name: str
    field: CategoricalField
    values: tuple[str, ...]


BINARY_TARGETS = tuple(
    BinaryTarget(
        name=f"category__{category.value}",
        field=BinaryField.CATEGORY,
        category=category,
    )
    for category in Category
) + (
    BinaryTarget(name="about_ca_system", field=BinaryField.ABOUT_CA_SYSTEM),
    BinaryTarget(name="about_ca_topic", field=BinaryField.ABOUT_CA_TOPIC),
)

CATEGORICAL_TARGETS = (
    CategoricalTarget(
        name="domain",
        field=CategoricalField.DOMAIN,
        values=("not_metaresearch", *(domain.value for domain in Domain)),
    ),
    CategoricalTarget(
        name="study_design",
        field=CategoricalField.STUDY_DESIGN,
        values=tuple(design.value for design in StudyDesign),
    ),
    CategoricalTarget(
        name="genre",
        field=CategoricalField.GENRE,
        values=tuple(genre.value for genre in Genre),
    ),
)


def binary_value(record: LabelRecord, target: BinaryTarget) -> bool:
    match target.field:
        case BinaryField.CATEGORY:
            if target.category is None:
                raise ValueError(f"category target {target.name} has no category")
            return target.category in record.categories
        case BinaryField.ABOUT_CA_SYSTEM:
            return record.about_ca_system
        case BinaryField.ABOUT_CA_TOPIC:
            return record.about_ca_topic


def categorical_value(record: LabelRecord, target: CategoricalTarget) -> str:
    match target.field:
        case CategoricalField.DOMAIN:
            return record.domain.value if record.domain is not None else "not_metaresearch"
        case CategoricalField.STUDY_DESIGN:
            return record.study_design.value
        case CategoricalField.GENRE:
            return record.genre.value
