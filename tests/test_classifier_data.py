import json
from importlib import import_module
from pathlib import Path

import pytest

SCHEMA_PATH = Path("docs/protocol/screening-schema-v3.json")


def _label(module, work_id: str, categories: tuple[str, ...]):
    return module.ClassificationRecord(
        id=work_id,
        categories=categories,
        domain="methods" if "metaresearch" in categories else None,
        study_design="observational",
        genre="empirical",
        about_ca_system=False,
        about_ca_topic=False,
        confidence="high",
    )


def test_insufficient_payload_and_missing_classifications_are_unknown() -> None:
    # Given
    module = import_module("ml.classifier_data")
    target = module.target_by_name("metaresearch")
    insufficient = _label(module, "W1", ("insufficient_payload",))

    # When
    insufficient_value = module.target_value(insufficient, target)
    missing_value = module.target_value(None, target)

    # Then
    assert insufficient_value is None
    assert missing_value is None


def test_loader_requires_exact_batch_and_teacher_id_equality(tmp_path: Path) -> None:
    # Given
    module = import_module("ml.classifier_data")
    batch = tmp_path / "batch.json"
    codex = tmp_path / "labels_gpt.json"
    gemma = tmp_path / "labels_gemma.json"
    batch.write_text(json.dumps([{"id": "W1", "title": "one", "weight": 1.0}]))
    codex.write_text(json.dumps([_label(module, "W1", ()).model_dump(mode="json")]))
    gemma.write_text(json.dumps([_label(module, "W2", ()).model_dump(mode="json")]))

    # When
    with pytest.raises(module.DataContractError, match=r"gemma.*missing.*W1.*extra.*W2"):
        module.load_training_corpus(batch, codex, gemma, SCHEMA_PATH)

    # Then
    assert codex.name == "labels_gpt.json"


def test_codex_gpt_alias_is_canonicalized_in_training_data(tmp_path: Path) -> None:
    # Given
    module = import_module("ml.classifier_data")
    batch = tmp_path / "batch.json"
    codex = tmp_path / "labels_gpt.json"
    gemma = tmp_path / "labels_gemma.json"
    rows = [{"id": "W1", "title": "one", "weight": 2.0}]
    labels = [_label(module, "W1", ()).model_dump(mode="json")]
    batch.write_text(json.dumps(rows))
    codex.write_text(json.dumps(labels))
    gemma.write_text(json.dumps(labels))

    # When
    corpus = module.load_training_corpus(batch, codex, gemma, SCHEMA_PATH)

    # Then
    assert corpus.teacher_aliases == (("codex", "gpt"), ("gemma", "gemma"))


def test_payload_text_is_inert_and_abstract_and_doi_are_excluded(tmp_path: Path) -> None:
    # Given
    module = import_module("ml.classifier_data")
    marker = tmp_path / "executed"
    work = module.WorkRecord.model_validate(
        {
            "id": "W7",
            "title": f"literal $(touch {marker})",
            "abstract": "ABSTRACT_SECRET",
            "doi": "DOI_SECRET",
            "venue": "Journal",
        }
    )

    # When
    rendered = module.render_work(work)

    # Then
    assert "$(touch" in rendered
    assert "ABSTRACT_SECRET" not in rendered
    assert "DOI_SECRET" not in rendered
    assert not marker.exists()
