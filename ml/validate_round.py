"""Assemble and validate one teacher's labels for one loop round.

The validator is the only authority on completeness, and it checks the things whose
absence has already cost this project: SET EQUALITY against the batch (D-series: silent
inner joins drop exactly the contested records), and EVERY FIELD against
screening-schema-v3.json in both directions (D20: `tier` was validated, `genre` never was,
and 16,800 labels passed every check that ran).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from pydantic import JsonValue, TypeAdapter

from ml.screening_chunks import (
    ChunkErrorCode,
    ChunkExpectation,
    ChunkNumber,
    InvalidChunk,
    ValidatedChunk,
    ValidationIssue,
    WorkId,
    validate_chunk_text,
    validate_record_schema,
)
from ml.screening_round import atomic_write_text, load_round_contract

__all__ = [
    "ChunkErrorCode",
    "ChunkExpectation",
    "ChunkNumber",
    "InvalidChunk",
    "ValidatedChunk",
    "ValidationIssue",
    "WorkId",
    "validate_chunk_text",
    "validate_record",
    "validate_record_schema",
]

_OBJECT_ADAPTER = TypeAdapter(dict[str, JsonValue])


def validate_record(r: dict[str, JsonValue]) -> list[str]:
    return [
        f"{issue.code.value}:{issue.field_path or '<record>'}"
        for issue in validate_record_schema(r)
    ]


def main(round_no: str, model: str):
    round_dir = Path(f"pilot/screening/loop/round_{round_no}")
    contract = load_round_contract(round_dir)
    records: dict[str, dict[str, JsonValue]] = {}
    problems: list[str] = []
    for expectation in contract.expectations:
        number = int(expectation.number)
        path = round_dir / f"raw_{model}" / f"chunk_{number:03d}.json"
        if not path.is_file():
            problems.append(f"chunk {number:03d} is missing")
            continue
        result = validate_chunk_text(
            path.read_text(encoding="utf-8", errors="replace"), expectation
        )
        if isinstance(result, InvalidChunk):
            codes = ", ".join(sorted({issue.code.value for issue in result.issues}))
            problems.append(f"chunk {number:03d} is invalid: {codes}")
            continue
        for record in result.records:
            parsed = _OBJECT_ADAPTER.validate_json(record.json_text)
            records[str(record.work_id)] = parsed
    if problems:
        preview = "\n".join(f"  {problem}" for problem in problems[:20])
        raise SystemExit(f"[validate {round_no} {model}] failed\n{preview}")
    ordered: list[dict[str, JsonValue]] = []
    for batch_record in contract.batch:
        work_id = batch_record.get("id")
        if not isinstance(work_id, str) or work_id not in records:
            raise SystemExit(f"[validate {round_no} {model}] missing id {work_id}")
        ordered.append(records[work_id])
    arm = "codex" if round_no == "100" and model == "codex" else {"codex": "gpt"}.get(model, model)
    output = round_dir / f"labels_{arm}.json"
    atomic_write_text(output, json.dumps(ordered, ensure_ascii=False, indent=1) + "\n")
    print(f"[validate {round_no} {model}] OK: {len(ordered)} labels -> {output}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
