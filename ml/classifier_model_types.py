from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol, Self

import numpy as np
from numpy.typing import NDArray
from scipy.sparse import csr_matrix

from ml.classifier_data import TargetFamily, Teacher


class TextVectorizer(Protocol):
    def fit(self, raw_documents: Sequence[str], y: object | None = None) -> Self: ...

    def fit_transform(
        self, raw_documents: Sequence[str], y: object | None = None
    ) -> csr_matrix: ...

    def transform(self, raw_documents: Sequence[str]) -> csr_matrix: ...


class ProbabilityEstimator(Protocol):
    def fit(
        self,
        features: object,
        labels: NDArray[np.bool_],
        sample_weight: NDArray[np.float64] | None = None,
    ) -> Self: ...

    def predict_proba(self, features: object) -> NDArray[np.float64]: ...


@dataclass(frozen=True, slots=True, order=True)
class HeadKey:
    teacher: Teacher
    family: TargetFamily
    target: str

    @property
    def column(self) -> str:
        return f"score__{self.teacher.value}__{self.target}"


@dataclass(frozen=True, slots=True)
class HeadState:
    key: HeadKey
    status: str
    positive: int
    negative: int
    unknown: int
    threshold: float | None
    estimator: ProbabilityEstimator | None


@dataclass(frozen=True, slots=True)
class ModelBundle:
    classifier_version: str
    seed: int
    feature_fields: tuple[str, ...]
    feature_contract_hash: str
    schema_hash: str
    vectorizer: TextVectorizer
    heads: tuple[HeadState, ...]

    def head(self, key: HeadKey) -> HeadState:
        for head in self.heads:
            if head.key == key:
                return head
        raise KeyError(f"unknown head {key}")
