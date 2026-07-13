"""Per-teacher heads, design-weighted evaluation, and the one thing this model may not do.

WHAT THIS MODEL IS FOR, AFTER THE PREMISE IT WAS BUILT ON TURNED OUT TO BE FALSE
-------------------------------------------------------------------------------
It was proposed as a way to avoid LLM-labelling 4.3M works. Then finding 13 measured
that: the full rubric over every work in the frame costs $1,261. The classifier was
never a cost workaround, and pretending otherwise put two incompatible designs on the
same page (D32).

It survives for four reasons, none of which is cost, and all of which are things a
second LLM pass cannot buy:

  1. The audit needs a CONTINUOUS CALIBRATED SCORE to stratify on. Tier labels are
     discrete and uncalibrated.
  2. A rubric revision currently costs a full pass. This re-scores 4.3M in minutes, so
     a change can be TESTED before a pass is SPENT.
  3. Running three teachers over 4.3M costs 3x and ~25 days. Per-teacher heads predict
     WHERE THE THREE WOULD DISAGREE across the whole frame from a 5,600-work sample.
     The contested region is this project's central object.
  4. How learnable the boundary is, is evidence ABOUT the boundary.

WHAT IT MAY NOT DO
------------------
Emit a category label. Distilled from our own metaresearch labels it reproduced its own
teacher's positive set at Jaccard 0.17. Both reviewers said the same thing in different
words: per-teacher heads are NOT cosmetic for allocating audit effort, and they ARE
cosmetic as a solution to the contested boundary. Only human-coded probability-sample
evidence touches that. So: scores ship, labels do not.

AND THE CONSENSUS HEAD IS A NAMED SENSITIVITY ANALYSIS, NOT A DEFAULT
---------------------------------------------------------------------
`unanimous`, `majority` and `any` are three different estimands that differ by ~2.6x in
positives. Training on one silently settles the question the audit exists to answer. All
three are fitted and reported; none is "the" target.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, asdict

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, GroupKFold

sys.path.insert(0, ".")
from ml import features, labels as L


@dataclass
class HeadResult:
    name: str
    n_pos: int
    ap_unweighted: float
    ap_design_weighted: float
    auc_design_weighted: float
    ap_by_language: dict
    ap_by_abstract: dict
    lift_top_decile: float


def design_weighted_ap(y, s, w):
    """Average precision with survey weights.

    THE UNWEIGHTED NUMBER IS FOR A POPULATION THAT DOES NOT EXIST. The 5,600 works are a
    stratified sample: French carries weight 311, aff_core 1,119. An unweighted AP is an
    AP over the SAMPLE, and the sample deliberately over-represents the rare strata. The
    frame-scale quantity needs the weights, and the two are reported side by side
    precisely because the gap between them is a fact about the design.

    Weighted AP = sum_k (R_k - R_{k-1}) * P_k over the score-sorted order, with weighted
    recall and precision.
    """
    order = np.argsort(-s)
    y, w = y[order], w[order]
    tp = np.cumsum(y * w)
    fp = np.cumsum((1 - y) * w)
    total_pos = (y * w).sum()
    if total_pos == 0:
        return float("nan")
    precision = tp / np.maximum(tp + fp, 1e-12)
    recall = tp / total_pos
    return float(np.sum(np.diff(np.concatenate([[0.0], recall])) * precision))


def design_weighted_auc(y, s, w):
    """Weighted AUC by the Mann-Whitney form: P(score of a positive > score of a negative)."""
    pos = w[y == 1]
    neg = w[y == 0]
    if len(pos) == 0 or len(neg) == 0:
        return float("nan")
    sp, sn = s[y == 1], s[y == 0]
    # rank-based, weighted: sum over pairs, done in O(n log n) via sorting
    order = np.argsort(np.concatenate([sn, sp]))
    lab = np.concatenate([np.zeros(len(sn)), np.ones(len(sp))])[order]
    wt = np.concatenate([neg, pos])[order]
    cum_neg = 0.0
    num = 0.0
    for is_pos, weight in zip(lab, wt):
        if is_pos:
            num += weight * cum_neg
        else:
            cum_neg += weight
    return float(num / (pos.sum() * neg.sum()))


def out_of_fold_scores(X_texts, y, groups, fit_fields, n_splits=5, seed=20261013):
    """Out-of-fold probabilities, with the vectorizer fitted INSIDE each fold.

    Fitting the IDF on all the text and then cross-validating is a leak, and it is the
    exact leak that produced 100% top-decile recall in this project once already
    (finding 25, first version, withdrawn because the number flattered the argument).
    So the vectorizer is fitted on the TRAINING FOLD ONLY, every fold, every time.

    `groups` is the VENUE. A random split lets the model memorize that Scientometrics
    publishes scientometrics, which is true, useless, and inflates every metric. Grouping
    by venue asks the question that matters at frame scale: can it recognize the field in
    a journal it has never seen?
    """
    oof = np.zeros(len(y), dtype=float)
    if groups is not None:
        splitter = GroupKFold(n_splits=n_splits)
        split_iter = splitter.split(np.arange(len(y)), y, groups=groups)
    else:
        splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed)
        split_iter = splitter.split(np.arange(len(y)), y)

    for tr, te in split_iter:
        vec = features.vectorizer()
        Xtr = vec.fit_transform([X_texts[i] for i in tr])
        Xte = vec.transform([X_texts[i] for i in te])
        if y[tr].sum() < 2:            # a fold with no positives cannot be fitted
            oof[te] = 0.0
            continue
        base = LogisticRegression(
            C=1.0,
            class_weight="balanced",   # at a 1% base rate, without this the model predicts OUT and stops
            max_iter=2000,
            solver="liblinear",
        )
        # Calibration is on the TRAINING fold only, and it is honest about what it is:
        # these probabilities are calibrated to the TEACHER, on the SAMPLE. They are not
        # calibrated to the frame, and no isotonic fit on an enriched sample would make
        # them so. They are used to RANK and to STRATIFY, never to assert a rate.
        n_pos_tr = int(y[tr].sum())
        if n_pos_tr >= 10:
            clf = CalibratedClassifierCV(base, method="sigmoid", cv=3)
        else:
            clf = base
        clf.fit(Xtr, y[tr])
        oof[te] = clf.predict_proba(Xte)[:, 1]
    return oof


def evaluate_head(name, y, s, w, langs, has_abs) -> HeadResult:
    top_n = max(1, len(s) // 10)
    top_idx = np.argsort(-s)[:top_n]
    base_rate = float(np.average(y, weights=w))
    top_rate = float(np.average(y[top_idx], weights=w[top_idx]))
    lift = top_rate / base_rate if base_rate > 0 else float("nan")

    def sub_ap(mask):
        if mask.sum() < 20 or y[mask].sum() < 2:
            return None
        return round(design_weighted_ap(y[mask], s[mask], w[mask]), 4)

    return HeadResult(
        name=name,
        n_pos=int(y.sum()),
        ap_unweighted=round(float(average_precision_score(y, s)), 4) if y.sum() else float("nan"),
        ap_design_weighted=round(design_weighted_ap(y, s, w), 4),
        auc_design_weighted=round(design_weighted_auc(y, s, w), 4),
        # Reported SEPARATELY by language and by abstract availability, because
        # "char n-grams do the French work" is an assertion until it is measured, and
        # 23.3% of the frame is title-only.
        ap_by_language={
            "en": sub_ap(langs == "en"),
            "fr": sub_ap(langs == "fr"),
        },
        ap_by_abstract={
            "with_abstract": sub_ap(has_abs),
            "title_only": sub_ap(~has_abs),
        },
        lift_top_decile=round(lift, 2),
    )


def main():
    ids, recs, y_by_arm, w, strata = L.load_all()

    # THE PAYLOAD PARITY DECISION, MADE EXPLICITLY AND MEASURED BOTH WAYS.
    # The frame CSV has no abstract text. A model trained with abstracts cannot score the
    # frame. So the SHIPPED model is the frame-parity one, and the abstract model is
    # fitted only to MEASURE WHAT THE MISSING ABSTRACT COSTS. That number is a finding
    # about the data, not a model we are allowed to deploy.
    langs = np.array([r.get("lang") or "" for r in recs])
    has_abs = np.array([bool((r.get("abstract") or "").strip()) for r in recs])
    venues = np.array([(r.get("venue") or "UNKNOWN_VENUE") for r in recs])

    results = {}
    for payload_name, fields in [
        ("frame_parity", features.PAYLOAD_FRAME_PARITY),
        ("with_abstract_NOT_DEPLOYABLE", features.PAYLOAD_WITH_ABSTRACT),
    ]:
        if payload_name.startswith("with_abstract"):
            # This one deliberately trips the parity assertion, so it is called with the
            # guard bypassed and the result is labelled as not deployable. The bypass is
            # RIGHT HERE, in the open, in seven lines, rather than a silent kwarg.
            texts = [features.render(r, fields) for r in recs]
        else:
            features.assert_payload_parity(fields)
            texts = [features.render(r, fields) for r in recs]

        payload_res = {}
        for target in ("strict", "broad"):
            heads = {}
            # ---- one head per teacher: the disagreement is the data, not noise --------
            for arm in L.ARMS:
                y = y_by_arm[arm][target]
                s = out_of_fold_scores(texts, y, venues, fields)
                heads[arm] = asdict(evaluate_head(arm, y, s, w, langs, has_abs))
                heads[arm]["_scores"] = s

            # ---- the three consensus rules, ALL of them, none of them "the" target ----
            for rule in ("unanimous", "majority", "any"):
                y = L.consensus(y_by_arm, target, rule)
                s = out_of_fold_scores(texts, y, venues, fields)
                heads[f"consensus_{rule}"] = asdict(evaluate_head(f"consensus_{rule}", y, s, w, langs, has_abs))
                heads[f"consensus_{rule}"]["_scores"] = s

            # ---- what the heads are FOR: predicting where the teachers split ----------
            arm_scores = np.vstack([heads[a]["_scores"] for a in L.ARMS])
            spread = arm_scores.max(axis=0) - arm_scores.min(axis=0)
            # Ground truth for "did the teachers actually disagree on this work?"
            votes = np.vstack([y_by_arm[a][target] for a in L.ARMS]).sum(axis=0)
            contested = ((votes >= 1) & (votes <= 2)).astype(int)
            disagreement_ap = float(average_precision_score(contested, spread)) if contested.sum() else float("nan")
            disagreement_base = float(contested.mean())

            for h in heads.values():
                h.pop("_scores", None)

            payload_res[target] = {
                "heads": heads,
                "predicting_teacher_disagreement": {
                    "n_contested": int(contested.sum()),
                    "base_rate": round(disagreement_base, 4),
                    "average_precision": round(disagreement_ap, 4),
                    "lift_over_base": round(disagreement_ap / disagreement_base, 2) if disagreement_base else None,
                    "what_this_is": (
                        "Can the between-head spread, computed from a 5,600-work sample, tell us WHERE the three "
                        "teachers would disagree? If yes, the contested region of the whole 4.3M frame is mappable "
                        "without running three LLMs over it (3x cost, ~25 days). This is the classifier's single "
                        "strongest justification and it is measured, not assumed."
                    ),
                    "what_this_is_not": (
                        "Evidence that the spread tracks DEFINITIONAL contestedness. It tracks where these three "
                        "models split under this rubric. Shared teacher bias is invisible to it: if all three are "
                        "wrong the same way, the spread is zero and the work looks settled."
                    ),
                },
            }
        results[payload_name] = payload_res

    # ---- what the missing abstract costs, which is a fact about the FRAME -------------
    a = results["frame_parity"]["strict"]["heads"]["consensus_majority"]["ap_design_weighted"]
    b = results["with_abstract_NOT_DEPLOYABLE"]["strict"]["heads"]["consensus_majority"]["ap_design_weighted"]
    results["payload_skew"] = {
        "ap_frame_parity": a,
        "ap_with_abstract": b,
        "abstract_is_worth_ap": round(b - a, 4),
        "why_the_deployable_model_is_the_worse_one": (
            "data/db/works.csv stores has_abstract, a boolean, and no abstract text. A model trained with "
            "abstracts scores a payload the 4.3M works do not have. Reporting the abstract model's number as "
            "the classifier's performance would be reporting a metric for a model that cannot run. The "
            "difference is what re-extracting abstracts from the snapshot would buy, and it is a budget "
            "decision with a number attached rather than an assumption."
        ),
    }

    with open("pilot/results/classifier.json", "w") as f:
        json.dump(results, f, indent=1)
    print(json.dumps(results, indent=1)[:400])
    return results


if __name__ == "__main__":
    main()
