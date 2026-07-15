from __future__ import annotations

# pyright: reportUnknownMemberType=false
from typing import Protocol

import numpy as np
import pyarrow as pa
from numpy.typing import NDArray

from ml.classifier_data import TrainingCorpus
from ml.classifier_metric_types import CrossFittedThresholds
from ml.classifier_model_types import HeadKey
from ml.classifier_training import FoldAssignment


class EvaluationView(Protocol):
    @property
    def key(self) -> HeadKey: ...

    @property
    def status(self) -> str: ...

    @property
    def cross_fitted(self) -> CrossFittedThresholds | None: ...


def oof_table(
    corpus: TrainingCorpus,
    assignments: tuple[FoldAssignment, ...],
    values: dict[HeadKey, tuple[bool | None, ...]],
    scores: dict[HeadKey, NDArray[np.float64]],
    evaluations: tuple[EvaluationView, ...],
) -> pa.Table:
    columns: dict[str, list[object]] = {
        name: []
        for name in (
            "id",
            "teacher",
            "family",
            "target",
            "fold",
            "label",
            "weight",
            "score",
            "decision",
            "status",
        )
    }
    for evaluation in evaluations:
        key_scores = scores.get(evaluation.key)
        for index, work in enumerate(corpus.works):
            score = None if key_scores is None or np.isnan(key_scores[index]) else key_scores[index]
            threshold = (
                None
                if evaluation.cross_fitted is None
                else evaluation.cross_fitted.threshold_for(assignments[index].fold)
            )
            columns["id"].append(work.id)
            columns["teacher"].append(evaluation.key.teacher.value)
            columns["family"].append(evaluation.key.family.value)
            columns["target"].append(evaluation.key.target)
            columns["fold"].append(assignments[index].fold)
            columns["label"].append(values[evaluation.key][index])
            columns["weight"].append(work.weight)
            columns["score"].append(None if score is None else float(score))
            columns["decision"].append(
                None if score is None or threshold is None else bool(score >= threshold)
            )
            columns["status"].append(evaluation.status)
    return pa.table(columns)
