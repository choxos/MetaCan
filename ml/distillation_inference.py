from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict

import numpy as np
from scipy import sparse

from ml.chunk_validation import Category
from ml.distillation_targets import BINARY_TARGETS, CATEGORICAL_TARGETS
from ml.distillation_training import DistillationBundle, TeacherBundle
from ml.prediction_policy import BinaryDecision, binary_decision, categorical_decision


class PredictionRow(TypedDict):
    id: str
    model_version: str
    candidate_categories: list[str]
    consensus_categories: list[str]
    category_scores_codex: list[float]
    category_scores_gemma: list[float]
    about_ca_system_candidate: bool
    about_ca_system_consensus: bool
    about_ca_system_score_codex: float
    about_ca_system_score_gemma: float
    about_ca_topic_candidate: bool
    about_ca_topic_consensus: bool
    about_ca_topic_score_codex: float
    about_ca_topic_score_gemma: float
    domain_scores_codex: list[float]
    domain_scores_gemma: list[float]
    domain_codex: str | None
    domain_gemma: str | None
    domain_candidate: str | None
    domain_consensus: str | None
    study_design_codex: str
    study_design_gemma: str
    study_design_scores_codex: list[float]
    study_design_scores_gemma: list[float]
    study_design_candidate: str
    study_design_consensus: str | None
    genre_codex: str
    genre_gemma: str
    genre_scores_codex: list[float]
    genre_scores_gemma: list[float]
    genre_candidate: str
    genre_consensus: str | None
    teacher_disagreement_score: float
    threshold_uncertainty_score: float
    prediction_status: str


@dataclass(frozen=True, slots=True)
class TeacherScores:
    binary: dict[str, np.ndarray]
    categorical: dict[str, np.ndarray]


def score_teacher(bundle: TeacherBundle, matrix: sparse.csr_matrix) -> TeacherScores:
    return TeacherScores(
        binary={name: model.predict_scores(matrix) for name, model in bundle.binary.items()},
        categorical={
            name: model.predict_scores(matrix)
            for name, model in bundle.categorical.items()
        },
    )


def _uncertainty(score: float, threshold: float) -> float:
    scale = threshold if score < threshold else 1.0 - threshold
    if scale <= 0:
        return 0.0
    return max(0.0, min(1.0, 1.0 - abs(score - threshold) / scale))


def _domain(value: str) -> str | None:
    return None if value == "not_metaresearch" else value


def prediction_rows(
    ids: tuple[str, ...],
    bundle: DistillationBundle,
    matrix: sparse.csr_matrix,
) -> tuple[PredictionRow, ...]:
    shape = matrix.shape
    if shape is None:
        raise RuntimeError("prediction matrix has no shape")
    if len(ids) != shape[0]:
        raise ValueError("ids and matrix must have matching rows")
    codex = score_teacher(bundle.codex, matrix)
    gemma = score_teacher(bundle.gemma, matrix)
    category_targets = BINARY_TARGETS[: len(Category)]
    output: list[PredictionRow] = []
    for row_index, work_id in enumerate(ids):
        decisions: dict[str, BinaryDecision] = {}
        for target in BINARY_TARGETS:
            decisions[target.name] = binary_decision(
                float(codex.binary[target.name][row_index]),
                float(gemma.binary[target.name][row_index]),
                bundle.codex.thresholds[target.name],
                bundle.gemma.thresholds[target.name],
            )
        candidate_categories = [
            target.category.value
            for target in category_targets
            if target.category is not None and decisions[target.name].candidate
        ]
        consensus_categories = [
            target.category.value
            for target in category_targets
            if target.category is not None and decisions[target.name].consensus
        ]
        axes = {
            target.name: categorical_decision(
                target.values,
                tuple(float(value) for value in codex.categorical[target.name][row_index]),
                tuple(float(value) for value in gemma.categorical[target.name][row_index]),
            )
            for target in CATEGORICAL_TARGETS
        }
        domain = axes["domain"]
        metaresearch = decisions["category__metaresearch"]
        disagreements = [decision.teacher_spread for decision in decisions.values()]
        disagreements.extend(axis.teacher_spread for axis in axes.values())
        uncertainties = [
            _uncertainty(float(codex.binary[target.name][row_index]), bundle.codex.thresholds[target.name])
            for target in BINARY_TARGETS
        ]
        uncertainties.extend(
            _uncertainty(float(gemma.binary[target.name][row_index]), bundle.gemma.thresholds[target.name])
            for target in BINARY_TARGETS
        )
        output.append(
            PredictionRow(
                id=work_id,
                model_version=bundle.model_version,
                candidate_categories=candidate_categories,
                consensus_categories=consensus_categories,
                category_scores_codex=[
                    float(codex.binary[target.name][row_index]) for target in category_targets
                ],
                category_scores_gemma=[
                    float(gemma.binary[target.name][row_index]) for target in category_targets
                ],
                about_ca_system_candidate=decisions["about_ca_system"].candidate,
                about_ca_system_consensus=decisions["about_ca_system"].consensus,
                about_ca_system_score_codex=float(codex.binary["about_ca_system"][row_index]),
                about_ca_system_score_gemma=float(gemma.binary["about_ca_system"][row_index]),
                about_ca_topic_candidate=decisions["about_ca_topic"].candidate,
                about_ca_topic_consensus=decisions["about_ca_topic"].consensus,
                about_ca_topic_score_codex=float(codex.binary["about_ca_topic"][row_index]),
                about_ca_topic_score_gemma=float(gemma.binary["about_ca_topic"][row_index]),
                domain_scores_codex=[float(value) for value in codex.categorical["domain"][row_index]],
                domain_scores_gemma=[float(value) for value in gemma.categorical["domain"][row_index]],
                domain_codex=_domain(domain.codex),
                domain_gemma=_domain(domain.gemma),
                domain_candidate=_domain(domain.candidate) if metaresearch.candidate else None,
                domain_consensus=(
                    _domain(domain.consensus)
                    if metaresearch.consensus and domain.consensus is not None
                    else None
                ),
                study_design_codex=axes["study_design"].codex,
                study_design_gemma=axes["study_design"].gemma,
                study_design_scores_codex=[
                    float(value) for value in codex.categorical["study_design"][row_index]
                ],
                study_design_scores_gemma=[
                    float(value) for value in gemma.categorical["study_design"][row_index]
                ],
                study_design_candidate=axes["study_design"].candidate,
                study_design_consensus=axes["study_design"].consensus,
                genre_codex=axes["genre"].codex,
                genre_gemma=axes["genre"].gemma,
                genre_scores_codex=[
                    float(value) for value in codex.categorical["genre"][row_index]
                ],
                genre_scores_gemma=[
                    float(value) for value in gemma.categorical["genre"][row_index]
                ],
                genre_candidate=axes["genre"].candidate,
                genre_consensus=axes["genre"].consensus,
                teacher_disagreement_score=max(disagreements),
                threshold_uncertainty_score=max(uncertainties),
                prediction_status="machine_predicted_unvalidated",
            )
        )
    return tuple(output)
