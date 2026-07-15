from __future__ import annotations

import io
import json
import platform
import subprocess
from dataclasses import asdict, dataclass
from importlib.metadata import version
from pathlib import Path
from typing import cast

import joblib

from ml.classifier_artifacts import (
    ArtifactContractError,
    atomic_write_bytes,
    atomic_write_json,
    atomic_write_parquet,
    canonical_sha256,
    sha256_file,
    verify_file_hash,
)
from ml.classifier_data import TrainingInputPaths, load_training_corpus
from ml.classifier_feature_contract import feature_contract
from ml.classifier_metrics import SupportSummary, WeightedMetrics
from ml.classifier_model_types import ModelBundle
from ml.classifier_training_run import HeadEvaluation, fit_classifier
from ml.features import PAYLOAD_FRAME_PARITY

ARTIFACT_CONTRACT_VERSION = 1


@dataclass(frozen=True, slots=True)
class TrainConfig:
    batch: Path
    codex_labels: Path
    gemma_labels: Path
    schema: Path
    output: Path
    seed: int


@dataclass(frozen=True, slots=True)
class LoadedArtifact:
    bundle: ModelBundle
    metadata: dict[str, object]
    model_hash: str


def _git_value(*arguments: str) -> str:
    completed = subprocess.run(
        ["git", *arguments],
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def _dependencies() -> dict[str, str]:
    return {
        "python": platform.python_version(),
        **{
            package: version(package)
            for package in ("joblib", "numpy", "pyarrow", "pydantic", "scikit-learn", "scipy")
        },
    }


def _metric_dict(value: SupportSummary | WeightedMetrics) -> dict[str, object]:
    return cast(dict[str, object], asdict(value))


def _evaluation_dict(evaluation: HeadEvaluation) -> dict[str, object]:
    deployment = evaluation.deployment
    cross_fitted = evaluation.cross_fitted
    return {
        "teacher": evaluation.key.teacher.value,
        "family": evaluation.key.family.value,
        "target": evaluation.key.target,
        "status": evaluation.status,
        "support": _metric_dict(evaluation.support),
        "threshold": None if deployment is None else deployment.threshold,
        "threshold_selection_metrics": (
            None if deployment is None else _metric_dict(deployment.metrics)
        ),
        "cross_fitted_thresholds": (
            None if cross_fitted is None else dict(cross_fitted.thresholds)
        ),
        "cross_fitted_fold_metrics": (
            None
            if cross_fitted is None
            else [
                {"fold": fold, **_metric_dict(metrics)}
                for fold, metrics in cross_fitted.fold_metrics
            ]
        ),
        "warning": evaluation.warning,
    }


def _model_bytes(bundle: ModelBundle) -> bytes:
    stream = io.BytesIO()
    joblib.dump(bundle, stream, compress=3)
    return stream.getvalue()


def train_artifact(config: TrainConfig) -> dict[str, object]:
    corpus = load_training_corpus(
        TrainingInputPaths(
            config.batch,
            config.codex_labels,
            config.gemma_labels,
            config.schema,
        )
    )
    contract = feature_contract()
    feature_hash = canonical_sha256(contract)
    source_commit = _git_value("rev-parse", "HEAD")
    dependencies = _dependencies()
    version_seed = {
        "artifact_contract_version": ARTIFACT_CONTRACT_VERSION,
        "contract": contract,
        "dependencies": dependencies,
        "inputs": {item.name: item.sha256 for item in corpus.input_hashes},
        "schema": corpus.schema_hash,
        "seed": config.seed,
        "source_commit": source_commit,
    }
    classifier_version = f"metacan-v1-{canonical_sha256(version_seed)[:12]}"
    result = fit_classifier(corpus, config.seed, lambda message: print(message, flush=True))
    bundle = ModelBundle(
        classifier_version=classifier_version,
        seed=config.seed,
        feature_fields=tuple(PAYLOAD_FRAME_PARITY),
        feature_contract_hash=feature_hash,
        schema_hash=corpus.schema_hash,
        vectorizer=result.vectorizer,
        heads=result.heads,
    )
    config.output.mkdir(parents=True, exist_ok=True)
    model_path = config.output / "model.joblib"
    oof_path = config.output / "oof_predictions.parquet"
    folds_path = config.output / "folds.parquet"
    atomic_write_bytes(model_path, _model_bytes(bundle))
    atomic_write_parquet(oof_path, result.oof_predictions)
    atomic_write_parquet(folds_path, result.folds)
    dirty = bool(_git_value("status", "--porcelain", "--untracked-files=no"))
    metadata: dict[str, object] = {
        "artifact_contract_version": ARTIFACT_CONTRACT_VERSION,
        "classifier_version": classifier_version,
        "seed": config.seed,
        "source_commit": source_commit,
        "source_tree_dirty": dirty,
        "feature_contract": contract,
        "feature_contract_hash": feature_hash,
        "schema_hash": corpus.schema_hash,
        "training_records": len(corpus.works),
        "teacher_aliases": dict(corpus.teacher_aliases),
        "input_hashes": {item.name: item.sha256 for item in corpus.input_hashes},
        "dependencies": dependencies,
        "heads": [_evaluation_dict(evaluation) for evaluation in result.evaluations],
        "files": {
            model_path.name: {"sha256": sha256_file(model_path)},
            oof_path.name: {
                "sha256": sha256_file(oof_path),
                "rows": result.oof_predictions.num_rows,
            },
            folds_path.name: {
                "sha256": sha256_file(folds_path),
                "rows": result.folds.num_rows,
            },
        },
        "interpretation": (
            "Scores imitate each teacher on the enriched screening sample; they are not "
            "calibrated prevalence probabilities for the full frame."
        ),
    }
    atomic_write_json(config.output / "metadata.json", metadata)
    summary = {
        "classifier_version": classifier_version,
        "training_records": len(corpus.works),
        "available_heads": sum(
            evaluation.status == "available" for evaluation in result.evaluations
        ),
        "artifact": str(config.output),
    }
    print(json.dumps(summary, indent=2, sort_keys=True), flush=True)
    return metadata


def _mapping(value: object, name: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ArtifactContractError(f"invalid metadata field {name}")
    candidate = cast(dict[object, object], value)
    if not all(isinstance(key, str) for key in candidate):
        raise ArtifactContractError(f"invalid metadata field {name}")
    return cast(dict[str, object], candidate)


def _text(value: object, name: str) -> str:
    if not isinstance(value, str):
        raise ArtifactContractError(f"invalid metadata field {name}")
    return value


def load_artifact(path: Path) -> LoadedArtifact:
    metadata_path = path / "metadata.json"
    try:
        raw_metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ArtifactContractError("invalid classifier metadata") from error
    metadata = _mapping(raw_metadata, "root")
    files = _mapping(metadata.get("files"), "files")
    model_entry = _mapping(files.get("model.joblib"), "files.model.joblib")
    expected_hash = _text(model_entry.get("sha256"), "model sha256")
    model_path = path / "model.joblib"
    verify_file_hash(model_path, expected_hash)
    loaded = joblib.load(model_path)
    if not isinstance(loaded, ModelBundle):
        raise ArtifactContractError("model artifact has the wrong object type")
    expected = (
        (
            _text(metadata.get("classifier_version"), "classifier_version"),
            loaded.classifier_version,
        ),
        (
            _text(metadata.get("feature_contract_hash"), "feature_contract_hash"),
            loaded.feature_contract_hash,
        ),
        (_text(metadata.get("schema_hash"), "schema_hash"), loaded.schema_hash),
    )
    if any(manifest != model for manifest, model in expected):
        raise ArtifactContractError("metadata and model contracts disagree")
    return LoadedArtifact(loaded, metadata, expected_hash)
