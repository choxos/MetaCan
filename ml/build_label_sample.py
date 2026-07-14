"""Build the ~10,000-work labelling sample that the frame-wide classifier trains on.

THE PROBLEM THIS SOLVES, IN ONE TABLE
-------------------------------------
After 7 loop rounds the v3.1 label store holds, per category:

    metaresearch             201
    metaepi_broad             76
    scholarly_communication   38
    sts                       30
    open_science              21
    research_integrity         9
    bibliometrics              7
    metaepi_narrow             5

You cannot train a usable classifier for `bibliometrics` on SEVEN positives. A random
sample of the frame will not fix it either: at these base rates, 10,000 random works
would hold perhaps a dozen. The rare categories are rare, and a discovery tool that
cannot find them is a tool that tells Canadian bibliometrics it does not exist.

So the sample is ENRICHED: strata built to contain the categories, plus a random
baseline that keeps the design honest.

AND THE ENRICHMENT DOES NOT DESTROY DESIGN-BASED INFERENCE, because every stratum has a
KNOWN, NONZERO inclusion probability, recorded per record. That is the same discipline
that failed once already (D22: five strata that left 12.9% of the frame with pi = 0), so
it is asserted here, on every build:

    * the strata PARTITION the frame (each work in exactly one)
    * every stratum has a nonzero sampling fraction
    * pi is written to every sampled record, and the weight is 1/pi

The enriched strata BIAS the sample on purpose. That is what enrichment is. The weights
are what let an estimate be computed anyway, and the human audit is what checks it. An
enriched sample with known probabilities is a design; an enriched sample without them is
a convenience sample wearing a lab coat.
"""

from __future__ import annotations

import json
import os
import sys

import duckdb
import numpy as np

sys.path.insert(0, ".")
from ml import labels as L

FRAME = "data/db/works_full.parquet"
SCORES = "data/db/frame_scores.parquet"
OUT = "pilot/screening/bulk/sample.json"
TARGET = 10_000

