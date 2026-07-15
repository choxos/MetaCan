from __future__ import annotations

# pyright: reportUnknownMemberType=false
import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol, cast

import numpy as np
from numpy.typing import NDArray
from sklearn.model_selection import GroupKFold

from ml.classifier_data import WorkRecord, render_work
from ml.classifier_model_types import TextVectorizer
from ml.features import vectorizer

_SPACE = re.compile(r"\s+")


@dataclass(frozen=True, slots=True)
class FoldAssignment:
    work_id: str
    group: str
    fold: int


class FeatureUnionView(Protocol):
    transformer_list: Sequence[tuple[str, object]]


class VocabularyView(Protocol):
    vocabulary_: dict[str, int]


def normalize_venue(work: WorkRecord) -> str:
    if work.venue is None or not work.venue.strip():
        return f"__missing__:{work.id}"
    return _SPACE.sub(" ", work.venue.strip()).casefold()


def venue_groups(works: tuple[WorkRecord, ...]) -> tuple[str, ...]:
    return tuple(normalize_venue(work) for work in works)


def assign_folds(
    works: tuple[WorkRecord, ...], *, n_splits: int = 5
) -> tuple[FoldAssignment, ...]:
    if len(works) < n_splits:
        raise ValueError("fold assignment needs at least one record per fold")
    sorted_indices = tuple(sorted(range(len(works)), key=lambda index: works[index].id))
    groups = tuple(normalize_venue(works[index]) for index in sorted_indices)
    if len(set(groups)) < n_splits:
        raise ValueError("fold assignment needs at least one venue group per fold")
    assigned = [-1] * len(works)
    splitter = GroupKFold(n_splits=n_splits)
    placeholder = np.arange(len(sorted_indices), dtype=np.int64)
    splits = cast(
        Sequence[tuple[NDArray[np.int64], NDArray[np.int64]]],
        tuple(splitter.split(placeholder, groups=groups)),
    )
    for fold, (_, heldout) in enumerate(splits):
        for sorted_position in heldout:
            assigned[sorted_indices[int(sorted_position)]] = fold
    if any(fold < 0 for fold in assigned):
        raise RuntimeError("fold assignment is incomplete")
    return tuple(
        FoldAssignment(work.id, normalize_venue(work), assigned[index])
        for index, work in enumerate(works)
    )


def fit_fold_features(
    works: tuple[WorkRecord, ...],
    assignments: tuple[FoldAssignment, ...],
    heldout_fold: int,
) -> TextVectorizer:
    if len(works) != len(assignments):
        raise ValueError("works and fold assignments must align")
    texts = tuple(
        render_work(work)
        for work, assignment in zip(works, assignments, strict=True)
        if assignment.fold != heldout_fold
    )
    if not texts:
        raise ValueError("a fold cannot contain every record")
    fitted = cast(TextVectorizer, vectorizer())
    fitted.fit(texts)
    return fitted


def word_vocabulary(fitted: TextVectorizer) -> frozenset[str]:
    feature_union = cast(FeatureUnionView, fitted)
    for name, transformer in feature_union.transformer_list:
        if name == "word" and hasattr(transformer, "vocabulary_"):
            vocabulary = cast(VocabularyView, transformer).vocabulary_
            return frozenset(vocabulary)
    raise ValueError("word vectorizer is missing")
