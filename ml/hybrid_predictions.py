#!/usr/bin/env python3
"""Hybrid decision layer: distilled Codex student + direct title-only Gemma.

The full-frame Gemma run replaced one HALF of the prediction problem with
measurement: every work now carries a real Gemma decision instead of a student
imitation of one. This module fuses the two surfaces the site's policy always
promised (candidate = either teacher, consensus = both) from their best
available sources:

  Codex side   the SPECTER2 student's calibrated top-K decisions from
               ml/calibrate_policy.py: quota-aligned on the design-covered
               universe, support-gated (heads without survey support
               contribute no Codex decisions).
  Gemma side   the direct frame labels from ml/assemble_gemma_frame.py.
               No gating: these are actual teacher outputs, not survey
               extrapolations. The instrument is TITLE-ONLY and is not
               interchangeable with the abstract-fed round-100 pass
               (measured on the 10,345 overlapping sample works: 90 to 99.6
               percent per-head agreement; the title-only pass overcalls
               metaresearch and undercalls abstract-dependent heads).

Consequences worth stating plainly. Rare heads that the calibration gates
silenced (metaepi_narrow, bibliometrics, sts, open_science, research_integrity,
scholarly_communication, metaepi_broad) regain candidate-level decisions from
the direct Gemma side; their consensus stays empty because no supported Codex
decision exists to agree with. Categorical fields take the direct Gemma value
as the candidate (a real teacher beats a distilled student) and reach consensus
only when the Codex student's argmax independently lands on the same value.

Everything stays machine_predicted_unvalidated: direct model labels are still
machine labels. Prevalence claims continue to come from the design-weighted
sample, never from counting these decisions.

Run:    python3 -m ml.hybrid_predictions
Reads:  data/db/frame_predictions_v2.parquet        (student scores)
        data/db/frame_predictions_v2cal.meta.json   (codex-side policy)
        data/db/gemma_frame_labels.parquet          (direct gemma)
Writes: data/db/frame_predictions_v3.parquet + .meta.json
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import duckdb

from ml.calibrate_policy import prior_labeled_ids, sha256
from ml.chunk_validation import Category
from ml.distillation_targets import BINARY_TARGETS

V2_PATH = Path("data/db/frame_predictions_v2.parquet")
POLICY_META = Path("data/db/frame_predictions_v2cal.meta.json")
GEMMA_PATH = Path("data/db/gemma_frame_labels.parquet")
WORKS_PATH = Path("data/db/works_full.parquet")
OUT_PATH = Path("data/db/frame_predictions_v3.parquet")
META_PATH = Path("data/db/frame_predictions_v3.meta.json")

FRAME_ROWS = 4_299_418
CATEGORY_NAMES = tuple(c.value for c in Category)


def score_expr(target, teacher: str) -> str:
    if target.category is not None:
        idx = CATEGORY_NAMES.index(target.category.value) + 1
        return f"category_scores_{teacher}[{idx}]"
    return f"{target.name}_score_{teacher}"


def main() -> None:
    policy_doc = json.loads(POLICY_META.read_text())
    policy = policy_doc["policy"]
    gemma_meta = json.loads(
        GEMMA_PATH.with_suffix(".meta.json").read_text()
        if GEMMA_PATH.with_suffix(".meta.json").exists()
        else Path("data/db/gemma_frame_labels.meta.json").read_text()
    )
    assert gemma_meta["n_labels"] == FRAME_ROWS, gemma_meta["n_labels"]

    prior = prior_labeled_ids()
    con = duckdb.connect()
    con.execute("CREATE OR REPLACE TEMP TABLE prior_ids AS SELECT unnest(?::VARCHAR[]) AS id", [sorted(prior)])
    con.execute(f"""
        CREATE OR REPLACE VIEW joined AS
        SELECT p.*,
               g.categories   AS g_categories,
               g.domain       AS g_domain,
               g.study_design AS g_study_design,
               g.genre        AS g_genre,
               g.about_ca_system AS g_about_ca_system,
               g.about_ca_topic  AS g_about_ca_topic,
               CASE
                   WHEN p.id IN (SELECT id FROM prior_ids) THEN 'prior_labeled'
                   WHEN w.title IS NULL OR length(w.title) <= 10 THEN 'title_ineligible'
                   ELSE 'covered'
               END AS segment
        FROM '{V2_PATH}' p
        JOIN '{GEMMA_PATH}' g USING (id)
        JOIN '{WORKS_PATH}' w USING (id)
    """)

    # Codex-side calibrated decision per binary head; the gemma side is direct.
    def codex_sql(target) -> str:
        entry = policy[target.name]
        te = entry["teachers"]["codex"]
        if not entry["hard"] or not te["passes"] or te["k"] == 0:
            return "FALSE"
        expr = score_expr(target, "codex")
        thr = te["threshold"]
        bid = te["boundary_id"].replace("'", "''")
        return (
            f"(CASE WHEN segment = 'covered' THEN "
            f"({expr} > {thr!r} OR ({expr} = {thr!r} AND id <= '{bid}')) "
            f"ELSE FALSE END)"
        )

    def gemma_sql(target) -> str:
        if target.category is not None:
            return f"list_contains(g_categories, '{target.category.value}')"
        return f"g_{target.name}"

    dec = {t.name: (codex_sql(t), gemma_sql(t)) for t in BINARY_TARGETS}

    def cat_list(kind: str) -> str:
        parts = []
        for name in CATEGORY_NAMES:
            c, g = dec[f"category__{name}"]
            cond = f"({c} OR {g})" if kind == "candidate" else f"({c} AND {g})"
            parts.append(f"CASE WHEN {cond} THEN '{name}' END")
        return f"list_filter([{', '.join(parts)}], x -> x IS NOT NULL)"

    # Disagreement: the codex student score against the direct gemma decision.
    spread_parts = [
        f"abs({score_expr(t, 'codex')} - ({gemma_sql(t)})::INT::FLOAT)" for t in BINARY_TARGETS
    ]
    # Threshold uncertainty: codex side only; the gemma side has no threshold.
    unc_parts = []
    for target in BINARY_TARGETS:
        entry = policy[target.name]
        te = entry["teachers"]["codex"]
        if not entry["hard"] or not te["passes"] or te["k"] == 0:
            continue
        expr = score_expr(target, "codex")
        thr = te["threshold"]
        unc_parts.append(
            f"greatest(0.0, least(1.0, 1.0 - abs({expr} - {thr!r}) / "
            f"(CASE WHEN {expr} < {thr!r} THEN {thr!r} ELSE 1.0 - {thr!r} END)))"
        )
    unc_expr = (
        f"CASE WHEN segment = 'covered' THEN greatest({', '.join(unc_parts)}) ELSE 0.0 END"
        if unc_parts
        else "0.0"
    )

    version_hash = hashlib.sha256(
        json.dumps(
            {
                "v2_sha256": policy_doc["source_scores"]["sha256"],
                "policy_version": policy_doc["policy_version"],
                "gemma_sha256": gemma_meta["output"]["sha256"],
            },
            sort_keys=True,
        ).encode()
    ).hexdigest()[:12]
    model_version = f"metacan-v3-hybrid-{version_hash}"
    print(f"model version: {model_version}")

    sys_c, sys_g = dec["about_ca_system"]
    top_c, top_g = dec["about_ca_topic"]
    replacements = [
        f"{cat_list('candidate')}::VARCHAR[] AS candidate_categories",
        f"{cat_list('consensus')}::VARCHAR[] AS consensus_categories",
        f"({sys_c} OR {sys_g}) AS about_ca_system_candidate",
        f"({sys_c} AND {sys_g}) AS about_ca_system_consensus",
        f"({top_c} OR {top_g}) AS about_ca_topic_candidate",
        f"({top_c} AND {top_g}) AS about_ca_topic_consensus",
        "g_domain AS domain_gemma",
        "g_domain AS domain_candidate",
        "(CASE WHEN domain_codex IS NOT DISTINCT FROM g_domain THEN g_domain END) AS domain_consensus",
        "g_study_design AS study_design_gemma",
        "g_study_design AS study_design_candidate",
        "(CASE WHEN study_design_codex = g_study_design THEN g_study_design END) AS study_design_consensus",
        "g_genre AS genre_gemma",
        "g_genre AS genre_candidate",
        "(CASE WHEN genre_codex = g_genre THEN g_genre END) AS genre_consensus",
        f"greatest({', '.join(spread_parts)})::FLOAT AS teacher_disagreement_score",
        f"({unc_expr})::FLOAT AS threshold_uncertainty_score",
        f"'{model_version}' AS model_version",
    ]
    con.execute(f"""
        COPY (
            SELECT * EXCLUDE (g_categories, g_domain, g_study_design, g_genre,
                              g_about_ca_system, g_about_ca_topic, segment)
            REPLACE ({', '.join(replacements)})
            FROM joined
            ORDER BY id
        ) TO '{OUT_PATH}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    n_rows, n_ids, n_versions = con.execute(
        f"SELECT count(*), count(DISTINCT id), count(DISTINCT model_version) FROM '{OUT_PATH}'"
    ).fetchone()
    assert n_rows == FRAME_ROWS and n_ids == FRAME_ROWS and n_versions == 1, (n_rows, n_ids, n_versions)

    validation = {}
    for name in CATEGORY_NAMES:
        cand, cons = con.execute(f"""
            SELECT sum(list_contains(candidate_categories, '{name}')::INT),
                   sum(list_contains(consensus_categories, '{name}')::INT)
            FROM '{OUT_PATH}'
        """).fetchone()
        validation[name] = {"candidate": int(cand or 0), "consensus": int(cons or 0)}
        print(f"  {name:26s} candidate {int(cand or 0):>9,}  consensus {int(cons or 0):>9,}")

    META_PATH.write_text(
        json.dumps(
            {
                "model_version": model_version,
                "generated_at_utc": datetime.now(UTC).isoformat(),
                "n_predictions": n_rows,
                "provenance": {
                    "codex": "distilled SPECTER2 student, calibrated top-K policy "
                    + policy_doc["policy_version"]
                    + ", support-gated",
                    "gemma": "direct full-frame labels, title-only instrument "
                    "(see data/db/gemma_frame_labels.meta.json)",
                },
                "sources": {
                    "student_scores": {"path": str(V2_PATH), "sha256": policy_doc["source_scores"]["sha256"]},
                    "codex_policy": {"path": str(POLICY_META), "policy_version": policy_doc["policy_version"]},
                    "gemma_labels": {"path": str(GEMMA_PATH), "sha256": gemma_meta["output"]["sha256"]},
                },
                "validation": validation,
                "output": {"path": str(OUT_PATH), "sha256": sha256(OUT_PATH)},
                "prediction_status": "machine_predicted_unvalidated",
            },
            indent=2,
        )
        + "\n"
    )
    print(f"HYBRID COMPLETE: {n_rows:,} rows, {model_version}")


if __name__ == "__main__":
    main()