# Venue and topic signal for each category. These are RETRIEVAL for enrichment, not
# definitions: a work in Scientometrics is a candidate for the `bibliometrics` label, and
# the LLM under rubric v3.1 decides. The rubric never sees these strings. (This is the
# one place retrieval is allowed in this project, and only because it feeds a sample whose
# selection probabilities are known, not a frame whose boundary would then be a property
# of this list.)
LEX = {
    "bibliometrics": {
        "venues": ["Scientometrics", "Quantitative Science Studies", "Journal of Informetrics",
                   "Research Evaluation", "Journal of the Association for Information Science",
                   "Journal of the American Society for Information Science", "Informetrics"],
        "words": ["bibliometric", "scientometric", "citation analysis", "co-citation", "h-index",
                  "altmetric", "research impact", "citation network", "science mapping",
                  "bibliométri", "scientométri"],
    },
    "sts": {
        "venues": ["Social Studies of Science", "Science Technology & Human Values",
                   "Science as Culture", "Public Understanding of Science", "Research Policy",
                   "Minerva", "Science and Public Policy", "Engaging Science Technology and Society"],
        "words": ["science and technology studies", "sociology of science", "co-production",
                  "boundary work", "actor-network", "expertise and experience", "technoscien",
                  "history of science", "philosophy of science", "science policy"],
    },
    "research_integrity": {
        "venues": ["Accountability in Research", "Science and Engineering Ethics",
                   "Research Integrity and Peer Review", "Journal of Empirical Research on Human Research Ethics"],
        "words": ["research misconduct", "research integrity", "questionable research practice",
                  "data fabrication", "falsification", "plagiarism", "retraction",
                  "publication ethics", "authorship dispute", "predatory journal", "paper mill"],
    },
    "open_science": {
        "venues": ["Data Science Journal", "Scientific Data", "PeerJ", "F1000Research"],
        "words": ["open science", "open access", "open data", "data sharing", "code sharing",
                  "preprint", "fair data", "research transparency", "preregistration",
                  "registered report", "science ouverte", "libre accès", "données ouvertes"],
    },
    "scholarly_communication": {
        "venues": ["Learned Publishing", "Journal of Scholarly Publishing", "Scholarly Assessment Reports",
                   "College & Research Libraries", "Journal of Academic Librarianship", "portal Libraries and the Academy"],
        "words": ["scholarly communication", "peer review", "journal publishing", "editorial process",
                  "academic publishing", "institutional repository", "library", "édition savante"],
    },
    "metaresearch": {
        "venues": ["Research Integrity and Peer Review", "Systematic Reviews", "Research Synthesis Methods",
                   "Journal of Clinical Epidemiology", "BMC Medical Research Methodology", "Trials",
                   "Cochrane Database of Systematic Reviews"],
        "words": ["meta-research", "metaresearch", "meta-science", "metascience", "research on research",
                  "reporting quality", "reporting guideline", "risk of bias", "replication",
                  "reproducibility", "spin in", "selective outcome reporting", "research waste",
                  "méta-recherche", "reproductibilité"],
    },
    "metaepi": {
        "venues": ["Journal of Clinical Epidemiology", "Research Synthesis Methods", "Systematic Reviews",
                   "BMC Medical Research Methodology", "Evidence-Based Medicine"],
        "words": ["meta-epidemiolog", "méta-épidémiolog", "empirical evidence of bias",
                  "unit of analysis is a study", "study-level characteristic", "cross-sectional study of trials",
                  "sample of randomized", "methodological survey", "methodological review"],
    },
    # study design: the OTHER half of what the database must flag. These enrich the
    # design classes that are near-absent in the loop labels (randomized_trial 16,
    # case_report 3), which is exactly the flag a meta-researcher reaches for first.
    "design_trials": {
        "venues": ["Trials", "Contemporary Clinical Trials", "Clinical Trials",
                   "Journal of Clinical Oncology", "New England Journal of Medicine", "The Lancet", "JAMA", "BMJ"],
        "words": ["randomized controlled trial", "randomised controlled trial", "randomized trial",
                  "double-blind", "placebo-controlled", "phase iii", "phase ii", "cluster randomized",
                  "essai randomisé", "essai clinique"],
    },
    "design_observational": {
        "venues": ["American Journal of Epidemiology", "Epidemiology", "International Journal of Epidemiology",
                   "Canadian Journal of Public Health", "CMAJ"],
        "words": ["cohort study", "case-control", "cross-sectional study", "prospective cohort",
                  "retrospective cohort", "longitudinal study", "population-based study",
                  "étude de cohorte", "cas-témoins"],
    },
}


def sql_or(field: str, needles, like=True) -> str:
    if not needles:
        return "FALSE"
    parts = []
    for n in needles:
        esc = n.replace("'", "''")
        parts.append(f"lower({field}) LIKE '%{esc.lower()}%'" if like else f"{field} = '{esc}'")
    return "(" + " OR ".join(parts) + ")"


