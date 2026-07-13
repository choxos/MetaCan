"""Load the teachers' labels, the payloads they saw, and the design weights.

THREE THINGS THIS FILE REFUSES TO DO
------------------------------------
1. It does not MERGE the three teachers into one label. Of the works any model called
   metaresearch, 38% were called that by all three; 43% rest on a single model's opinion.
   A merged label is a decision about a contested boundary, silently taken, and then
   laundered into a training set that looks objective. Every teacher is kept separate and
   the DISAGREEMENT is a feature of the data, not noise to be averaged out.

2. It does not drop the design weights. The 5,600 works are a STRATIFIED sample: French
   works carry weight 311 and aff_core works 1,119. An unweighted score is a score for a
   population that does not exist. Every metric in this module is design-weighted, and
   the unweighted one is reported beside it so the gap is visible.

3. It does not silently reconcile v1 tiers with v3 categories. THE LABELS ARE v1. The
   locked instrument is v3.1, and no screening has run under it. So a model trained here
   is trained on the RETIRED instrument, is a stratifier and nothing else, and must be
   retrained when the v3 screen runs. Saying so is not a caveat; it is the reason this
   model is not allowed to emit a released label.
"""

from __future__ import annotations

import glob
import json
import os

import numpy as np

ARMS = {"opus": "opus_r1", "gpt": "codex_r1", "grok": "grok_r1"}

# The teachers for NEW loop rounds. Three until round 6; Grok's usage balance ran out
# mid-round-7 (402 Payment Required) and the PI directed the loop to continue with
# ChatGPT, so from round 7 the live set is {opus, gpt}. Grok's 17,000 historical labels
# stay in the archive and in v1-era training exactly as they were; what retires is the
# grok HEAD: a teacher that stops learning while the others grow would freeze its
# boundary at round-6 knowledge, and a spread computed against a frozen boundary drifts
# artifactually. Recorded as D36.
ACTIVE_ARMS = {"opus": "opus_r1", "gpt": "codex_r1"}
FRAME1K = "pilot/screening/frame1k"

# v1's tier vocabulary. T1 = core metaresearch; T2 = "adjacent" (the category v3 deleted
# because its edge was defined by negation); T3 = contextual; OUT = none.
IN_SCOPE_STRICT = {"T1"}          # the estimand the proposal reports
IN_SCOPE_BROAD = {"T1", "T2"}     # the union v1 called "the field"


def load_payloads() -> dict:
    """id -> the exact record the teachers were shown. Not a reconstruction: the file."""
    out = {}
    for f in sorted(glob.glob(f"{FRAME1K}/chunks/chunk_*.json")):
        for r in json.load(open(f)):
            out[r["id"]] = r
    if not out:
        raise FileNotFoundError(f"no chunks in {FRAME1K}/chunks/")
    return out


def load_arm(arm_dir: str) -> dict:
    """id -> label, for one teacher."""
    out = {}
    for f in sorted(glob.glob(f"{FRAME1K}/{arm_dir}/labels_*.json")):
        for r in json.load(open(f)):
            out[r["id"]] = r
    if not out:
        raise FileNotFoundError(f"no labels in {FRAME1K}/{arm_dir}/")
    return out


def load_design() -> dict:
    """id -> (stratum, weight). Written by R; read here from the CSV mirror it exports."""
    path = f"{FRAME1K}/sample_design.csv"
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"{path} missing. Run: Rscript -e "
            f"'d <- readRDS(\"{FRAME1K}/sample_design.rds\"); "
            f'write.csv(d, "{path}", row.names = FALSE)\''
        )
    import csv

    out = {}
    with open(path) as fh:
        for row in csv.DictReader(fh):
            out[row["id"]] = (row["stratum"], float(row["weight"]))
    return out


def load_all():
    """The joined training table, reconciled BY SET EQUALITY and not by assumption.

    Returns (ids, payloads, y, w, strata) where y is a dict arm -> {strict, broad} arrays.
    """
    payloads = load_payloads()
    design = load_design()
    arms = {name: load_arm(d) for name, d in ARMS.items()}

    # Set equality, in every direction, before anything is indexed. A silent inner join
    # here would drop the records the teachers disagreed about most (the ones an arm
    # failed to emit), which is precisely the subpopulation this model exists to find.
    ids = set(payloads)
    for name, lab in arms.items():
        missing = ids - set(lab)
        extra = set(lab) - ids
        if missing or extra:
            raise ValueError(
                f"arm {name}: {len(missing)} payload ids with no label, "
                f"{len(extra)} labels with no payload. The manifest and the labels "
                f"must reconcile by SET EQUALITY before a single row is used."
            )
    no_design = ids - set(design)
    if no_design:
        raise ValueError(
            f"{len(no_design)} works have no design weight. A work with no selection "
            f"probability cannot be weighted, and an unweighted work in a weighted "
            f"estimate is a work with weight 1: silently, catastrophically wrong."
        )

    ids = sorted(ids)  # deterministic order; the hash order lives in the design file
    y = {}
    for name, lab in arms.items():
        y[name] = {
            "strict": np.array([lab[i]["tier"] in IN_SCOPE_STRICT for i in ids], dtype=int),
            "broad": np.array([lab[i]["tier"] in IN_SCOPE_BROAD for i in ids], dtype=int),
        }
    w = np.array([design[i][1] for i in ids], dtype=float)
    strata = np.array([design[i][0] for i in ids])
    recs = [payloads[i] for i in ids]
    return ids, recs, y, w, strata


def consensus(y: dict, key: str, rule: str = "majority") -> np.ndarray:
    """A consensus target, built EXPLICITLY and named, never as a default.

    `unanimous` is the high-precision core: every teacher said yes.
    `majority`   is 2 of 3.
    `any`        is the union, the widest boundary any teacher drew.

    These are three DIFFERENT estimands, they differ by a factor of ~2.6 in positives,
    and which one a paper trains on is a scientific choice that must be stated. The
    default here is `majority` only because a default is required; the trainer reports
    all three and the spread between them IS the finding.
    """
    stack = np.vstack([y[a][key] for a in ARMS])
    votes = stack.sum(axis=0)
    if rule == "unanimous":
        return (votes == len(ARMS)).astype(int)
    if rule == "majority":
        return (votes >= 2).astype(int)
    if rule == "any":
        return (votes >= 1).astype(int)
    raise ValueError(f"unknown consensus rule: {rule}")


def frozen_holdout_ids() -> set:
    """The frozen evaluation holdout: a fixed quarter of the v1-labelled works, seed 11.

    ONE definition, imported everywhere, because the live loop's first evaluation defined
    the holdout in one module and trained on all 5,600 works in another, and reported
    AP 0.969 against works the model had memorized. Same class as D33: a metric computed
    on data the model was given. These ids stay OUT of every training corpus until the
    maturity gate has passed; only the post-gate frame model may train on them.
    """
    import numpy as np
    ids = sorted(load_payloads())
    rng = np.random.default_rng(11)
    hold = rng.choice(len(ids), size=int(len(ids) * 0.25), replace=False)
    return {ids[i] for i in hold}
