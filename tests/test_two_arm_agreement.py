from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml import two_arm_agreement as subject


def _label(
    work_id: str,
    categories: list[str],
    *,
    design: str = "not_applicable",
    genre: str = "other",
) -> dict[str, object]:
    return {
        "id": work_id,
        "categories": categories,
        "domain": "methods" if "metaresearch" in categories else None,
        "study_design": design,
        "genre": genre,
        "about_ca_system": False,
        "about_ca_topic": False,
        "confidence": "high",
    }


def _write_fixture(tmp_path: Path) -> Path:
    round_dir = tmp_path / "round_100"
    round_dir.mkdir()
    batch = [
        {"id": "W1", "weight": 1.0, "stratum": "a"},
        {"id": "W2", "weight": 2.0, "stratum": "a"},
        {"id": "W3", "weight": 3.0, "stratum": "b"},
    ]
    codex = [
        _label("W1", ["metaresearch"]),
        _label("W2", ["bibliometrics"]),
        _label("W3", ["insufficient_payload"]),
    ]
    gemma = [
        _label("W1", ["metaresearch"]),
        _label("W2", []),
        _label("W3", ["bibliometrics"]),
    ]
    for name, value in (
        ("batch.json", batch),
        ("labels_codex.json", codex),
        ("labels_gemma.json", gemma),
    ):
        (round_dir / name).write_text(json.dumps(value), encoding="utf-8")
    return round_dir


def test_reports_exact_and_design_weighted_jaccard(tmp_path: Path) -> None:
    report = subject.build_report(_write_fixture(tmp_path))

    metaresearch = report["categories"]["metaresearch"]
    bibliometrics = report["categories"]["bibliometrics"]
    any_defined = report["categories"]["ANY_DEFINED_CATEGORY"]
    assert metaresearch["jaccard"] == 1.0
    assert bibliometrics["jaccard"] == 0.0
    assert bibliometrics["design_weighted_jaccard"] == 0.0
    assert any_defined["intersection_count"] == 1
    assert any_defined["union_count"] == 3
    assert any_defined["design_weighted_jaccard"] == pytest.approx(1 / 6)


def test_insufficient_payload_is_excluded_from_any_category(tmp_path: Path) -> None:
    report = subject.build_report(_write_fixture(tmp_path))

    any_defined = report["categories"]["ANY_DEFINED_CATEGORY"]
    insufficient = report["categories"]["insufficient_payload"]
    assert any_defined["codex_positive_count"] == 2
    assert insufficient["codex_positive_count"] == 1


def test_refuses_mismatched_label_ids(tmp_path: Path) -> None:
    round_dir = _write_fixture(tmp_path)
    gemma = json.loads((round_dir / "labels_gemma.json").read_text())
    gemma[-1]["id"] = "W99"
    (round_dir / "labels_gemma.json").write_text(json.dumps(gemma), encoding="utf-8")

    with pytest.raises(subject.AgreementInputError):
        subject.build_report(round_dir)


def test_report_has_no_opus_dependency(tmp_path: Path) -> None:
    round_dir = _write_fixture(tmp_path)
    opus = round_dir / "labels_opus.json"
    opus.write_text("not json and intentionally ignored", encoding="utf-8")

    report = subject.build_report(round_dir)

    assert report["arms"] == ["codex", "gemma"]
    assert "process agreement" in report["interpretation"].lower()
    assert "does not measure accuracy" in report["interpretation"].lower()
