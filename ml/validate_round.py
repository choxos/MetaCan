"""Assemble and validate one teacher's labels for one loop round.

The validator is the only authority on completeness, and it checks the things whose
absence has already cost this project: SET EQUALITY against the batch (D-series: silent
inner joins drop exactly the contested records), and EVERY FIELD against
screening-schema-v3.json in both directions (D20: `tier` was validated, `genre` never was,
and 16,800 labels passed every check that ran).
"""

from __future__ import annotations

import glob
import json
import os
import sys

SCHEMA = json.load(open("docs/protocol/screening-schema-v3.json"))
PROPS = SCHEMA["items"]["properties"]
REQUIRED = SCHEMA["items"]["required"]
CAT_ENUM = set(PROPS["categories"]["items"]["enum"])
ENUMS = {k: set(v["enum"]) - {None} for k, v in PROPS.items() if "enum" in v}


def validate_record(r: dict) -> list[str]:
    errs = []
    for f in REQUIRED:
        if f not in r:
            errs.append(f"missing required field `{f}`")
    extra = set(r) - set(PROPS)
    if extra:
        errs.append(f"fields not in the schema: {sorted(extra)}")
    cats = r.get("categories")
    if not isinstance(cats, list):
        errs.append("`categories` is not an array")
    else:
        bad = [c for c in cats if c not in CAT_ENUM]
        if bad:
            errs.append(f"illegal categories: {bad}")
        if len(set(cats)) != len(cats):
            errs.append("duplicate categories")
    for f, allowed in ENUMS.items():
        if f == "categories":
            continue
        v = r.get(f)
        if v is not None and f in r and v not in allowed:
            errs.append(f"`{f}` = {v!r} not in schema enum")
    if "metaresearch" in (cats or []) and not r.get("domain"):
        errs.append("`domain` is REQUIRED when categories contains metaresearch")
    for f in ("about_ca_system", "about_ca_topic"):
        if f in r and not isinstance(r[f], bool):
            errs.append(f"`{f}` is not a boolean")
    return errs


def main(round_no: str, model: str):
    rd = f"pilot/screening/loop/round_{round_no}"
    # raw dirs use the harness's CLI name (codex/grok/opus); label files use the arm
    # name every other script indexes by (gpt/grok/opus). Two names, one mapping, HERE.
    arm = {"codex": "gpt"}.get(model, model)
    batch_ids = {r["id"] for r in json.load(open(f"{rd}/batch.json"))}
    labels = {}
    for f in sorted(glob.glob(f"{rd}/raw_{model}/chunk_*.json")):
        for r in json.load(open(f)):
            labels[r["id"]] = r

    missing = batch_ids - set(labels)
    extra = set(labels) - batch_ids
    problems = []
    if missing:
        problems.append(f"{len(missing)} batch works have NO label: {sorted(missing)[:5]}...")
    if extra:
        problems.append(f"{len(extra)} labels for works NOT in the batch (hallucinated ids): {sorted(extra)[:5]}")
    n_bad = 0
    for wid, r in labels.items():
        errs = validate_record(r)
        if errs:
            n_bad += 1
            if n_bad <= 5:
                problems.append(f"{wid}: " + "; ".join(errs))
    if n_bad > 5:
        problems.append(f"...and {n_bad - 5} more records with schema violations")

    if problems:
        print(f"[validate {round_no} {model}] FAILED:")
        for p in problems:
            print("  -", p)
        sys.exit(1)

    out = f"{rd}/labels_{arm}.json"
    with open(out, "w") as f:
        json.dump([labels[i] for i in sorted(labels)], f, indent=1)
    print(f"[validate {round_no} {model}] OK: {len(labels)} labels, set-equal to the batch, schema-clean -> {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
