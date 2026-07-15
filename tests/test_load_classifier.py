from __future__ import annotations

import pytest

from deploy.load_classifier import pg_packed_scores


def test_pg_packed_scores_uses_little_endian_uint16() -> None:
    assert pg_packed_scores([0.0, 0.5, 1.0]) == "\\x00000080ffff"


@pytest.mark.parametrize("value", [-0.01, 1.01, float("nan"), float("inf")])
def test_pg_packed_scores_rejects_invalid_probabilities(value: float) -> None:
    with pytest.raises(SystemExit, match=r"outside \[0, 1\]"):
        pg_packed_scores([value])
