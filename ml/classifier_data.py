from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Final, overload

from pydantic import TypeAdapter, ValidationError

from ml.classifier_records import (
    ALL_TARGETS,
    CATEGORY_TARGETS,
    STUDY_DESIGN_TARGETS,
    Category,
    ClassificationRecord,
    Confidence,
    DataContractError,
    Domain,
    Genre,
    StudyDesign,
    TargetFamily,
    TargetSpec,
    Teacher,
    WorkRecord,
    target_by_name,
    target_value,
)
from ml.classifier_schema import sha256_path, validate_schema_contract
from ml.features import PAYLOAD_FRAME_PARITY, assert_payload_parity, render

__all__ = [
    "ALL_TARGETS",
    "CATEGORY_TARGETS",
    "STUDY_DESIGN_TARGETS",
    "Category",
    "ClassificationRecord",
    "Confidence",
    "DataContractError",
    "Domain",
    "Genre",
    "StudyDesign",
    "TargetFamily",
    "TargetSpec",
    "Teacher",
    "TrainingCorpus",
    "TrainingInputPaths",
    "WorkRecord",
    "load_training_corpus",
    "render_work",
    "sha256_path",
    "target_by_name",
    "target_value",
    "validate_schema_contract",
]


@dataclass(frozen=True, slots=True)
class TrainingInputPaths:
    batch: Path
    codex_labels: Path
    gemma_labels: Path
    schema: Path


@dataclass(frozen=True, slots=True)
class NamedHash:
    name: str
    sha256: str


@dataclass(frozen=True, slots=True)
class TrainingCorpus:
    works: tuple[WorkRecord, ...]
    codex: tuple[ClassificationRecord, ...]
    gemma: tuple[ClassificationRecord, ...]
    teacher_aliases: tuple[tuple[str, str], ...]
    input_hashes: tuple[NamedHash, ...]
    schema_hash: str


_WORKS_ADAPTER: Final = TypeAdapter(tuple[WorkRecord, ...])
_LABELS_ADAPTER: Final = TypeAdapter(tuple[ClassificationRecord, ...])


def _read_works(path: Path) -> tuple[WorkRecord, ...]:
    try:
        return _WORKS_ADAPTER.validate_json(path.read_bytes())
    except (OSError, ValidationError) as error:
        raise DataContractError(f"invalid batch {path}: {error}") from error


def _read_labels(path: Path, teacher: Teacher) -> tuple[ClassificationRecord, ...]:
    try:
        return _LABELS_ADAPTER.validate_json(path.read_bytes())
    except (OSError, ValidationError) as error:
        raise DataContractError(f"invalid {teacher.value} labels {path}: {error}") from error


def _index_ids[T: (WorkRecord, ClassificationRecord)](
    records: tuple[T, ...], name: str
) -> dict[str, T]:
    indexed = {record.id: record for record in records}
    if len(indexed) != len(records):
        raise DataContractError(f"{name} contains duplicate work ids")
    return indexed


@overload
def load_training_corpus(paths: TrainingInputPaths) -> TrainingCorpus: ...


@overload
def load_training_corpus(
    paths: Path,
    codex_labels: Path,
    gemma_labels: Path,
    schema: Path,
) -> TrainingCorpus: ...


def load_training_corpus(
    paths: TrainingInputPaths | Path,
    codex_labels: Path | None = None,
    gemma_labels: Path | None = None,
    schema: Path | None = None,
) -> TrainingCorpus:
    if isinstance(paths, Path):
        if codex_labels is None or gemma_labels is None or schema is None:
            raise DataContractError("all training input paths are required")
        paths = TrainingInputPaths(paths, codex_labels, gemma_labels, schema)
    schema_hash = validate_schema_contract(paths.schema)
    works = _read_works(paths.batch)
    work_index = _index_ids(works, "batch")
    teacher_data: list[tuple[ClassificationRecord, ...]] = []
    for teacher, path in (
        (Teacher.CODEX, paths.codex_labels),
        (Teacher.GEMMA, paths.gemma_labels),
    ):
        labels = _read_labels(path, teacher)
        indexed = _index_ids(labels, f"{teacher.value} labels")
        missing = sorted(set(work_index) - set(indexed))
        extra = sorted(set(indexed) - set(work_index))
        if missing or extra:
            raise DataContractError(
                f"{teacher.value} id mismatch: missing {missing[:5]}, extra {extra[:5]}"
            )
        teacher_data.append(tuple(indexed[work.id] for work in works))
    codex_alias = "gpt" if paths.codex_labels.stem == "labels_gpt" else "codex"
    hashes = tuple(
        NamedHash(name, sha256_path(path))
        for name, path in (
            ("batch", paths.batch),
            ("codex_labels", paths.codex_labels),
            ("gemma_labels", paths.gemma_labels),
            ("schema", paths.schema),
        )
    )
    return TrainingCorpus(
        works=works,
        codex=teacher_data[0],
        gemma=teacher_data[1],
        teacher_aliases=(("codex", codex_alias), ("gemma", "gemma")),
        input_hashes=hashes,
        schema_hash=schema_hash,
    )


def render_work(work: WorkRecord) -> str:
    assert_payload_parity(PAYLOAD_FRAME_PARITY)
    values = {
        "title": work.title,
        "venue": work.venue,
        "topic": work.topic,
        "field": work.field,
        "lang": work.lang,
        "type": work.type,
        "year": work.year,
    }
    return render(values, PAYLOAD_FRAME_PARITY)
