#!/usr/bin/env python3
"""Load the per-model labelling rounds into the work_label table.

Reads every pilot/screening/loop/round_*/labels_{opus,gpt,grok}.json, checks
each label against the round's batch.json (a label for a work that was never in
the round's batch is a harness bug and stops the load), and emits ONE SQL
script on stdout that upserts every row. The script is idempotent: it creates
the table if it is missing, and re-running it after a new round lands simply
upserts the new rows and rewrites the old ones with identical values.

The database lives on the VPS and is not exposed publicly, so the SQL is piped
over ssh:

    python3 deploy/load_labels.py | ssh hetzner-vps \
      'cd /var/www/metacan && psql "$(grep ^DATABASE_URL= .env | cut -d= -f2- | tr -d \")" -v ON_ERROR_STOP=1'

Rows whose work id is not in the works table are skipped with a NOTICE rather
than failing the transaction; the frame is pinned, so in practice this means a
typo in a label file, and the count of skipped rows is reported at the end.
"""

from __future__ import annotations

import glob
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROUNDS = os.path.join(REPO, "pilot", "screening", "loop", "round_*")

MODELS = ("opus", "gpt", "grok")

# The vocabulary the site facets on. A label file carrying a value outside
# these lists is a schema drift and must fail loudly, not load quietly.
CATEGORIES = {
    "metaresearch", "metaepi_narrow", "metaepi_broad", "bibliometrics",
    "sts", "scholarly_communication", "open_science", "research_integrity",
    "insufficient_payload",
}
DESIGNS = {
    "randomized_trial", "nonrandomized_trial", "observational",
    "systematic_review", "meta_analysis", "case_report", "qualitative",
    "simulation_or_modeling", "bench_or_experimental",
    "theoretical_or_conceptual", "not_applicable", "design_other",
}
CONFIDENCES = {"high", "medium", "low"}


def die(msg: str) -> None:
    print(f"load_labels: {msg}", file=sys.stderr)
    sys.exit(1)


def sql_str(v: str | None) -> str:
    if v is None:
        return "NULL"
    return "'" + v.replace("'", "''") + "'"


def sql_bool(v: bool | None) -> str:
    if v is None:
        return "NULL"
    return "TRUE" if v else "FALSE"


def sql_text_array(vals: list[str] | None) -> str:
    if vals is None:
        return "NULL"
    inner = ",".join('"' + v.replace('"', '\\"') + '"' for v in vals)
    return "'{" + inner + "}'"


