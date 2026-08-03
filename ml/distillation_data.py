from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import ClassVar, Final, override

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from ml.chunk_validation import LABELS_ADAPTER, LabelRecord, WorkId
from ml.distillation_features import FrameRecord


class SampleRecord(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore", frozen=True)

    id: WorkId = Field(pattern=r"^W\d+$")
    title: str | None = None
    venue: str | None = None
    topic: str | None = None
    field: str | None = None
    lang: str | None = None
    type: str | None = None
    year: int | None = None
    stratum: str
    weight: float = Field(gt=0)

    def frame_record(self) -> FrameRecord:
        return FrameRecord(
            title=self.title,
            venue=self.venue,
            topic=self.topic,
            field=self.field,
            lang=self.lang,
            type=self.type,
            year=self.year,
        )


@dataclass(frozen=True, slots=True)
class TrainingDataset:
    records: tuple[SampleRecord, ...]
    codex_labels: tuple[LabelRecord, ...]
    gemma_labels: tuple[LabelRecord, ...]


@dataclass(frozen=True, slots=True)
class LabelSetMismatchError(Exception):
    model: str
    missing: tuple[str, ...]
    unexpected: tuple[str, ...]
    duplicates: tuple[str, ...]

    @override
    def __str__(self) -> str:
        return (
            f"{self.model} labels do not match sample ids: "
            f"{len(self.missing)} missing, {len(self.unexpected)} unexpected, "
            f"{len(self.duplicates)} duplicated"
        )


SAMPLE_ADAPTER: Final[TypeAdapter[tuple[SampleRecord, ...]]] = TypeAdapter(tuple[SampleRecord, ...])


def _duplicates(ids: tuple[str, ...]) -> tuple[str, ...]:
    counts: dict[str, int] = {}
    for work_id in ids:
        counts[work_id] = counts.get(work_id, 0) + 1
    return tuple(sorted(work_id for work_id, count in counts.items() if count > 1))


def _ordered_labels(
    path: Path,
    model: str,
    ordered_ids: tuple[str, ...],
) -> tuple[LabelRecord, ...]:
    records = LABELS_ADAPTER.validate_json(path.read_text(encoding="utf-8"))
    ids = tuple(str(record.id) for record in records)
    duplicates = _duplicates(ids)
    expected = set(ordered_ids)
    actual = set(ids)
    missing = tuple(sorted(expected - actual))
    unexpected = tuple(sorted(actual - expected))
    if missing or unexpected or duplicates:
        raise LabelSetMismatchError(model, missing, unexpected, duplicates)
    by_id = {str(record.id): record for record in records}
    return tuple(by_id[work_id] for work_id in ordered_ids)


def load_training_data(sample_path: Path, codex_path: Path, gemma_path: Path) -> TrainingDataset:
    records = SAMPLE_ADAPTER.validate_json(sample_path.read_text(encoding="utf-8"))
    ordered_ids = tuple(str(record.id) for record in records)
    duplicates = _duplicates(ordered_ids)
    if duplicates:
        raise LabelSetMismatchError("sample", (), (), duplicates)
    return TrainingDataset(
        records=records,
        codex_labels=_ordered_labels(codex_path, "codex", ordered_ids),
        gemma_labels=_ordered_labels(gemma_path, "gemma", ordered_ids),
    )
