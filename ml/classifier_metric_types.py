from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Final

MIN_CLASS_SUPPORT: Final = 25


@dataclass(frozen=True, slots=True)
class SupportSummary:
    positive: int
    negative: int
    unknown: int
    available: bool


@dataclass(frozen=True, slots=True)
class WeightedMetrics:
    true_positive: float
    false_positive: float
    false_negative: float
    true_negative: float
    precision: float
    recall: float
    f2: float
    average_precision: float | None
    roc_auc: float | None


@dataclass(frozen=True, slots=True)
class ThresholdSeries:
    scores: tuple[float, ...]
    labels: tuple[bool, ...]
    weights: tuple[float, ...]
    folds: tuple[int, ...] = ()

    def __post_init__(self) -> None:
        size = len(self.scores)
        if size == 0 or len(self.labels) != size or len(self.weights) != size:
            raise ValueError("scores, labels, and weights must have equal nonzero lengths")
        if self.folds and len(self.folds) != size:
            raise ValueError("folds must be empty or match the score length")
        if any(not math.isfinite(score) for score in self.scores):
            raise ValueError("scores must be finite")
        if any(not math.isfinite(weight) or weight <= 0 for weight in self.weights):
            raise ValueError("weights must be finite and positive")

    def without_folds(self) -> ThresholdSeries:
        return ThresholdSeries(self.scores, self.labels, self.weights)


@dataclass(frozen=True, slots=True)
class ThresholdSelection:
    threshold: float
    metrics: WeightedMetrics


@dataclass(frozen=True, slots=True)
class CrossFittedThresholds:
    thresholds: tuple[tuple[int, float], ...]
    fold_metrics: tuple[tuple[int, WeightedMetrics], ...]

    def threshold_for(self, fold: int) -> float:
        for candidate, threshold in self.thresholds:
            if candidate == fold:
                return threshold
        raise KeyError(f"unknown fold {fold}")


@dataclass(frozen=True, slots=True)
class CombinedDecision:
    candidate: bool | None
    consensus: bool | None


def summarize_support(values: tuple[bool | None, ...]) -> SupportSummary:
    positive = sum(value is True for value in values)
    negative = sum(value is False for value in values)
    unknown = sum(value is None for value in values)
    return SupportSummary(
        positive=positive,
        negative=negative,
        unknown=unknown,
        available=positive >= MIN_CLASS_SUPPORT and negative >= MIN_CLASS_SUPPORT,
    )


def combine_teacher_decisions(
    codex: bool | None, gemma: bool | None
) -> CombinedDecision:
    if codex is None or gemma is None:
        return CombinedDecision(None, None)
    return CombinedDecision(candidate=codex or gemma, consensus=codex and gemma)