def main():
    con = duckdb.connect()
    already = set(L.load_payloads()) | set()
    # every work any v3.1 loop round already labelled
    loop_dir = "pilot/screening/loop"
    if os.path.isdir(loop_dir):
        for rnd in os.listdir(loop_dir):
            b = os.path.join(loop_dir, rnd, "batch.json")
            if os.path.exists(b):
                already |= {r["id"] for r in json.load(open(b))}
    print(f"excluding {len(already):,} already-labelled works")

    con.execute(f"CREATE OR REPLACE VIEW f AS SELECT * FROM '{FRAME}'")
    con.execute(f"CREATE OR REPLACE VIEW s AS SELECT * FROM '{SCORES}'")
    excl = "(" + ",".join(f"'{i}'" for i in sorted(already)) + ")" if already else "('')"

    # ---- the strata, in PRIORITY ORDER; a work lands in the FIRST it matches ----------
    # Priority order makes the strata a PARTITION (each work in exactly one), which is the
    # identity D22 was destroyed by not checking. `assigned` accumulates and every later
    # stratum excludes it.
    strata = []
    for name, lex in LEX.items():
        pred = f"({sql_or('venue', lex['venues'])} OR {sql_or('title', lex['words'])})"
        strata.append((f"enrich_{name}", pred, 900 if name in ("bibliometrics", "research_integrity", "metaepi") else 700))

    # the classifier's own high-score band: where IT thinks the field is, which is the
    # band the audit most needs coded, and the band a discovery tool most needs right
    strata.append(("classifier_top", "id IN (SELECT id FROM s WHERE score_gpt > 0.90 OR score_opus > 0.90)", 800))
    strata.append(("classifier_contested", "id IN (SELECT id FROM s WHERE score_spread > 0.35)", 600))
    strata.append(("french", "lang = 'fr'", 700))
    strata.append(("random_baseline", "TRUE", 1500))   # the honest anchor; catches everything else

    sample, assigned = [], set()
    prev_preds = []
    for name, pred, n in strata:
        not_prev = " AND ".join(f"NOT COALESCE({p}, FALSE)" for p in prev_preds) if prev_preds else "TRUE"
        where = (f"WHERE NOT (id IN {excl}) AND title IS NOT NULL AND length(title) > 10 "
                 f"AND COALESCE({pred}, FALSE) AND ({not_prev})")
        N = con.execute(f"SELECT count(*) FROM f {where}").fetchone()[0]
        if N == 0:
            print(f"  {name:26s} N=0  SKIPPED (no works match)")
            prev_preds.append(pred)
            continue
        take = min(n, N)
        # DETERMINISTIC HASH ORDER, not USING SAMPLE.
        #
        # `USING SAMPLE reservoir(n)` on a filtered view lets DuckDB push the sample
        # BELOW the filter: it drew n rows from the frame and then filtered them, so an
        # enriched stratum of 1,376 works asked for 900 and received ONE, while the log
        # printed "n=900". The sample was 1,380 works instead of 10,348 and every
        # enrichment stratum was empty. Nothing failed. The numbers looked right.
        #
        # Hash order cannot be pushed anywhere: the filter runs, then the rows are
        # ordered by a hash of their id, then the first `take` are kept. It is
        # reproducible, it is uncorrelated with the outcome, and it is the same
        # mechanism the project's original probability sample used.
        rows = con.execute(f"""
            SELECT id, doi, title, venue, topic, field, lang, type, year
            FROM f {where}
            ORDER BY hash(id || 'metacan-bulk-20261027')
            LIMIT {take}
        """).fetchall()
        # THE ASSERTION THAT WOULD HAVE CAUGHT IT: the stratum must deliver what it
        # promised, or the promise was a lie the log told in a confident voice.
        assert len(rows) == take, (
            f"stratum {name}: asked for {take} of {N:,}, received {len(rows)}. "
            f"The sampler is not sampling what the WHERE clause selected.")
        pi = take / N                       # KNOWN inclusion probability, per stratum
        for r in rows:
            rec = dict(zip(["id", "doi", "title", "venue", "topic", "field", "lang", "type", "year"], r))
            rec["stratum"] = name
            rec["pi"] = round(pi, 8)
            rec["weight"] = round(1 / pi, 4)
            sample.append(rec)
            assigned.add(rec["id"])
        print(f"  {name:26s} N={N:>9,}  n={take:>5,}  pi={pi:.5f}  weight={1/pi:>9.1f}")
        prev_preds.append(pred)

    # ---- the assertions that D22 cost us -------------------------------------------
    assert len(assigned) == len(sample), "a work appears in two strata: the strata are not a partition"
    assert all(r["pi"] > 0 for r in sample), "a stratum has pi = 0; no estimator is defined over it"
    total_frame = con.execute(f"SELECT count(*) FROM f WHERE NOT (id IN {excl}) AND title IS NOT NULL AND length(title) > 10").fetchone()[0]
    # the last stratum is TRUE, so the union of strata covers the frame by construction
    print(f"\nsample: {len(sample):,} works over {len(strata)} strata; frame covered: {total_frame:,}")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(sample, f, indent=1)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
