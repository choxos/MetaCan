import json
from importlib import import_module
from pathlib import Path

import pytest


def test_artifact_hash_mismatch_is_rejected(tmp_path: Path) -> None:
    # Given
    module = import_module("ml.classifier_artifacts")
    artifact = tmp_path / "model.joblib"
    artifact.write_bytes(b"actual")

    # When
    with pytest.raises(module.ArtifactContractError, match="hash mismatch"):
        module.verify_file_hash(artifact, "0" * 64)

    # Then
    assert artifact.read_bytes() == b"actual"


def test_checkpoint_resume_rejects_model_contract_mismatch(tmp_path: Path) -> None:
    # Given
    artifacts = import_module("ml.classifier_artifacts")
    apply = import_module("ml.classifier_apply")
    part = tmp_path / "part-00000.parquet"
    sidecar = tmp_path / "part-00000.json"
    part.write_bytes(b"stable output")
    existing = apply.PartContract(
        version=apply.PART_CONTRACT_VERSION,
        part_name=part.name,
        offset_start=0,
        offset_end=2,
        row_count=2,
        first_id="W1",
        last_id="W2",
        input_slice_hash="a" * 64,
        ordered_ids_hash="b" * 64,
        frame_hash="c" * 64,
        model_hash="d" * 64,
        feature_contract_hash="e" * 64,
        schema_hash="f" * 64,
        output_hash=artifacts.sha256_file(part),
    )
    sidecar.write_text(existing.model_dump_json())
    expected = existing.model_copy(update={"model_hash": "9" * 64})

    # When
    with pytest.raises(apply.CheckpointContractError, match="model_hash"):
        apply.verify_checkpoint(part, sidecar, expected)

    # Then
    assert part.read_bytes() == b"stable output"


def test_partition_sizes_for_two_hundred_thousand_and_five_rows() -> None:
    # Given
    module = import_module("ml.classifier_apply")

    # When
    sizes = module.partition_sizes(200_005)

    # Then
    assert sizes == (100_000, 100_000, 5)


def test_mixed_part_inventory_is_rejected(tmp_path: Path) -> None:
    # Given
    module = import_module("ml.classifier_apply")
    (tmp_path / "part-00000.parquet").write_bytes(b"orphan")
    (tmp_path / "part-00001.json").write_text(json.dumps({"orphan": True}))

    # When
    with pytest.raises(module.CheckpointContractError, match="mixed or incomplete"):
        module.validate_part_inventory(tmp_path, expected_parts=2)

    # Then
    assert len(tuple(tmp_path.iterdir())) == 2
