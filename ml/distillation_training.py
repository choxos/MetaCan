from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import sparse
from sklearn.model_selection import GroupKFold

from ml.chunk_validation import LabelRecord
from ml.distillation_model import (
    BinaryModel,
    CategoricalModel,
    fit_binary_model,
    fit_categorical_model,
)
from ml.distillation_targets import (
    BINARY_TARGETS,
    CATEGORICAL_TARGETS,
    binary_value,
    categorical_value,
)


@dataclass(frozen=True, slots=True)
class TeacherBundle:
    binary: dict[str, BinaryModel]
    categorical: dict[str, CategoricalModel]
    thresholds: dict[str, float]


@dataclass(frozen=True, slots=True)
class DistillationBundle:
    model_version: str
    codex: TeacherBundle
    gemma: TeacherBundle


@dataclass(frozen=True, slots=True)
class TeacherOof:
    binary: dict[str, np.ndarray]
    categorical: dict[str, np.ndarray]


def group_folds(groups: np.ndarray, n_splits: int) -> tuple[tuple[np.ndarray, np.ndarray], ...]:
    if groups.ndim != 1 or len(set(str(value) for value in groups)) < n_splits:
        raise ValueError("groups must be one dimensional with at least n_splits unique values")
    splitter = GroupKFold(n_splits=n_splits)
    indices = np.arange(len(groups))
    return tuple((train, test) for train, test in splitter.split(indices, groups=groups))


def fit_teacher(
    matrix: sparse.csr_matrix,
    labels: tuple[LabelRecord, ...],
    weights: np.ndarray,
    seed: int,
    thresholds: dict[str, float] | None = None,
) -> TeacherBundle:
    shape = matrix.shape
    if shape is None:
        raise RuntimeError("teacher training matrix has no shape")
    if shape[0] != len(labels):
        raise ValueError("matrix and labels must have matching rows")
    binary: dict[str, BinaryModel] = {}
    for index, target in enumerate(BINARY_TARGETS):
        outcomes = np.asarray([binary_value(label, target) for label in labels], dtype=np.bool_)
        binary[target.name] = fit_binary_model(matrix, outcomes, weights, seed + index)
    categorical: dict[str, CategoricalModel] = {}
    for index, target in enumerate(CATEGORICAL_TARGETS):
        outcomes = tuple(categorical_value(label, target) for label in labels)
        categorical[target.name] = fit_categorical_model(
            matrix,
            outcomes,
            target.values,
            weights,
            seed + len(BINARY_TARGETS) + index,
        )
    return TeacherBundle(binary, categorical, thresholds or {})


def out_of_fold_teacher(
    matrix: sparse.csr_matrix,
    labels: tuple[LabelRecord, ...],
    weights: np.ndarray,
    folds: tuple[tuple[np.ndarray, np.ndarray], ...],
    seed: int,
) -> TeacherOof:
    binary = {
        target.name: np.zeros(len(labels), dtype=np.float64)
        for target in BINARY_TARGETS
    }
    categorical = {
        target.name: np.zeros((len(labels), len(target.values)), dtype=np.float64)
        for target in CATEGORICAL_TARGETS
    }
    for fold_index, (train, test) in enumerate(folds):
        train_labels = tuple(labels[int(index)] for index in train)
        fitted = fit_teacher(
            matrix[train],
            train_labels,
            weights[train],
            seed + fold_index * 100,
        )
        for target in BINARY_TARGETS:
            binary[target.name][test] = fitted.binary[target.name].predict_scores(matrix[test])
        for target in CATEGORICAL_TARGETS:
            categorical[target.name][test] = fitted.categorical[target.name].predict_scores(matrix[test])
    return TeacherOof(binary, categorical)
