from __future__ import annotations

# pyright: reportUnknownMemberType=false
from collections.abc import Callable
from dataclasses import dataclass
from typing import cast

import numpy as np
import pyarrow as pa
from numpy.typing import NDArray
from sklearn.linear_model import LogisticRegression

from ml.classifier_data import (
    ALL_TARGETS,
    Teacher,
    TrainingCorpus,
    render_work,
    target_value,
)
from ml.classifier_metrics import (
    CrossFittedThresholds,
    SupportSummary,
    ThresholdSelection,
    ThresholdSeries,
    cross_fitted_threshold,
    select_threshold,
    summarize_support,
)
from ml.classifier_model_types import (
    HeadKey,
    HeadState,
    ProbabilityEstimator,
    TextVectorizer,
)
from ml.classifier_oof import oof_table
from ml.classifier_training import FoldAssignment, assign_folds
from ml.features import vectorizer


@dataclass(frozen=True, slots=True)
class HeadEvaluation:
    key: HeadKey
    status: str
    support: SupportSummary
    deployment: ThresholdSelection | None
    cross_fitted: CrossFittedThresholds | None
    warning: str | None = None


@dataclass(frozen=True, slots=True)
class TrainingResult:
    vectorizer: TextVectorizer
    heads: tuple[HeadState, ...]
    evaluations: tuple[HeadEvaluation, ...]
    oof_predictions: pa.Table
    folds: pa.Table


def head_keys() -> tuple[HeadKey, ...]:
    return tuple(
        HeadKey(teacher, target.family, target.name)
        for teacher in Teacher
        for target in ALL_TARGETS
    )


def _values(corpus: TrainingCorpus, key: HeadKey) -> tuple[bool | None, ...]:
    classifications = corpus.codex if key.teacher is Teacher.CODEX else corpus.gemma
    target = next(
        target
        for target in ALL_TARGETS
        if target.family is key.family and target.name == key.target
    )
    return tuple(target_value(classification, target) for classification in classifications)


def _estimator(seed: int) -> ProbabilityEstimator:
    model = LogisticRegression(
        C=1.0,
        class_weight="balanced",
        max_iter=2_000,
        random_state=seed,
        solver="liblinear",
    )
    return cast(ProbabilityEstimator, model)


def _score_folds(
    corpus: TrainingCorpus,
    assignments: tuple[FoldAssignment, ...],
    values: dict[HeadKey, tuple[bool | None, ...]],
    supported: frozenset[HeadKey],
    seed: int,
    progress: Callable[[str], None],
) -> tuple[dict[HeadKey, NDArray[np.float64]], frozenset[HeadKey]]:
    texts = tuple(render_work(work) for work in corpus.works)
    scores = {key: np.full(len(corpus.works), np.nan, dtype=np.float64) for key in supported}
    degenerate: set[HeadKey] = set()
    for fold in sorted({assignment.fold for assignment in assignments}):
        training = tuple(i for i, assignment in enumerate(assignments) if assignment.fold != fold)
        heldout = tuple(i for i, assignment in enumerate(assignments) if assignment.fold == fold)
        fitted = cast(TextVectorizer, vectorizer())
        training_matrix = fitted.fit_transform(tuple(texts[i] for i in training))
        heldout_matrix = fitted.transform(tuple(texts[i] for i in heldout))
        for key in supported:
            known = tuple(i for i, source in enumerate(training) if values[key][source] is not None)
            labels = np.asarray([bool(values[key][training[i]]) for i in known], dtype=np.bool_)
            if len(np.unique(labels)) != 2:
                degenerate.add(key)
                continue
            weights = np.asarray(
                [corpus.works[training[i]].weight for i in known], dtype=np.float64
            )
            model = _estimator(seed + fold)
            model.fit(training_matrix[list(known)], labels, sample_weight=weights)
            probabilities = model.predict_proba(heldout_matrix)[:, 1]
            scores[key][list(heldout)] = probabilities
        progress(f"fold {fold + 1}/5 scored")
    return scores, frozenset(degenerate)


def _evaluate(
    key: HeadKey,
    values: tuple[bool | None, ...],
    scores: NDArray[np.float64] | None,
    assignments: tuple[FoldAssignment, ...],
    weights: tuple[float, ...],
    degenerate: frozenset[HeadKey],
) -> HeadEvaluation:
    support = summarize_support(values)
    if not support.available:
        return HeadEvaluation(key, "insufficient_support", support, None, None)
    if key in degenerate or scores is None or bool(np.isnan(scores).any()):
        return HeadEvaluation(
            key,
            "fold_degenerate",
            support,
            None,
            None,
            "at least one training fold contained only one known class",
        )
    known = tuple(i for i, value in enumerate(values) if value is not None)
    series = ThresholdSeries(
        tuple(float(scores[i]) for i in known),
        tuple(bool(values[i]) for i in known),
        tuple(weights[i] for i in known),
        tuple(assignments[i].fold for i in known),
    )
    return HeadEvaluation(
        key,
        "available",
        support,
        select_threshold(series.without_folds()),
        cross_fitted_threshold(series),
    )


def _fit_final(
    corpus: TrainingCorpus,
    values: dict[HeadKey, tuple[bool | None, ...]],
    evaluations: tuple[HeadEvaluation, ...],
    seed: int,
) -> tuple[TextVectorizer, tuple[HeadState, ...]]:
    fitted = cast(TextVectorizer, vectorizer())
    matrix = fitted.fit_transform(tuple(render_work(work) for work in corpus.works))
    heads: list[HeadState] = []
    for evaluation in evaluations:
        estimator: ProbabilityEstimator | None = None
        if evaluation.status == "available":
            known = tuple(i for i, value in enumerate(values[evaluation.key]) if value is not None)
            labels = np.asarray(
                [bool(values[evaluation.key][i]) for i in known], dtype=np.bool_
            )
            weights = np.asarray([corpus.works[i].weight for i in known], dtype=np.float64)
            estimator = _estimator(seed)
            estimator.fit(matrix[list(known)], labels, sample_weight=weights)
        heads.append(
            HeadState(
                key=evaluation.key,
                status=evaluation.status,
                positive=evaluation.support.positive,
                negative=evaluation.support.negative,
                unknown=evaluation.support.unknown,
                threshold=(
                    None if evaluation.deployment is None else evaluation.deployment.threshold
                ),
                estimator=estimator,
            )
        )
    return fitted, tuple(heads)


def fit_classifier(
    corpus: TrainingCorpus,
    seed: int,
    progress: Callable[[str], None] = lambda _message: None,
) -> TrainingResult:
    assignments = assign_folds(corpus.works)
    values = {key: _values(corpus, key) for key in head_keys()}
    supported = frozenset(
        key for key, target_values in values.items() if summarize_support(target_values).available
    )
    scores, degenerate = _score_folds(
        corpus, assignments, values, supported, seed, progress
    )
    weights = tuple(work.weight for work in corpus.works)
    evaluations = tuple(
        _evaluate(key, values[key], scores.get(key), assignments, weights, degenerate)
        for key in head_keys()
    )
    fitted, heads = _fit_final(corpus, values, evaluations, seed)
    folds = pa.table(
        {
            "id": [assignment.work_id for assignment in assignments],
            "venue_group": [assignment.group for assignment in assignments],
            "fold": [assignment.fold for assignment in assignments],
        }
    )
    return TrainingResult(
        fitted,
        heads,
        evaluations,
        oof_table(corpus, assignments, values, scores, evaluations),
        folds,
    )
