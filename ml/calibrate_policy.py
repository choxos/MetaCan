#!/usr/bin/env python3
"""Prevalence-matched decision policy over the v2 encoder scores.

The v2 encoder ranks well (holdout AP beat v1 on 16 of 22 binary heads and the
top of every strong head's ranking survives title audits) but its holdout-fitted
F2 thresholds do not transfer to frame base rates: metaresearch fired on 799k
works against a design-weighted teacher-implied 80k. This module repairs the
DECISIONS without touching the model or the scores. It is quota alignment, not
probability calibration: for each teacher and each binary head, the design
weights from the 10,348-work stratified sample estimate how many frame works
that teacher would flag, and the policy hands exactly that many flags to the
best-ranked works. The resulting counts are forced to match the survey estimate
by construction; they must never be quoted as an independent measurement of
prevalence. The design-weighted sample estimates, with their intervals, remain
the only prevalence claims.

Universe discipline. The design weights cover only the 4,258,728 works that
were eligible when the sample was drawn (title present and longer than 10
characters, not labeled by an earlier loop round). The 34,390 title-ineligible
works get one deterministic rule: a missing or near-empty title IS insufficient
payload, and no other head fires. The 6,300 previously labeled works carry real
teacher labels in the loop rounds and the site's direct-label layer already
overrides predictions for them, so this policy leaves them rank-only rather
than pretend the quota estimate extends to a segment it never sampled.

Head gates. A quota is only as good as the survey estimate behind it, and for
rare heads that estimate rests on a handful of enrichment-stratum positives
(metaepi_narrow: union effective sample size about 5, one sampled work carrying
40 percent of the implied total). A teacher/head pair earns hard labels only
with at least MIN_POS sample positives and a positive-weight effective sample
size of at least MIN_ESS; a head earns hard labels only if BOTH teacher sides
pass. Everything else stays rank-only: scores remain in the artifact, the
decision columns stay empty, and the gate is recorded in the meta file.

Consensus stays AND of the two calibrated teacher decisions. The student heads
do not reproduce teacher dependence, so the derived intersection will not match
the design-weighted consensus estimate; the meta file reports that discrepancy
as a validation metric instead of hiding it by forcing the intersection.

Ties break deterministically on (score DESC, work id ASC) so the artifact is
reproducible bit for bit from the same inputs.

Run:    python3 -m ml.calibrate_policy
Reads:  data/db/frame_predictions_v2.parquet (scores, untouched)
Writes: data/db/frame_predictions_v2cal.parquet + .meta.json
        pilot/results/calibration_policy.json
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import duckdb

from ml.chunk_validation import Category
from ml.distillation_data import load_training_data
from ml.distillation_targets import BINARY_TARGETS

V2_PATH = Path("data/db/frame_predictions_v2.parquet")
WORKS_PATH = Path("data/db/works_full.parquet")
OUT_PATH = Path("data/db/frame_predictions_v2cal.parquet")
META_PATH = Path("data/db/frame_predictions_v2cal.meta.json")
REPORT_PATH = Path("pilot/results/calibration_policy.json")

SAMPLE_PATH = Path("pilot/screening/bulk/sample.json")
CODEX_PATH = Path("pilot/screening/loop/round_100/labels_gpt.json")
GEMMA_PATH = Path("pilot/screening/loop/round_100/labels_gemma.json")
LOOP_DIR = Path("pilot/screening/loop")

FRAME_ROWS = 4_299_418
COVERED_ROWS = 4_258_728  # the universe the design weights represent
TEACHERS = ("codex", "gemma")

# A teacher/head pair earns hard labels only with this much survey support.
MIN_POS = 20  # raw sample positives
MIN_ESS = 10.0  # positive-weight effective sample size

CATEGORY_NAMES = tuple(c.value for c in Category)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def prior_labeled_ids() -> set[str]:
    """Works labeled BEFORE the sample was drawn: the sampling exclusion set.

    The bulk sample itself also lives in loop round batches, but its works are
    design-covered (the weights represent them), so they are subtracted back.
    """
    from ml import labels as L

    already = set(L.load_payloads())
    for rnd in sorted(LOOP_DIR.iterdir()):
        batch = rnd / "batch.json"
        if batch.exists():
            already |= {r["id"] for r in json.loads(batch.read_text())}
    sample = {r["id"] for r in json.loads(SAMPLE_PATH.read_text())}
    return already - sample


def head_positive(label, target) -> bool:
    if target.category is not None:
        return target.category in label.categories
    return bool(getattr(label, target.name))


def survey_stats() -> dict:
    """Design-weighted rate + support diagnostics per teacher/head."""
    ds = load_training_data(SAMPLE_PATH, CODEX_PATH, GEMMA_PATH)
    weight_sum = sum(r.weight for r in ds.records)
    out = {"weight_sum": weight_sum, "n_sample": len(ds.records), "heads": {}}
    for target in BINARY_TARGETS:
        per_teacher = {}
        for tname, labels in (("codex", ds.codex_labels), ("gemma", ds.gemma_labels)):
            pos_w = [r.weight for r, l in zip(ds.records, labels) if head_positive(l, target)]
            n_pos = len(pos_w)
            wsum = sum(pos_w)
            ess = (wsum * wsum / sum(w * w for w in pos_w)) if pos_w else 0.0
            per_teacher[tname] = {
                "rate": wsum / weight_sum,
                "n_pos": n_pos,
                "ess_pos": ess,
                "top_share": (max(pos_w) / wsum) if pos_w else 0.0,
                "passes": n_pos >= MIN_POS and ess >= MIN_ESS,
            }
        per_teacher["hard"] = per_teacher["codex"]["passes"] and per_teacher["gemma"]["passes"]
        out["heads"][target.name] = per_teacher
    return out


def score_expr(target, teacher: str) -> str:
    """DuckDB expression for this teacher/head score in the v2 parquet."""
    if target.category is not None:
        idx = CATEGORY_NAMES.index(target.category.value) + 1  # 1-indexed lists
        return f"category_scores_{teacher}[{idx}]"
    return f"{target.name}_score_{teacher}"


def main() -> None:
    stats = survey_stats()
    prior = prior_labeled_ids()

    con = duckdb.connect()
    con.execute(f"CREATE OR REPLACE TEMP TABLE prior_ids AS SELECT unnest(?::VARCHAR[]) AS id", [sorted(prior)])
    con.execute(f"""
        CREATE OR REPLACE VIEW universe AS
        SELECT p.*,
               w.title,
               CASE
                   WHEN p.id IN (SELECT id FROM prior_ids) THEN 'prior_labeled'
                   WHEN w.title IS NULL OR length(w.title) <= 10 THEN 'title_ineligible'
                   ELSE 'covered'
               END AS segment
        FROM '{V2_PATH}' p
        JOIN '{WORKS_PATH}' w USING (id)
    """)
    seg = dict(con.execute("SELECT segment, count(*) FROM universe GROUP BY 1").fetchall())
    assert sum(seg.values()) == FRAME_ROWS, seg
    assert seg["covered"] == COVERED_ROWS, seg
    print(f"universe: {seg}")

    # Quotas and deterministic boundaries on the covered segment.
    policy: dict[str, dict] = {}
    for target in BINARY_TARGETS:
        head = stats["heads"][target.name]
        entry: dict = {"hard": head["hard"], "teachers": {}}
        for teacher in TEACHERS:
            t = head[teacher]
            k = round(t["rate"] * COVERED_ROWS)
            te: dict = {
                "rate": t["rate"],
                "n_pos": t["n_pos"],
                "ess_pos": round(t["ess_pos"], 2),
                "top_share": round(t["top_share"], 4),
                "passes": t["passes"],
                "k": k,
            }
            if head["hard"] and k > 0:
                expr = score_expr(target, teacher)
                boundary = con.execute(f"""
                    SELECT {expr} AS s, id FROM universe
                    WHERE segment = 'covered'
                    ORDER BY s DESC, id ASC
                    LIMIT 1 OFFSET {k - 1}
                """).fetchone()
                te["threshold"] = float(boundary[0])
                te["boundary_id"] = boundary[1]
            entry["teachers"][teacher] = te
        policy[target.name] = entry
        gate = "HARD" if entry["hard"] else "rank_only"
        print(
            f"  {target.name:32s} {gate:9s} "
            f"codex k={entry['teachers']['codex']['k']:>9,} ess={head['codex']['ess_pos']:>8.1f} | "
            f"gemma k={entry['teachers']['gemma']['k']:>9,} ess={head['gemma']['ess_pos']:>8.1f}"
        )

    policy_version = hashlib.sha256(
        json.dumps(
            {
                "policy": policy,
                "min_pos": MIN_POS,
                "min_ess": MIN_ESS,
                "covered_rows": COVERED_ROWS,
                "v2_sha256": sha256(V2_PATH),
            },
            sort_keys=True,
            default=str,
        ).encode()
    ).hexdigest()[:12]
    print(f"policy version: {policy_version}")

    # Per teacher/head decision SQL. Covered works: top-K membership with the
    # deterministic (score DESC, id ASC) tie-break. Title-ineligible works:
    # the payload rule only. Prior-labeled works: rank-only.
    def decision_sql(target, teacher: str) -> str:
        entry = policy[target.name]
        te = entry["teachers"][teacher]
        if target.category is not None and target.category is Category.INSUFFICIENT_PAYLOAD:
            payload_rule = "segment = 'title_ineligible'"
        else:
            payload_rule = "FALSE"
        if not entry["hard"] or te["k"] == 0:
            return payload_rule
        expr = score_expr(target, teacher)
        thr = te["threshold"]
        bid = te["boundary_id"].replace("'", "''")
        return (
            f"(CASE WHEN segment = 'covered' THEN "
            f"({expr} > {thr!r} OR ({expr} = {thr!r} AND id <= '{bid}')) "
            f"ELSE {payload_rule} END)"
        )

    dec = {
        (t.name, teacher): decision_sql(t, teacher)
        for t in BINARY_TARGETS
        for teacher in TEACHERS
    }

    def cat_list(kind: str) -> str:
        parts = []
        for name in CATEGORY_NAMES:
            c = dec[(f"category__{name}", "codex")]
            g = dec[(f"category__{name}", "gemma")]
            cond = f"({c} OR {g})" if kind == "candidate" else f"({c} AND {g})"
            parts.append(f"CASE WHEN {cond} THEN '{name}' END")
        return f"list_filter([{', '.join(parts)}], x -> x IS NOT NULL)"

    # threshold_uncertainty_score, recomputed against the calibrated thresholds
    # over hard heads only (same shape as ml/distillation_inference._uncertainty).
    unc_parts = []
    for target in BINARY_TARGETS:
        entry = policy[target.name]
        if not entry["hard"]:
            continue
        for teacher in TEACHERS:
            te = entry["teachers"][teacher]
            if te["k"] == 0:
                continue
            expr = score_expr(target, teacher)
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

    replacements = [
        f"{cat_list('candidate')}::VARCHAR[] AS candidate_categories",
        f"{cat_list('consensus')}::VARCHAR[] AS consensus_categories",
        f"({dec[('about_ca_system', 'codex')]} OR {dec[('about_ca_system', 'gemma')]}) AS about_ca_system_candidate",
        f"({dec[('about_ca_system', 'codex')]} AND {dec[('about_ca_system', 'gemma')]}) AS about_ca_system_consensus",
        f"({dec[('about_ca_topic', 'codex')]} OR {dec[('about_ca_topic', 'gemma')]}) AS about_ca_topic_candidate",
        f"({dec[('about_ca_topic', 'codex')]} AND {dec[('about_ca_topic', 'gemma')]}) AS about_ca_topic_consensus",
        f"({unc_expr})::FLOAT AS threshold_uncertainty_score",
        f"(model_version || '+policy-{policy_version}') AS model_version",
    ]
    con.execute(f"""
        COPY (
            SELECT * EXCLUDE (title, segment)
            REPLACE ({', '.join(replacements)})
            FROM universe
            ORDER BY id
        ) TO '{OUT_PATH}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    n_rows, n_ids = con.execute(
        f"SELECT count(*), count(DISTINCT id) FROM '{OUT_PATH}'"
    ).fetchone()
    assert n_rows == FRAME_ROWS and n_ids == FRAME_ROWS, (n_rows, n_ids)

    # Joint-table discrepancy: the derived candidate/consensus counts against
    # the design-weighted implied counts. Reported, never forced.
    validation = {}
    for target in BINARY_TARGETS:
        entry = policy[target.name]
        if target.category is not None:
            name = target.category.value
            cand, cons = con.execute(f"""
                SELECT sum(list_contains(candidate_categories, '{name}')::INT),
                       sum(list_contains(consensus_categories, '{name}')::INT)
                FROM '{OUT_PATH}'
            """).fetchone()
        else:
            cand, cons = con.execute(f"""
                SELECT sum({target.name}_candidate::INT), sum({target.name}_consensus::INT)
                FROM '{OUT_PATH}'
            """).fetchone()
        validation[target.name] = {
            "hard": entry["hard"],
            "derived_candidate": int(cand or 0),
            "derived_consensus": int(cons or 0),
        }
        print(
            f"  {target.name:32s} candidate {int(cand or 0):>9,}  consensus {int(cons or 0):>9,}"
        )

    generated = datetime.now(UTC).isoformat()
    meta = {
        "model_version": f"metacan-v2-encoder+policy-{policy_version}",
        "policy_version": policy_version,
        "generated_at_utc": generated,
        "n_predictions": n_rows,
        "source_scores": {"path": str(V2_PATH), "sha256": sha256(V2_PATH)},
        "universe": {
            "frame_rows": FRAME_ROWS,
            "covered": seg["covered"],
            "title_ineligible": seg["title_ineligible"],
            "prior_labeled": seg["prior_labeled"],
            "rules": {
                "covered": "top-K quota per teacher/head, tie-break (score DESC, id ASC)",
                "title_ineligible": "insufficient_payload only, deterministic payload rule",
                "prior_labeled": "rank-only; the direct-label layer overrides these works",
            },
        },
        "gates": {"min_pos": MIN_POS, "min_ess": MIN_ESS},
        "policy": policy,
        "validation": validation,
        "caveat": (
            "Quota alignment, not probability calibration. Decision counts are "
            "forced to match design-weighted teacher-implied estimates on the "
            "covered universe and are NOT independent prevalence measurements. "
            "Prevalence claims must come from the design-weighted sample with "
            "intervals."
        ),
        "output": {"path": str(OUT_PATH), "sha256": sha256(OUT_PATH)},
        "prediction_status": "machine_predicted_unvalidated",
    }
    META_PATH.write_text(json.dumps(meta, indent=2, default=str) + "\n")
    REPORT_PATH.write_text(
        json.dumps(
            {"generated_at_utc": generated, "survey": stats, "policy_version": policy_version,
             "policy": policy, "validation": validation},
            indent=2,
            default=str,
        )
        + "\n"
    )
    print(f"CALIBRATED POLICY COMPLETE: {n_rows:,} rows, policy {policy_version}")


if __name__ == "__main__":
    main()
