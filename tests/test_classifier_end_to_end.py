import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from ml.classifier_apply import CheckpointContractError
from ml.classifier_inference import (
    ApplyConfig,
    VerifyConfig,
    apply_artifact,
    verify_application,
)
from ml.classifier_model import TrainConfig, train_artifact


def _label(work_id: str, positive: bool) -> dict[str, object]:
    return {
        "id": work_id,
        "categories": ["metaresearch"] if positive else [],
        "domain": "methods" if positive else None,
        "study_design": "observational" if positive else "systematic_review",
        "genre": "empirical",
        "about_ca_system": False,
        "about_ca_topic": False,
        "confidence": "high",
    }


def test_train_apply_resume_verify_and_corruption_detection(tmp_path: Path) -> None:
    batch = tmp_path / "batch.json"
    codex = tmp_path / "labels_codex.json"
    gemma = tmp_path / "labels_gemma.json"
    works = [
        {
            "id": f"W{index + 1}",
            "title": (
                "reproducibility meta research methods"
                if index % 2 == 0
                else "clinical treatment outcomes"
            ),
            "venue": f"journal {index // 6}",
            "topic": "science",
            "field": "medicine",
            "lang": "en",
            "type": "article",
            "year": 2025,
            "weight": 1.0,
        }
        for index in range(60)
    ]
    labels = [_label(work["id"], index % 2 == 0) for index, work in enumerate(works)]
    batch.write_text(json.dumps(works))
    codex.write_text(json.dumps(labels))
    gemma.write_text(json.dumps(labels))
    artifact = tmp_path / "artifact"
    metadata = train_artifact(
        TrainConfig(
            batch=batch,
            codex_labels=codex,
            gemma_labels=gemma,
            schema=Path("docs/protocol/screening-schema-v3.json"),
            output=artifact,
            seed=17,
        )
    )
    frame = tmp_path / "frame.parquet"
    pq.write_table(
        pa.table(
            {
                "id": [f"W{index + 101}" for index in range(7)],
                "title": ["reproducibility research"] * 4 + ["clinical treatment"] * 3,
                "venue": ["new journal"] * 7,
                "topic": ["science"] * 7,
                "field": ["medicine"] * 7,
                "lang": ["en"] * 7,
                "type": ["article"] * 7,
                "year": [2026] * 7,
            }
        ),
        frame,
    )
    parts = tmp_path / "parts"
    output = tmp_path / "predictions.parquet"
    initial = ApplyConfig(frame, artifact, parts, output, None, False)
    first = apply_artifact(initial)
    resumed = apply_artifact(ApplyConfig(frame, artifact, parts, output, None, True))
    verified = verify_application(VerifyConfig(frame, artifact, parts, output, None))
    predictions = pq.read_table(output)

    assert metadata["classifier_version"] == first["classifier_version"]
    assert first["output_sha256"] == resumed["output_sha256"]
    assert verified["status"] == "verified"
    assert predictions.num_rows == 7
    assert predictions.column("candidate_union__metaresearch").null_count == 0
    assert predictions.column("candidate_union__bibliometrics").null_count == 7

    part = next(parts.glob("*/part-00000.parquet"))
    part.write_bytes(b"corrupt")
    with pytest.raises(CheckpointContractError, match="output hash mismatch"):
        verify_application(VerifyConfig(frame, artifact, parts, output, None))
