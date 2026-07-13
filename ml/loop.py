"""The loop driver: retrain after each live round, track maturity, decide NOTHING by feel.

THE STAGED PLAN (the PI's, and the arithmetic that sizes it)
------------------------------------------------------------
Improve the model on live batches BEFORE it touches the 4.3M frame. Costs, at finding 13's
measured token rates: one work, three teachers ~= $0.0009, so

    100 rounds x 100 works =  10,000 works ~= $27 of teacher labels
  1,000 rounds x 100 works = 100,000 works ~= $265

Money is not the constraint. WALL-CLOCK is: a round is three model passes plus a retrain,
several minutes at best, so 1,000 sequential rounds is a week of continuous running. The
schedule below gets the same labels into the model in far fewer rounds by GROWING the batch
as the model stabilizes, which also matches how much a retrain can learn from 100 new
labels once it has 20,000:

    rounds  1-10   batch  100   (fast policy updates while the model is raw)
    rounds 11-25   batch  250
    rounds 26-40   batch  500
    rounds 41+     batch 1000   until the gate passes or the label budget is spent

THE MATURITY GATE, prespecified before any round ran
----------------------------------------------------
The frame pass is EARNED, not scheduled. All three, on the FROZEN holdout (a fixed quarter
of the 5,600 v1-labelled works, never queried, never trained on):

  1. AP plateau   : relative gain of holdout AP (vs majority teacher) over the last 5
                    completed rounds < 2%.
  2. Churn floor  : holdout positive-set churn < 0.05 for 3 consecutive rounds.
  3. Ranking lock : Spearman correlation of holdout scores between consecutive rounds
                    > 0.98 for 3 consecutive rounds.

When all three hold, ml/loop.py writes pilot/results/maturity.json with passed=true, and
ONLY THEN will ml/score_frame.py run a full-frame pass. Anything scored before that is a
baseline for the explorer, marked model_version=v0-immature, and is overwritten.

Honesty clause, from findings 30/31 and two adversarial reviews: every metric here is
agreement with TEACHERS. "Mature" means the student's opinion has stopped moving, not that
it is right. The preregistered human audit measures; nothing in this file does.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
from scipy.stats import spearmanr
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score

sys.path.insert(0, ".")
from ml import features, labels as L
from ml.select_batch import train_heads, loop_labelled_ids

STATE = "pilot/results/loop_state.json"
MATURITY = "pilot/results/maturity.json"
GATE = {
    "ap_plateau_rel_gain_lt": 0.02,
    "ap_plateau_window": 5,
    "churn_lt": 0.05,
    "churn_consecutive": 3,
    "rank_spearman_gt": 0.98,
    "rank_consecutive": 3,
}


def frozen_holdout():
    """The SAME holdout every round, from the ONE canonical definition (L.frozen_holdout_ids).

    The first live evaluation defined the holdout here with a local seed while train_heads
    trained on all 5,600 works, holdout included, and reported AP 0.969: a metric against
    memorized data, D33's class exactly (D35). Now both sides import the same id set, and
    the assertion below fails the run if a single holdout work ever reaches training.
    """
    ids, recs, y_by_arm, w, strata = L.load_all()
    hold_ids = L.frozen_holdout_ids()
    hold = [i for i, wid in enumerate(ids) if wid in hold_ids]
    texts = [features.render(recs[i], features.PAYLOAD_FRAME_PARITY) for i in hold]
    y = L.consensus(y_by_arm, "strict", "majority")[np.array(hold)]
    return texts, y, w[np.array(hold)], hold_ids


def evaluate_after_round(round_no: int):
    vec, heads, n_train = train_heads(include_holdout=False)
    ho_texts, ho_y, ho_w, hold_ids = frozen_holdout()
    # the leak that produced AP 0.969 must be structurally impossible, not just fixed:
    # no holdout work in any loop batch, ever, and training must be smaller than the
    # full labelled corpus by at least the holdout's size.
    assert not (hold_ids & loop_labelled_ids()), "a frozen-holdout work entered a loop batch"
    n_loop = sum(1 for _ in loop_labelled_ids())
    assert n_train <= 5600 - len(hold_ids) + n_loop, (
        f"train corpus ({n_train}) is larger than labelled-minus-holdout; the holdout is leaking")
    X = vec.transform(ho_texts)
    S = np.vstack([heads[a].predict_proba(X)[:, 1] for a in L.ACTIVE_ARMS])
    mean_s = S.mean(axis=0)

    ap = float(average_precision_score(ho_y, mean_s)) if ho_y.sum() else float("nan")
    pos_set = set(np.where(mean_s > 0.5)[0].tolist())

    state = json.load(open(STATE)) if os.path.exists(STATE) else {"rounds": []}
    prev = state["rounds"][-1] if state["rounds"] else None
    churn = float("nan")
    rank_corr = float("nan")
    if prev is not None:
        prev_scores = np.array(prev["holdout_scores"])
        prev_pos = set(prev["holdout_positive_idx"])
        churn = len(pos_set ^ prev_pos) / max(len(pos_set | prev_pos), 1)
        rank_corr = float(spearmanr(prev_scores, mean_s).statistic)

    rec = {
        "round": round_no,
        "n_train": n_train,
        "holdout_ap_vs_majority_teacher": round(ap, 4),
        "holdout_churn": round(churn, 4) if churn == churn else None,
        "holdout_rank_spearman_vs_prev": round(rank_corr, 4) if rank_corr == rank_corr else None,
        "holdout_scores": [round(float(s), 5) for s in mean_s],
        "holdout_positive_idx": sorted(int(i) for i in pos_set),
    }
    state["rounds"].append(rec)

    # ---- the gate, evaluated exactly as prespecified ----------------------------------
    rounds = state["rounds"]
    aps = [r["holdout_ap_vs_majority_teacher"] for r in rounds]
    churns = [r["holdout_churn"] for r in rounds if r["holdout_churn"] is not None]
    ranks = [r["holdout_rank_spearman_vs_prev"] for r in rounds if r["holdout_rank_spearman_vs_prev"] is not None]

    w_ = GATE["ap_plateau_window"]
    ap_plateau = (len(aps) > w_ and aps[-w_ - 1] > 0
                  and (max(aps[-w_:]) - aps[-w_ - 1]) / aps[-w_ - 1] < GATE["ap_plateau_rel_gain_lt"])
    churn_ok = (len(churns) >= GATE["churn_consecutive"]
                and all(c < GATE["churn_lt"] for c in churns[-GATE["churn_consecutive"]:]))
    rank_ok = (len(ranks) >= GATE["rank_consecutive"]
               and all(r > GATE["rank_spearman_gt"] for r in ranks[-GATE["rank_consecutive"]:]))
    passed = bool(ap_plateau and churn_ok and rank_ok)

    state["gate"] = {
        "criteria": GATE,
        "ap_plateau": ap_plateau, "churn_ok": churn_ok, "rank_ok": rank_ok,
        "passed": passed,
        "meaning_of_passed": (
            "The student's imitation of its teachers has stopped moving. NOT that it is right: "
            "the human audit measures, this gate only spends the frame pass."
        ),
    }
    with open(STATE, "w") as f:
        json.dump(state, f, indent=1)
    with open(MATURITY, "w") as f:
        json.dump(state["gate"], f, indent=1)

    print(f"round {round_no}: n_train={n_train}  AP={ap:.4f}  churn={rec['holdout_churn']}  "
          f"rank_rho={rec['holdout_rank_spearman_vs_prev']}")
    print(f"gate: ap_plateau={ap_plateau} churn_ok={churn_ok} rank_ok={rank_ok} -> passed={passed}")
    return state


if __name__ == "__main__":
    evaluate_after_round(int(sys.argv[1]))