def main() -> None:
    rounds = sorted(glob.glob(ROUNDS))
    if not rounds:
        die(f"no rounds found under {ROUNDS}")

    rows: dict[tuple[str, str], dict] = {}
    n_files = 0

    for rd in rounds:
        batch_path = os.path.join(rd, "batch.json")
        label_paths = [
            p for m in MODELS
            if os.path.exists(p := os.path.join(rd, f"labels_{m}.json"))
        ]
        if not label_paths:
            # round_100 style: prompts staged, no labels yet. Nothing to load.
            continue
        if not os.path.exists(batch_path):
            die(f"{rd} has label files but no batch.json; refusing to load labels with no batch to check them against")

        with open(batch_path) as f:
            batch_ids = {w["id"] for w in json.load(f)}

        for path in label_paths:
            model = os.path.basename(path)[len("labels_"):-len(".json")]
            with open(path) as f:
                labels = json.load(f)
            n_files += 1

            for r in labels:
                wid = r.get("id")
                if not wid or not wid.startswith("W"):
                    die(f"{path}: label with bad id {wid!r}")
                if wid not in batch_ids:
                    die(f"{path}: label for {wid}, which is not in {rd}/batch.json")

                cats = r.get("categories")
                if cats is not None:
                    bad = set(cats) - CATEGORIES
                    if bad:
                        die(f"{path}: {wid} carries unknown categories {sorted(bad)}")
                design = r.get("study_design")
                if design is not None and design not in DESIGNS:
                    die(f"{path}: {wid} carries unknown study_design {design!r}")
                conf = r.get("confidence")
                if conf is not None and conf not in CONFIDENCES:
                    die(f"{path}: {wid} carries unknown confidence {conf!r}")

                # Later rounds win if a (work, model) pair is ever relabelled.
                rows[(wid, model)] = {
                    "id": wid,
                    "model": model,
                    "categories": cats,
                    "domain": r.get("domain"),
                    "study_design": design,
                    "genre": r.get("genre"),
                    "about_ca_system": r.get("about_ca_system"),
                    "about_ca_topic": r.get("about_ca_topic"),
                    "confidence": conf,
                }

    if not rows:
        die("no label rows found")

    works = {wid for wid, _ in rows}
    print(
        f"load_labels: {len(rows)} (work, model) rows over {len(works)} works "
        f"from {n_files} label files in {sum(1 for r in rounds if glob.glob(os.path.join(r, 'labels_*.json')))} rounds",
        file=sys.stderr,
    )

    out = sys.stdout
    out.write("\\set ON_ERROR_STOP on\n")
    out.write("BEGIN;\n\n")
    out.write(
        """CREATE TABLE IF NOT EXISTS work_label (
  id              VARCHAR(20) REFERENCES works(id) ON DELETE CASCADE,
  model           VARCHAR(16),
  categories      TEXT[],
  domain          VARCHAR(24),
  study_design    VARCHAR(32),
  genre           VARCHAR(16),
  about_ca_system BOOLEAN,
  about_ca_topic  BOOLEAN,
  confidence      VARCHAR(8),
  PRIMARY KEY (id, model)
);

CREATE TEMP TABLE _wl_in (LIKE work_label) ON COMMIT DROP;

"""
    )

    out.write(
        "INSERT INTO _wl_in (id, model, categories, domain, study_design, genre,"
        " about_ca_system, about_ca_topic, confidence) VALUES\n"
    )
    values = []
    for key in sorted(rows):
        r = rows[key]
        values.append(
            "(" + ",".join([
                sql_str(r["id"]),
                sql_str(r["model"]),
                sql_text_array(r["categories"]),
                sql_str(r["domain"]),
                sql_str(r["study_design"]),
                sql_str(r["genre"]),
                sql_bool(r["about_ca_system"]),
                sql_bool(r["about_ca_topic"]),
                sql_str(r["confidence"]),
            ]) + ")"
        )
    out.write(",\n".join(values))
    out.write(";\n\n")

    out.write(
        """-- Rows whose work is not in the frame are reported, not silently dropped.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM _wl_in i WHERE NOT EXISTS (SELECT 1 FROM works w WHERE w.id = i.id);
  IF n > 0 THEN
    RAISE NOTICE 'load_labels: skipping % label rows whose work id is not in works', n;
  END IF;
END $$;

INSERT INTO work_label (id, model, categories, domain, study_design, genre,
                        about_ca_system, about_ca_topic, confidence)
SELECT i.id, i.model, i.categories, i.domain, i.study_design, i.genre,
       i.about_ca_system, i.about_ca_topic, i.confidence
FROM _wl_in i
WHERE EXISTS (SELECT 1 FROM works w WHERE w.id = i.id)
ON CONFLICT (id, model) DO UPDATE SET
  categories      = EXCLUDED.categories,
  domain          = EXCLUDED.domain,
  study_design    = EXCLUDED.study_design,
  genre           = EXCLUDED.genre,
  about_ca_system = EXCLUDED.about_ca_system,
  about_ca_topic  = EXCLUDED.about_ca_topic,
  confidence      = EXCLUDED.confidence;

COMMIT;

ANALYZE work_label;

SELECT count(*) AS work_label_rows, count(DISTINCT id) AS labelled_works FROM work_label;
"""
    )


if __name__ == "__main__":
    main()
