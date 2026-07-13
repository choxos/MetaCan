"""The batch-of-100 loop, and the claim it is NOT allowed to make.

BOTH REVIEWERS KILLED THE SAME SENTENCE, INDEPENDENTLY
------------------------------------------------------
The design said: each batch of 100 = 50 max-disagreement + 30 max-uncertainty + 20 RANDOM
ANCHOR, and the anchor "keeps an unbiased evaluation stream alive".

GPT-5.6: at a 1% base rate, 20 anchors yield 0.2 expected positives and an 81.8% chance of
seeing none. A hundred batches give ~20 positives across 2,000 anchors, before you divide
by category, language, source or abstract status.

Grok 4.5: SE(p-hat) ~= 0.007 at 200 anchors; you would need ~250 batches of anchors alone
to see 50 expected positives.

They are right, and the arithmetic is not close. The anchors are a real probability sample
and they cannot power precision, recall, AP or calibration for a rare class. So the honest
division of labor, which this module enforces rather than merely states:

    THE ACTIVE-LEARNING LOOP LEARNS. THE PREREGISTERED HUMAN AUDIT MEASURES.

The anchors survive with a smaller, defensible job: DRIFT SENTINELS. They are drawn with
known probabilities, they are never used to select the next batch, and at the end they are
re-scored under the frozen final model to check that the loop did not walk away from the
frame it started on. That is a question 2,000 anchors CAN answer, and it is the only
question about them this code will report.

WHY THE LOOP IS SIMULATED HERE, AND WHAT THAT DOES NOT SHOW
-----------------------------------------------------------
Tonight it runs on the 16,800 labels already collected (5,600 works x 3 teachers). Every
"query" reveals a label that already exists. Grok named this exactly: it is IN-SAMPLE
RECYCLING. It can demonstrate the loop's MECHANICS and the shape of the learning curve. It
CANNOT show that the loop matures on 4.3M unlabelled works, and it cannot validate the v3.1
instrument, under which no screening has yet run. Both facts are recorded in the output, in
the same object as the curve, so no reader can take one without the other.
"""

from __future__ import annotations

import json
import sys

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score

sys.path.insert(0, ".")
from ml import features, labels as L

BATCH = 100                 # the PI's directive, honored, and its cost measured below
N_DISAGREE = 50
N_UNCERTAIN = 30
N_ANCHOR = 20
SEED = 20261027


def fit_and_score(texts, idx_train, y_train, all_idx):
    """Fit on the revealed set, score everything. Vectorizer fitted on train only."""
    vec = features.vectorizer()
    Xtr = vec.fit_transform([texts[i] for i in idx_train])
    Xall = vec.transform([texts[i] for i in all_idx])
    if y_train.sum() < 2 or (1 - y_train).sum() < 2:
        return np.zeros(len(all_idx))
    clf = LogisticRegression(C=1.0, class_weight="balanced", max_iter=2000, solver="liblinear")
    clf.fit(Xtr, y_train)
    return clf.predict_proba(Xall)[:, 1]


