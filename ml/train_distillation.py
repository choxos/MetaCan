from __future__ import annotations

import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import sklearn
from scipy import sparse

from ml.chunk_validation import JSON_ADAPTER, JsonValue, LabelRecord
from ml.distillation_data import load_training_data
from ml.distillation_features import FEATURE_DIMENSIONS, N_FEATURES, frame_text, vectorizer
from ml.distillation_reporting import binary_report, categorical_report
from ml.distillation_targets import (
    BINARY_TARGETS,
    CATEGORICAL_TARGETS,
    binary_value,
    categorical_value,
)
from ml.distillation_training import DistillationBundle, fit_teacher, group_folds, out_of_fold_teacher
from ml.prediction_policy import weighted_fbeta_threshold

SAMPLE_PATH = Path("pilot/screening/bulk/sample.json")
CODEX_PATH = Path("pilot/screening/loop/round_100/labels_gpt.json")
GEMMA_PATH = Path("pilot/screening/loop/round_100/labels_gemma.json")
ARTIFACT_PATH = Path("data/db/distillation_model.joblib")
REPORT_PATH = Path("pilot/results/distillation_model.json")
HASHED_PATHS = (
    SAMPLE_PATH,
    CODEX_PATH,
    GEMMA_PATH,
    Path("docs/protocol/rubric-v3.md"),
    Path("docs/protocol/screening-schema-v3.json"),
    Path("ml/distillation_features.py"),
    Path("ml/distillation_model.py"),
    Path("ml/distillation_targets.py"),
    Path("ml/distillation_training.py"),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def model_version(hashes: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for path, value in sorted(hashes.items()):
        digest.update(path.encode("utf-8"))
        digest.update(value.encode("ascii"))
    return "codex-gemma-" + digest.hexdigest()[:12]


def teacher_report(
    labels: tuple[LabelRecord, ...],
    binary_scores: dict[str, np.ndarray],
    categorical_scores: dict[str, np.ndarray],
    weights: np.ndarray,
) -> tuple[dict[str, JsonValue], dict[str, float]]:
    binary: dict[str, JsonValue] = {}
    thresholds: dict[str, float] = {}
    for target in BINARY_TARGETS:
        outcomes = np.asarray([binary_value(label, target) for label in labels], dtype=np.bool_)
        scores = binary_scores[target.name]
        binary[target.name] = binary_report(outcomes, scores, weights)
        selected = weighted_fbeta_threshold(
            tuple(bool(value) for value in outcomes),
            tuple(float(value) for value in scores),
            tuple(float(value) for value in weights),
            beta=2.0,
        )
        thresholds[target.name] = selected.threshold
    categorical: dict[str, JsonValue] = {}
    for target in CATEGORICAL_TARGETS:
        outcomes = tuple(categorical_value(label, target) for label in labels)
        categorical[target.name] = categorical_report(
            outcomes,
            target.values,
            categorical_scores[target.name],
            weights,
        )
    return {"binary": binary, "categorical": categorical}, thresholds


def write_json(path: Path, payload: JsonValue) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    _ = temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    _ = temporary.replace(path)


def run() -> None:
    dataset = load_training_data(SAMPLE_PATH, CODEX_PATH, GEMMA_PATH)
    texts = tuple(frame_text(record.frame_record()) for record in dataset.records)
    matrix = sparse.csr_matrix(vectorizer().transform(texts))
    weights = np.asarray([record.weight for record in dataset.records], dtype=np.float64)
    groups = np.asarray([record.venue or "UNKNOWN_VENUE" for record in dataset.records])
    folds = group_folds(groups, n_splits=5)

    shape = matrix.shape
    if shape is None:
        raise RuntimeError("training matrix has no shape")
    print(f"training rows: {len(dataset.records):,}; features: {shape[1]:,}", flush=True)
    print("out of fold Codex models", flush=True)
    codex_oof = out_of_fold_teacher(matrix, dataset.codex_labels, weights, folds, seed=20260715)
    print("out of fold Gemma models", flush=True)
    gemma_oof = out_of_fold_teacher(matrix, dataset.gemma_labels, weights, folds, seed=20261715)
    codex_report, codex_thresholds = teacher_report(
        dataset.codex_labels, codex_oof.binary, codex_oof.categorical, weights
    )
    gemma_report, gemma_thresholds = teacher_report(
        dataset.gemma_labels, gemma_oof.binary, gemma_oof.categorical, weights
    )

    hashes = {str(path): sha256(path) for path in HASHED_PATHS}
    version = model_version(hashes)
    print("fitting final Codex models", flush=True)
    codex = fit_teacher(matrix, dataset.codex_labels, weights, 20262715, codex_thresholds)
    print("fitting final Gemma models", flush=True)
    gemma = fit_teacher(matrix, dataset.gemma_labels, weights, 20263715, gemma_thresholds)
    bundle = DistillationBundle(version, codex, gemma)
    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = ARTIFACT_PATH.with_suffix(ARTIFACT_PATH.suffix + ".tmp")
    _ = joblib.dump(bundle, temporary, compress=3)
    _ = temporary.replace(ARTIFACT_PATH)

    payload = JSON_ADAPTER.validate_python({
        "model_version": version,
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "purpose": "full_frame_teacher_distillation",
        "training_rows": len(dataset.records),
        "teachers": {"codex": "gpt-5.6-luna", "gemma": "gemma-4-31b-it"},
        "evaluation": {
            "split": "five_fold_grouped_by_venue",
            "weights": "inverse_selection_probability_design_weights",
            "codex": codex_report,
            "gemma": gemma_report,
        },
        "feature_contract": {
            "included": ["title", "venue", "topic", "field", "lang", "type", "year"],
            "excluded": ["abstract"],
            "reason": "abstract text is unavailable across the full frame",
            "representation": "stateless_word_and_character_hashing",
            "features_per_channel": N_FEATURES,
            "total_features": FEATURE_DIMENSIONS,
        },
        "decision_policy": {
            "binary_candidate": "positive_for_either_teacher_head_at_its_design_weighted_f2_threshold",
            "binary_consensus": "positive_for_both_teacher_heads_at_their_design_weighted_f2_thresholds",
            "categorical_candidate": "highest_mean_teacher_score",
            "categorical_consensus": "reported_only_when_both_teacher_heads_select_the_same_value",
        },
        "claims_not_supported": [
            "accuracy against human judgments",
            "frame calibrated probabilities",
            "criterion validity",
            "equivalence between direct model labels and distilled predictions",
        ],
        "prediction_status": "machine_predicted_unvalidated",
        "inputs": hashes,
        "artifact": {"path": str(ARTIFACT_PATH), "sha256": sha256(ARTIFACT_PATH)},
        "software": {
            "python": sys.version.split()[0],
            "numpy": np.__version__,
            "scikit_learn": sklearn.__version__,
            "joblib": joblib.__version__,
        },
    })
    write_json(REPORT_PATH, payload)
    print(f"wrote {ARTIFACT_PATH} and {REPORT_PATH}", flush=True)


if __name__ == "__main__":
    run()
