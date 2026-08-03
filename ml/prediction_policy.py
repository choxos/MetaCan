from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ThresholdResult:
    threshold: float
    weighted_fbeta: float
    weighted_precision: float
    weighted_recall: float


@dataclass(frozen=True, slots=True)
class BinaryDecision:
    codex: bool
    gemma: bool
    candidate: bool
    consensus: bool
    teacher_spread: float


@dataclass(frozen=True, slots=True)
class CategoricalDecision:
    codex: str
    gemma: str
    candidate: str
    consensus: str | None
    teacher_spread: float


def _check_inputs(
    labels: Sequence[bool],
    scores: Sequence[float],
    weights: Sequence[float],
    beta: float,
) -> None:
    if not labels or len(labels) != len(scores) or len(labels) != len(weights):
        raise ValueError("labels, scores, and weights must have the same positive length")
    if not math.isfinite(beta) or beta <= 0:
        raise ValueError("beta must be finite and positive")
    if any(not math.isfinite(score) for score in scores):
        raise ValueError("scores must be finite")
    if any(not math.isfinite(weight) or weight <= 0 for weight in weights):
        raise ValueError("weights must be finite and positive")


def weighted_fbeta_threshold(
    labels: Sequence[bool],
    scores: Sequence[float],
    weights: Sequence[float],
    beta: float,
) -> ThresholdResult:
    _check_inputs(labels, scores, weights, beta)
    total_positive = sum(weight for label, weight in zip(labels, weights, strict=True) if label)
    if total_positive == 0:
        threshold = math.nextafter(max(1.0, max(scores)), math.inf)
        return ThresholdResult(threshold, 0.0, 0.0, 0.0)

    ordered = sorted(
        zip(scores, labels, weights, strict=True),
        key=lambda row: row[0],
        reverse=True,
    )
    true_positive = 0.0
    false_positive = 0.0
    beta_squared = beta * beta
    best = ThresholdResult(math.nextafter(max(scores), math.inf), 0.0, 0.0, 0.0)
    index = 0
    while index < len(ordered):
        threshold = ordered[index][0]
        while index < len(ordered) and ordered[index][0] == threshold:
            _, label, weight = ordered[index]
            if label:
                true_positive += weight
            else:
                false_positive += weight
            index += 1
        precision = true_positive / (true_positive + false_positive)
        recall = true_positive / total_positive
        denominator = beta_squared * precision + recall
        fbeta = (1 + beta_squared) * precision * recall / denominator if denominator else 0.0
        candidate = ThresholdResult(threshold, fbeta, precision, recall)
        if candidate.weighted_fbeta > best.weighted_fbeta:
            best = candidate
    return best


def binary_decision(
    codex_score: float,
    gemma_score: float,
    codex_threshold: float,
    gemma_threshold: float,
) -> BinaryDecision:
    codex = codex_score >= codex_threshold
    gemma = gemma_score >= gemma_threshold
    return BinaryDecision(
        codex=codex,
        gemma=gemma,
        candidate=codex or gemma,
        consensus=codex and gemma,
        teacher_spread=abs(codex_score - gemma_score),
    )


def categorical_decision(
    labels: Sequence[str],
    codex_scores: Sequence[float],
    gemma_scores: Sequence[float],
) -> CategoricalDecision:
    if not labels or len(labels) != len(codex_scores) or len(labels) != len(gemma_scores):
        raise ValueError("labels and both score vectors must have the same positive length")
    codex_index = max(range(len(labels)), key=lambda index: codex_scores[index])
    gemma_index = max(range(len(labels)), key=lambda index: gemma_scores[index])
    means = tuple(
        (codex_score + gemma_score) / 2
        for codex_score, gemma_score in zip(codex_scores, gemma_scores, strict=True)
    )
    candidate_index = max(range(len(labels)), key=lambda index: means[index])
    consensus = labels[codex_index] if codex_index == gemma_index else None
    return CategoricalDecision(
        codex=labels[codex_index],
        gemma=labels[gemma_index],
        candidate=labels[candidate_index],
        consensus=consensus,
        teacher_spread=max(
            abs(codex_score - gemma_score)
            for codex_score, gemma_score in zip(codex_scores, gemma_scores, strict=True)
        ),
    )