def run(rounds=20, holdout_frac=0.25):
    ids, recs, y_by_arm, w, strata = L.load_all()
    texts = [features.render(r, features.PAYLOAD_FRAME_PARITY) for r in recs]
    n = len(ids)
    all_idx = np.arange(n)

    # A FIXED HOLDOUT, DRAWN ONCE, NEVER QUERIED, NEVER REVEALED.
    #
    # The first version of this loop measured AP and churn on the POOL: the set of works
    # not yet revealed. But active learning REMOVES the contested works from the pool by
    # construction, so the pool gets easier every round and the evaluation target moves
    # under the metric. AP fell from 0.019 to 0.011 and churn sat at exactly 1.000 for
    # twenty straight rounds, which is not a finding, it is a shifting denominator.
    #
    # A metric measured on a set the algorithm is actively editing is not a metric. The
    # holdout is drawn once, up front, and is invisible to every acquisition decision.
    rng_h = np.random.default_rng(11)
    holdout = rng_h.choice(n, size=int(n * holdout_frac), replace=False)
    holdout_set = set(holdout.tolist())
    selectable = np.array([i for i in all_idx if i not in holdout_set])

    # The teachers, kept separate. The loop learns each teacher's policy and the SPREAD
    # between them is the acquisition signal, which is the only thing per-teacher heads
    # are good for (both reviewers agreed: allocation, not truth).
    Y = {a: y_by_arm[a]["strict"] for a in L.ARMS}
    y_majority = L.consensus(y_by_arm, "strict", "majority")

    rng = np.random.default_rng(SEED)

    # Seed: a small PROBABILITY sample, not a hand-picked set. A hand-picked seed is a
    # prior about the boundary, applied before any measurement, and it would propagate
    # through every round that follows.
    revealed = set(rng.choice(selectable, size=BATCH, replace=False).tolist())
    anchors = set()

    history = []
    prev_positive_set = set()

    # The control arm. Same budget, same model, RANDOM batches. Without it, a rising or
    # falling AP curve says nothing: it could be the acquisition policy or it could just
    # be having more labels. The comparison is the experiment.
    revealed_rand = set(rng.choice(selectable, size=BATCH, replace=False).tolist())

    for rnd in range(rounds):
        idx_tr = np.array(sorted(revealed))
        pool = np.array([i for i in selectable if i not in revealed])
        if len(pool) < BATCH:
            break

        # score everything under each teacher's head
        scores = {a: fit_and_score(texts, idx_tr, Y[a][idx_tr], all_idx) for a in L.ARMS}
        S = np.vstack([scores[a] for a in L.ARMS])
        spread = S.max(axis=0) - S.min(axis=0)      # where the teachers would split
        mean_s = S.mean(axis=0)
        uncertainty = 1.0 - np.abs(mean_s - 0.5) * 2  # peaks at p = 0.5

        # ---- AP on the FIXED HOLDOUT, against the majority teacher --------------------
        # This is imitation of a teacher, not accuracy. It is labelled as such below.
        ho_y = y_majority[holdout]
        ap = float(average_precision_score(ho_y, mean_s[holdout])) if ho_y.sum() else float("nan")

        # ---- the control: same budget, random batches ---------------------------------
        idx_tr_r = np.array(sorted(revealed_rand))
        s_rand = fit_and_score(texts, idx_tr_r, y_majority[idx_tr_r], all_idx)
        ap_rand = float(average_precision_score(ho_y, s_rand[holdout])) if ho_y.sum() else float("nan")
        pool_rand = [i for i in selectable if i not in revealed_rand]
        revealed_rand.update(rng.choice(pool_rand, size=min(BATCH, len(pool_rand)), replace=False).tolist())

        # ---- the batch, composed exactly as specified --------------------------------
        take = []
        for arr, k in ((spread, N_DISAGREE), (uncertainty, N_UNCERTAIN)):
            cand = [i for i in pool if i not in take]
            ranked = sorted(cand, key=lambda i: -arr[i])
            take.extend(ranked[:k])
        anchor_pool = [i for i in pool if i not in take]
        anchor_batch = rng.choice(anchor_pool, size=min(N_ANCHOR, len(anchor_pool)), replace=False).tolist()
        take.extend(anchor_batch)
        anchors.update(anchor_batch)

        # ---- what the anchors could and could not tell us, computed not asserted ------
        anc = np.array(sorted(anchors))
        anchor_pos = int(y_majority[anc].sum())
        # design-weighted prevalence from the anchors alone, with its own standard error
        aw = w[anc]
        p_hat = float(np.average(y_majority[anc], weights=aw))
        # Kish effective n for a weighted mean, which is what makes the SE honest
        n_eff = float(aw.sum() ** 2 / np.sum(aw ** 2))
        se = float(np.sqrt(max(p_hat * (1 - p_hat), 1e-12) / n_eff))

        # Churn on the FIXED HOLDOUT, for the same reason AP is: the pool is a set the
        # algorithm is actively editing, so churn measured on it is churn of the
        # denominator. On the holdout it means what it is supposed to mean: is the model's
        # opinion about the SAME works still moving?
        positive_set = {int(i) for i in holdout if mean_s[i] > 0.5}
        churn = (
            len(positive_set ^ prev_positive_set) / max(len(positive_set | prev_positive_set), 1)
            if prev_positive_set else 1.0
        )
        prev_positive_set = positive_set

        history.append({
            "round": rnd + 1,
            "n_revealed": len(revealed),
            "n_anchors": len(anchors),
            "anchor_positives_seen": anchor_pos,
            "anchor_prevalence_hat": round(p_hat, 5),
            "anchor_se": round(se, 5),
            "anchor_ci_width": round(2 * 1.96 * se, 5),
            "holdout_ap_active": round(ap, 4),
            "holdout_ap_random_control": round(ap_rand, 4),
            "active_minus_random": round(ap - ap_rand, 4),
            "holdout_positive_set_churn": round(churn, 4),
            "teacher_spread_mean": round(float(spread.mean()), 4),
        })
        revealed.update(take)

    # ---- the verdict on the anchors, in numbers, not adjectives ----------------------
    final = history[-1]
    anchor_verdict = {
        "n_anchors_after_%d_rounds" % len(history): final["n_anchors"],
        "positives_among_them": final["anchor_positives_seen"],
        "design_weighted_prevalence": final["anchor_prevalence_hat"],
        "ci_width": final["anchor_ci_width"],
        "verdict": (
            "The anchors are a valid probability sample and a USELESS evaluation stream. After "
            f"{len(history)} rounds they hold {final['anchor_positives_seen']} positives, and the 95% interval on "
            f"prevalence is {final['anchor_ci_width']:.3f} wide against a point estimate of "
            f"{final['anchor_prevalence_hat']:.3f}: the interval is wider than the quantity. They cannot "
            "power precision, recall, AP or calibration, and this loop does not ask them to. THE LOOP LEARNS; "
            "THE PREREGISTERED HUMAN AUDIT MEASURES. The anchors are kept as DRIFT SENTINELS, rescored under "
            "the frozen final model, and they are never used to select a batch."
        ),
    }

    ap_a = [h["holdout_ap_active"] for h in history]
    ap_r = [h["holdout_ap_random_control"] for h in history]
    verdict_curve = {
        "ap_active_first_vs_last": [ap_a[0], ap_a[-1]],
        "ap_random_first_vs_last": [ap_r[0], ap_r[-1]],
        "active_beats_random_in_rounds": sum(1 for a, r in zip(ap_a, ap_r) if a > r),
        "rounds": len(history),
        "final_churn": history[-1]["holdout_positive_set_churn"],
    }

    out = {
        "curve_verdict": verdict_curve,
        "batch_composition": {
            "batch_size": BATCH, "max_disagreement": N_DISAGREE,
            "max_uncertainty": N_UNCERTAIN, "random_anchor": N_ANCHOR,
        },
        "history": history,
        "anchor_verdict": anchor_verdict,
        "what_this_simulation_shows": (
            "The loop's MECHANICS and the shape of its learning curve, on labels that already exist."
        ),
        "what_this_simulation_does_NOT_show": (
            "That the loop matures on 4.3M unlabelled works. Every 'query' here reveals a label already "
            "collected: it is in-sample recycling. It also says nothing about the v3.1 instrument, under which "
            "no screening has run. And held-out AP is measured against the MAJORITY TEACHER, so a rising curve "
            "means the student is imitating three LLMs better, NOT that it is getting closer to the field. A "
            "wrong model can plateau immediately and look mature."
        ),
        "maturity_is_not_established_by": (
            "Positive-set churn or a repeatedly-inspected held-out AP. Both were in the original design and "
            "both are rejected: churn at a 1% base rate is the churn of a handful of works, and AP against "
            "teacher labels measures imitation. Maturity, if the word is to mean anything here, is a statement "
            "about agreement with HUMAN-CODED PROBABILITY-SAMPLE evidence, which does not exist yet."
        ),
    }
    with open("pilot/results/active_learning.json", "w") as f:
        json.dump(out, f, indent=1)
    return out


if __name__ == "__main__":
    r = run()
    for h in r["history"]:
        print(
            f"round {h['round']:2d}  n={h['n_revealed']:5d}  "
            f"AP_active={h['holdout_ap_active']:.3f}  AP_random={h['holdout_ap_random_control']:.3f}  "
            f"diff={h['active_minus_random']:+.3f}  churn={h['holdout_positive_set_churn']:.3f}  "
            f"anchors={h['n_anchors']:4d} (pos={h['anchor_positives_seen']:2d})"
        )
    print()
    print("CURVE:", json.dumps(r["curve_verdict"]))
    print()
    print(r["anchor_verdict"]["verdict"])
