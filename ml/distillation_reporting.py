from __future__ import annotations

import numpy as np
from sklearn.metrics import average_precision_score

from ml.chunk_validation import JsonValue
from ml.prediction_policy import weighted_fbeta_threshold


def binary_report(
    labels: np.ndarray,
    scores: np.ndarray,
    weights: np.ndarray,
) -> dict[str, JsonValue]:
    if labels.ndim != 1 or scores.shape != labels.shape or weights.shape != labels.shape:
        raise ValueError("labels, scores, and weights must be matching one dimensional arrays")
    threshold = weighted_fbeta_threshold(
        tuple(bool(value) for value in labels),
        tuple(float(value) for value in scores),
        tuple(float(value) for value in weights),
        beta=2.0,
    )
    positive_count = int(np.count_nonzero(labels))
    unweighted_ap = float(average_precision_score(labels, scores)) if positive_count else None
    weighted_ap = (
        float(average_precision_score(labels, scores, sample_weight=weights))
        if positive_count
        else None
    )
    return {
        "metric_scope": "out_of_fold_teacher_fidelity",
        "sample_positive_count": positive_count,
        "design_weighted_prevalence": float(np.average(labels, weights=weights)),
        "average_precision_unweighted": unweighted_ap,
        "average_precision_design_weighted": weighted_ap,
        "threshold_policy": "maximize_design_weighted_f2",
        "threshold": threshold.threshold,
        "weighted_f2": threshold.weighted_fbeta,
        "weighted_precision_at_threshold": threshold.weighted_precision,
        "weighted_recall_at_threshold": threshold.weighted_recall,
    }


def categorical_report(
    labels: tuple[str, ...],
    values: tuple[str, ...],
    scores: np.ndarray,
    weights: np.ndarray,
) -> dict[str, JsonValue]:
    if scores.shape != (len(labels), len(values)) or len(weights) != len(labels):
        raise ValueError("categorical labels, scores, and weights must have matching rows")
    expected = np.asarray([values.index(label) for label in labels])
    predicted = np.argmax(scores, axis=1)
    exact = predicted == expected
    return {
        "metric_scope": "out_of_fold_teacher_fidelity",
        "weighted_exact_agreement": float(np.average(exact, weights=weights)),
        "unweighted_exact_agreement": float(np.mean(exact)),
        "class_counts": {value: labels.count(value) for value in values},
    }
