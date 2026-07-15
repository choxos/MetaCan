import json
import subprocess
import sys
from importlib import import_module
from pathlib import Path


def _label(work_id: str) -> dict[str, str | bool | list[str] | None]:
    return {
        "id": work_id,
        "categories": [],
        "domain": None,
        "study_design": "observational",
        "genre": "empirical",
        "about_ca_system": False,
        "about_ca_topic": False,
        "confidence": "high",
    }


def test_cli_exposes_validate_train_apply_and_verify_commands() -> None:
    # Given
    command = [sys.executable, "-m", "ml.full_frame_classifier", "--help"]

    # When
    completed = subprocess.run(command, check=False, capture_output=True, text=True)

    # Then
    assert completed.returncode == 0
    assert all(name in completed.stdout for name in ("validate", "train", "apply", "verify"))


def test_validate_cli_uses_canonical_teacher_names(tmp_path: Path, capsys) -> None:
    # Given
    module = import_module("ml.full_frame_classifier")
    batch = tmp_path / "batch.json"
    codex = tmp_path / "labels_gpt.json"
    gemma = tmp_path / "labels_gemma.json"
    batch.write_text(json.dumps([{"id": "W1", "title": "one", "weight": 1.0}]))
    codex.write_text(json.dumps([_label("W1")]))
    gemma.write_text(json.dumps([_label("W1")]))

    # When
    status = module.main(
        [
            "validate",
            "--batch",
            str(batch),
            "--codex-labels",
            str(codex),
            "--gemma-labels",
            str(gemma),
            "--schema",
            "docs/protocol/screening-schema-v3.json",
        ]
    )

    # Then
    output = capsys.readouterr().out
    assert status == 0
    assert '"codex"' in output
    assert '"gemma"' in output
