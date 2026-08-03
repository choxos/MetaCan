from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import sparse
from sklearn.linear_model import SGDClassifier


@dataclass(frozen=True, slots=True)
class BinaryModel:
    estimator: SGDClassifier | None
    constant: float | None
    positive_count: int
    negative_count: int

    def predict_scores(self, matrix: sparse.csr_matrix) -> np.ndarray:
        shape = matrix.shape
        if shape is None:
            raise RuntimeError("binary prediction matrix has no shape")
        if self.constant is not None:
            return np.full(shape[0], self.constant, dtype=np.float64)
        if self.estimator is None:
            raise RuntimeError("binary model has neither an estimator nor a constant")
        probabilities = self.estimator.predict_proba(matrix)
        return np.asarray(probabilities[:, 1], dtype=np.float64)


@dataclass(frozen=True, slots=True)
class CategoricalModel:
    estimator: SGDClassifier | None
    constant: str | None
    values: tuple[str, ...]
    estimator_values: tuple[str, ...]
    class_counts: tuple[int, ...]

    def predict_scores(self, matrix: sparse.csr_matrix) -> np.ndarray:
        shape = matrix.shape
        if shape is None:
            raise RuntimeError("categorical prediction matrix has no shape")
        scores = np.zeros((shape[0], len(self.values)), dtype=np.float64)
        if self.constant is not None:
            scores[:, self.values.index(self.constant)] = 1.0
            return scores
        if self.estimator is None:
            raise RuntimeError("categorical model has neither an estimator nor a constant")
        probabilities = self.estimator.predict_proba(matrix)
        for source_index, value in enumerate(self.estimator_values):
            scores[:, self.values.index(value)] = probabilities[:, source_index]
        return scores


def _weights(weights: np.ndarray) -> np.ndarray:
    if weights.ndim != 1 or len(weights) == 0 or np.any(weights <= 0):
        raise ValueError("weights must be a positive one dimensional array")
    return np.asarray(weights / np.mean(weights), dtype=np.float64)


def _estimator(seed: int) -> SGDClassifier:
    return SGDClassifier(
        loss="log_loss",
        penalty="l2",
        alpha=1e-5,
        max_iter=2000,
        tol=1e-4,
        random_state=seed,
        average=True,
    )


def fit_binary_model(
    matrix: sparse.csr_matrix,
    labels: np.ndarray,
    weights: np.ndarray,
    seed: int,
) -> BinaryModel:
    shape = matrix.shape
    if shape is None:
        raise RuntimeError("binary training matrix has no shape")
    if labels.ndim != 1 or len(labels) != shape[0] or len(weights) != len(labels):
        raise ValueError("matrix, labels, and weights must have matching rows")
    positives = int(np.count_nonzero(labels))
    negatives = len(labels) - positives
    if positives == 0 or negatives == 0:
        return BinaryModel(None, 1.0 if positives else 0.0, positives, negatives)
    estimator = _estimator(seed)
    _ = estimator.fit(matrix, labels, sample_weight=_weights(weights))
    return BinaryModel(estimator, None, positives, negatives)


def fit_categorical_model(
    matrix: sparse.csr_matrix,
    labels: tuple[str, ...],
    values: tuple[str, ...],
    weights: np.ndarray,
    seed: int,
) -> CategoricalModel:
    shape = matrix.shape
    if shape is None:
        raise RuntimeError("categorical training matrix has no shape")
    if len(labels) != shape[0] or len(weights) != len(labels):
        raise ValueError("matrix, labels, and weights must have matching rows")
    unknown = sorted(set(labels) - set(values))
    if unknown:
        raise ValueError("unknown categorical labels: " + ", ".join(unknown))
    counts = tuple(labels.count(value) for value in values)
    observed = tuple(value for value, count in zip(values, counts, strict=True) if count)
    if len(observed) == 1:
        return CategoricalModel(None, observed[0], values, (), counts)
    estimator = _estimator(seed)
    _ = estimator.fit(matrix, np.asarray(labels), sample_weight=_weights(weights))
    return CategoricalModel(estimator, None, values, tuple(sorted(observed)), counts)
