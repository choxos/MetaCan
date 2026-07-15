from __future__ import annotations

import math

from ml.classifier_metric_types import (
    CombinedDecision,
    CrossFittedThresholds,
    SupportSummary,
    ThresholdSelection,
    ThresholdSeries,
    WeightedMetrics,
    combine_teacher_decisions,
    summarize_support,
)

__all__ = [
    "CombinedDecision",
    "CrossFittedThresholds",
    "SupportSummary",
    "ThresholdSelection",
    "ThresholdSeries",
    "WeightedMetrics",
    "combine_teacher_decisions",
    "cross_fitted_threshold",
    "select_threshold",
    "summarize_support",
    "weighted_metrics",
]


def _ranking_metrics(
    labels: tuple[bool, ...], scores: tuple[float, ...], weights: tuple[float, ...]
) -> tuple[float | None, float | None]:
    positive_weight = sum(weight for label, weight in zip(labels, weights, strict=True) if label)
    negative_weight = sum(
        weight for label, weight in zip(labels, weights, strict=True) if not label
    )
    if positive_weight == 0:
        average_precision = None
    else:
        ranked = sorted(
            zip(scores, labels, weights, strict=True), key=lambda item: item[0], reverse=True
        )
        cumulative_positive = 0.0
        cumulative_total = 0.0
        contribution = 0.0
        index = 0
        while index < len(ranked):
            score = ranked[index][0]
            group_positive = 0.0
            group_total = 0.0
            while index < len(ranked) and ranked[index][0] == score:
                _, label, weight = ranked[index]
                group_total += weight
                if label:
                    group_positive += weight
                index += 1
            cumulative_positive += group_positive
            cumulative_total += group_total
            contribution += group_positive * cumulative_positive / cumulative_total
        average_precision = contribution / positive_weight
    if positive_weight == 0 or negative_weight == 0:
        roc_auc = None
    else:
        ranked = sorted(zip(scores, labels, weights, strict=True), key=lambda item: item[0])
        cumulative_negative = 0.0
        favorable = 0.0
        index = 0
        while index < len(ranked):
            score = ranked[index][0]
            group_positive = 0.0
            group_negative = 0.0
            while index < len(ranked) and ranked[index][0] == score:
                _, label, weight = ranked[index]
                if label:
                    group_positive += weight
                else:
                    group_negative += weight
                index += 1
            favorable += group_positive * (cumulative_negative + 0.5 * group_negative)
            cumulative_negative += group_negative
        roc_auc = favorable / (positive_weight * negative_weight)
    return average_precision, roc_auc


def weighted_metrics(
    labels: tuple[bool, ...],
    decisions: tuple[bool, ...],
    weights: tuple[float, ...],
    scores: tuple[float, ...] | None = None,
) -> WeightedMetrics:
    if not labels or len(labels) != len(decisions) or len(labels) != len(weights):
        raise ValueError("labels, decisions, and weights must have equal nonzero lengths")
    true_positive = false_positive = false_negative = true_negative = 0.0
    for label, decision, weight in zip(labels, decisions, weights, strict=True):
        if not math.isfinite(weight) or weight <= 0:
            raise ValueError("weights must be finite and positive")
        if label and decision:
            true_positive += weight
        elif not label and decision:
            false_positive += weight
        elif label:
            false_negative += weight
        else:
            true_negative += weight
    precision_denominator = true_positive + false_positive
    recall_denominator = true_positive + false_negative
    precision = true_positive / precision_denominator if precision_denominator else 0.0
    recall = true_positive / recall_denominator if recall_denominator else 0.0
    f2_denominator = 4.0 * precision + recall
    f2 = 5.0 * precision * recall / f2_denominator if f2_denominator else 0.0
    ranking = (None, None) if scores is None else _ranking_metrics(labels, scores, weights)
    return WeightedMetrics(
        true_positive,
        false_positive,
        false_negative,
        true_negative,
        precision,
        recall,
        f2,
        ranking[0],
        ranking[1],
    )


def _metrics_from_counts(
    true_positive: float,
    false_positive: float,
    false_negative: float,
    true_negative: float,
    ranking: tuple[float | None, float | None],
) -> WeightedMetrics:
    precision_denominator = true_positive + false_positive
    recall_denominator = true_positive + false_negative
    precision = true_positive / precision_denominator if precision_denominator else 0.0
    recall = true_positive / recall_denominator if recall_denominator else 0.0
    f2_denominator = 4.0 * precision + recall
    f2 = 5.0 * precision * recall / f2_denominator if f2_denominator else 0.0
    return WeightedMetrics(
        true_positive,
        false_positive,
        false_negative,
        true_negative,
        precision,
        recall,
        f2,
        ranking[0],
        ranking[1],
    )


def select_threshold(series: ThresholdSeries) -> ThresholdSelection:
    ranking = _ranking_metrics(series.labels, series.scores, series.weights)
    positive_weight = sum(
        weight
        for label, weight in zip(series.labels, series.weights, strict=True)
        if label
    )
    negative_weight = sum(series.weights) - positive_weight
    ranked = sorted(
        zip(series.scores, series.labels, series.weights, strict=True),
        key=lambda item: item[0],
        reverse=True,
    )
    true_positive = false_positive = 0.0
    best: ThresholdSelection | None = None
    index = 0
    while index < len(ranked):
        threshold = ranked[index][0]
        while index < len(ranked) and ranked[index][0] == threshold:
            _, label, weight = ranked[index]
            if label:
                true_positive += weight
            else:
                false_positive += weight
            index += 1
        metrics = _metrics_from_counts(
            true_positive,
            false_positive,
            positive_weight - true_positive,
            negative_weight - false_positive,
            ranking,
        )
        if best is None or metrics.f2 > best.metrics.f2 or (
            math.isclose(metrics.f2, best.metrics.f2, rel_tol=0.0, abs_tol=1e-15)
            and threshold < best.threshold
        ):
            best = ThresholdSelection(threshold, metrics)
    if best is None:
        raise ValueError("threshold selection requires scores")
    return best


def cross_fitted_threshold(series: ThresholdSeries) -> CrossFittedThresholds:
    if not series.folds:
        raise ValueError("cross fitting requires fold assignments")
    thresholds: list[tuple[int, float]] = []
    metrics: list[tuple[int, WeightedMetrics]] = []
    for fold in sorted(set(series.folds)):
        training = tuple(index for index, value in enumerate(series.folds) if value != fold)
        heldout = tuple(index for index, value in enumerate(series.folds) if value == fold)
        selected = select_threshold(
            ThresholdSeries(
                tuple(series.scores[index] for index in training),
                tuple(series.labels[index] for index in training),
                tuple(series.weights[index] for index in training),
            )
        )
        thresholds.append((fold, selected.threshold))
        heldout_scores = tuple(series.scores[index] for index in heldout)
        heldout_labels = tuple(series.labels[index] for index in heldout)
        heldout_weights = tuple(series.weights[index] for index in heldout)
        metrics.append(
            (
                fold,
                weighted_metrics(
                    heldout_labels,
                    tuple(score >= selected.threshold for score in heldout_scores),
                    heldout_weights,
                    heldout_scores,
                ),
            )
        )
    return CrossFittedThresholds(tuple(thresholds), tuple(metrics))
