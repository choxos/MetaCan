from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from typing import Final

from pydantic import BaseModel, TypeAdapter, ValidationError

from ml.classifier_records import Category, DataContractError, StudyDesign


class _EnumItems(BaseModel):
    enum: tuple[str, ...]


class _SchemaProperty(BaseModel):
    enum: tuple[str | None, ...] | None = None
    items: _EnumItems | None = None


class _SchemaItems(BaseModel):
    required: tuple[str, ...]
    properties: dict[str, _SchemaProperty]


class _SchemaDocument(BaseModel):
    items: _SchemaItems


_SCHEMA_ADAPTER: Final = TypeAdapter(_SchemaDocument)
_REQUIRED_FIELDS: Final = frozenset(
    {
        "id",
        "categories",
        "study_design",
        "genre",
        "about_ca_system",
        "about_ca_topic",
        "confidence",
    }
)
_PROPERTY_FIELDS: Final = _REQUIRED_FIELDS | {"domain", "reason"}


def sha256_path(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_schema_contract(path: Path) -> str:
    try:
        schema = _SCHEMA_ADAPTER.validate_json(path.read_bytes())
    except (OSError, ValidationError) as error:
        raise DataContractError(f"invalid schema {path}: {error}") from error
    properties = schema.items.properties
    category_items = properties["categories"].items
    category_values = () if category_items is None else category_items.enum
    design_values = properties["study_design"].enum or ()
    checks = (
        (frozenset(schema.items.required) == _REQUIRED_FIELDS, "required fields"),
        (frozenset(properties) == _PROPERTY_FIELDS, "property fields"),
        (set(category_values) == {item.value for item in Category}, "category vocabulary"),
        (set(design_values) == {item.value for item in StudyDesign}, "study design vocabulary"),
    )
    failures = tuple(name for passed, name in checks if not passed)
    if failures:
        raise DataContractError(f"schema contract mismatch: {', '.join(failures)}")
    return sha256_path(path)
