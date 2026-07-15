from __future__ import annotations

import argparse
import json
import math
from collections.abc import Callable, Sequence
from pathlib import Path

from pydantic import JsonValue, TypeAdapter, ValidationError

from ml.screening_round import atomic_write_text

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ROUND = ROOT / "pilot/screening/loop/round_100"
DEFAULT_OUTPUT = ROOT / "pilot/results/round_100_two_arm_agreement.json"
_ROWS_ADAPTER = TypeAdapter(list[dict[str, JsonValue]])


class AgreementInputError(ValueError):
    pass


def _read_rows(path: Path) -> list[dict[str, JsonValue]]:
    try:
        return _ROWS_ADAPTER.validate_json(path.read_text(encoding="utf-8"))
    except (OSError, ValidationError) as error:
        raise AgreementInputError(f"invalid input: {path.name}") from error


def _index(rows: list[dict[str, JsonValue]], name: str) -> dict[str, dict[str, JsonValue]]:
    indexed: dict[str, dict[str, JsonValue]] = {}
    for row in rows:
        work_id = row.get("id")
        if not isinstance(work_id, str) or work_id in indexed:
            raise AgreementInputError(f"{name} ids must be unique strings")
        indexed[work_id] = row
    return indexed


def _categories(row: dict[str, JsonValue]) -> frozenset[str]:
    value = row.get("categories")
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise AgreementInputError("categories must be arrays of strings")
    return frozenset(str(item) for item in value)


def _weight(row: dict[str, JsonValue]) -> float:
    value = row.get("weight")
    if not isinstance(value, (int, float)):
        raise AgreementInputError("batch weight must be numeric")
    weight = float(value)
    if not math.isfinite(weight) or weight <= 0:
        raise AgreementInputError("batch weight must be finite and positive")
    return weight


def _set_agreement(
    codex: set[str],
    gemma: set[str],
    weights: dict[str, float],
) -> dict[str, JsonValue]:
    intersection = codex & gemma
    union = codex | gemma
    weighted_intersection = sum(weights[work_id] for work_id in intersection)
    weighted_union = sum(weights[work_id] for work_id in union)
    return {
        "codex_positive_count": len(codex),
        "design_weighted_jaccard": (
            weighted_intersection / weighted_union if weighted_union else 1.0
        ),
        "gemma_positive_count": len(gemma),
        "intersection_count": len(intersection),
        "jaccard": len(intersection) / len(union) if union else 1.0,
        "union_count": len(union),
    }


def _field_agreement(
    ids: list[str],
    codex: dict[str, dict[str, JsonValue]],
    gemma: dict[str, dict[str, JsonValue]],
    weights: dict[str, float],
    extractor: Callable[[dict[str, JsonValue]], object],
) -> dict[str, JsonValue]:
    matching = [
        work_id for work_id in ids if extractor(codex[work_id]) == extractor(gemma[work_id])
    ]
    total_weight = sum(weights.values())
    matching_weight = sum(weights[work_id] for work_id in matching)
    return {
        "agreement_count": len(matching),
        "agreement_rate": len(matching) / len(ids),
        "design_weighted_agreement_rate": matching_weight / total_weight,
        "records": len(ids),
    }


def _category_vocabulary(round_dir: Path) -> tuple[str, ...]:
    schema_path = ROOT / "docs/protocol/screening-schema-v3.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    values = schema["items"]["properties"]["categories"]["items"]["enum"]
    return tuple(str(value) for value in values)


def build_report(round_dir: Path) -> dict[str, JsonValue]:
    batch_rows = _read_rows(round_dir / "batch.json")
    codex_rows = _read_rows(round_dir / "labels_codex.json")
    gemma_rows = _read_rows(round_dir / "labels_gemma.json")
    batch = _index(batch_rows, "batch")
    codex = _index(codex_rows, "codex")
    gemma = _index(gemma_rows, "gemma")
    if set(batch) != set(codex) or set(batch) != set(gemma):
        raise AgreementInputError("batch and teacher ids must be set equal")
    ids = list(batch)
    weights = {work_id: _weight(batch[work_id]) for work_id in ids}
    codex_categories = {work_id: _categories(codex[work_id]) for work_id in ids}
    gemma_categories = {work_id: _categories(gemma[work_id]) for work_id in ids}
    vocabulary = _category_vocabulary(round_dir)
    category_results: dict[str, JsonValue] = {}
    for category in vocabulary:
        codex_set = {work_id for work_id in ids if category in codex_categories[work_id]}
        gemma_set = {work_id for work_id in ids if category in gemma_categories[work_id]}
        category_results[category] = _set_agreement(codex_set, gemma_set, weights)
    excluded = "insufficient_payload"
    codex_any = {work_id for work_id in ids if codex_categories[work_id] - {excluded}}
    gemma_any = {work_id for work_id in ids if gemma_categories[work_id] - {excluded}}
    category_results["ANY_DEFINED_CATEGORY"] = _set_agreement(codex_any, gemma_any, weights)
    strata: dict[str, JsonValue] = {}
    for value in sorted({str(batch[work_id].get("stratum")) for work_id in ids}):
        stratum_ids = {work_id for work_id in ids if str(batch[work_id].get("stratum")) == value}
        strata[value] = _set_agreement(
            codex_any & stratum_ids,
            gemma_any & stratum_ids,
            weights,
        )
    return {
        "arms": ["codex", "gemma"],
        "categories": category_results,
        "exact_category_set_agreement": _field_agreement(ids, codex, gemma, weights, _categories),
        "genre_agreement": _field_agreement(
            ids, codex, gemma, weights, lambda row: row.get("genre")
        ),
        "interpretation": (
            "This descriptive report measures process agreement between Codex and Gemma. "
            "It does not measure accuracy or establish scientific truth."
        ),
        "records": len(ids),
        "strata_any_defined_category": strata,
        "study_design_agreement": _field_agreement(
            ids, codex, gemma, weights, lambda row: row.get("study_design")
        ),
    }


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Describe Codex and Gemma agreement")
    parser.add_argument("--round-dir", type=Path, default=DEFAULT_ROUND)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(argv)
    report = build_report(args.round_dir)
    atomic_write_text(args.output, json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
