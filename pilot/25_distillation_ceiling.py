#!/usr/bin/env python3
"""
Finding 25, the computation: what a classifier trained on LLM labels can and cannot buy.

THE QUESTION, ASKED SERIOUSLY
-----------------------------
"Isn't it better to train an algorithm on the LLM outputs, and keep making training
sets until the algorithm matures?"

It is the right question and it deserves an experiment. The answer differs for the
two halves of it, so both halves are run.

  HALF 1  Can a student distilled from an LLM RESOLVE the boundary the three models
          disagree about? Measured by: does distilling from Opus move the student
          CLOSER to Grok than Opus already was?

  HALF 2  Does self-training on its own pseudo-labels "mature" the model? Run the
          loop on works the models never saw, with no external signal anywhere in
          it, and watch what happens to the positive class and its French share.

  HALF 3  What the classifier IS for: a STRATIFIER. Design-weighted estimates from
          known selection probabilities are unbiased HOWEVER NOISY the stratifier
          is. Noise costs efficiency, never validity. So the only question that
          matters for that job is how much human effort it saves.

WHY THIS IS IN PYTHON AND NOT R
-------------------------------
The first version was hand-rolled sparse matrices and a fixed glmnet lambda, and it
produced numbers that were obviously impossible: 100% of the in-scope works in the
top decile, 100% of the unlabelled pool predicted positive, and a student that
matched its own teacher at Jaccard 0.04. Degenerate, tied scores from an
unregularised fit on 10,900 features and 224 positives.

Those numbers FLATTERED the stratifier argument, which is exactly the direction this
project has learned to distrust. Rather than tune my own code until it agreed with
me, the estimator is now scikit-learn's, the regularisation strength is chosen by
cross-validation instead of by me, and the vectoriser is fitted on train and only
APPLIED to test. NOTHING HERE PRODUCES AN ESTIMATE; a model trained on machine
labels cannot be the instrument that measures machine labels.
"""

import json, glob, os, sys
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline

SEED = 20260712
rng = np.random.default_rng(SEED)
DIR = "pilot/screening/frame1k"
TEACHERS = ["opus", "gpt", "grok"]
ARM = {"opus": "opus_r1", "gpt": "codex_r1", "grok": "grok_r1"}
IN = {"T1", "T2"}


def load_labels(arm):
    out = {}
    for f in glob.glob(f"{DIR}/{arm}/labels_*.json"):
        for r in json.load(open(f)):
            out[r["id"]] = r["tier"]
    return out


def load_text():
    out = {}
    for f in glob.glob(f"{DIR}/chunks/chunk_*.json"):
        for r in json.load(open(f)):
            out[r["id"]] = {
                "text": f"{r.get('title','')} {r.get('abstract','')}".strip(),
                "lang": r.get("lang") or "",
            }
    return out


def jaccard(a, b):
    u = np.sum(a | b)
    return float(np.sum(a & b) / u) if u else float("nan")


def new_model():
    # Word AND character n-grams: the corpus is bilingual and a third of it is
    # title-only, so subword signal is the only thing that survives in French and in
    # a ten-word title. C is chosen by CV below, not by me.
    return make_pipeline(
        TfidfVectorizer(sublinear_tf=True, min_df=3, max_df=0.5,
                        ngram_range=(1, 2), strip_accents="unicode", lowercase=True),
        LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear"),
    )


def fit_with_cv_C(X, y, seed=SEED):
    """Pick C by cross-validated average precision. At a 4% base rate, accuracy and
    ROC-AUC are both dominated by the settled negatives and will happily certify a
    model that finds nothing. Average precision is scored on the positives."""
    from sklearn.model_selection import cross_val_score
    best, best_score = 1.0, -1.0
    for C in (0.1, 0.5, 1.0, 4.0, 16.0):
        m = new_model()
        m.named_steps["logisticregression"].C = C
        s = cross_val_score(m, X, y, cv=StratifiedKFold(4, shuffle=True, random_state=seed),
                            scoring="average_precision").mean()
        if s > best_score:
            best, best_score = C, s
    m = new_model()
    m.named_steps["logisticregression"].C = best
    m.fit(X, y)
    return m, best, best_score


def oof_scores(X, y, seed=SEED):
    """Out-of-fold. A student scored on the rows it was fitted on reports its
    teacher's labels back with a flourish and calls it accuracy."""
    p = np.zeros(len(y), dtype=float)
    skf = StratifiedKFold(5, shuffle=True, random_state=seed)
    for tr, te in skf.split(X, y):
        m = new_model()
        m.fit([X[i] for i in tr], y[tr])
        p[te] = m.predict_proba([X[i] for i in te])[:, 1]
    return p


def main():
    design = json.load(open(f"{DIR}/design.json")) if os.path.exists(f"{DIR}/design.json") else None
    labels = {t: load_labels(ARM[t]) for t in TEACHERS}
    text = load_text()

    ids = sorted(set(labels["opus"]) & set(labels["gpt"]) & set(labels["grok"]) & set(text))
    X = [text[i]["text"] for i in ids]
    lang = np.array([text[i]["lang"] for i in ids])
    Y = {t: np.array([labels[t][i] in IN for i in ids]) for t in TEACHERS}

    res = {"n_three_way_labelled": len(ids)}
    print(f"works with all three labels: {len(ids)}")
    for t in TEACHERS:
        print(f"  {t}: {Y[t].sum()} in-scope ({100*Y[t].mean():.2f}%)")

    # ---------- HALF 1: does the student resolve the boundary, or inherit it? -----
    print("\n=== 1. Does a distilled student RESOLVE the boundary, or INHERIT it? ===")
    P = {}
    for t in TEACHERS:
        P[t] = oof_scores(X, Y[t])

    # Compare student and teacher AT EQUAL PREVALENCE, by cutting the student at the
    # teacher's own positive count. Otherwise "where is the boundary" is confounded
    # with "how big is the class", and only the first is the question.
    def cut_at_n(p, n):
        if n <= 0:
            return np.zeros(len(p), bool)
        thr = np.sort(p)[::-1][min(n, len(p)) - 1]
        return p >= thr

    S = {t: cut_at_n(P[t], int(Y[t].sum())) for t in TEACHERS}

    print("\nJaccard, STUDENT (row) vs TEACHER (col):")
    print(f"{'':8s}" + "".join(f"{t:>8s}" for t in TEACHERS))
    stu_vs = {}
    for s in TEACHERS:
        row = [jaccard(S[s], Y[t]) for t in TEACHERS]
        stu_vs[s] = dict(zip(TEACHERS, row))
        print(f"{s:8s}" + "".join(f"{v:8.3f}" for v in row))

    print("\nJaccard, TEACHER vs TEACHER (for reference):")
    tt = {}
    for i, a in enumerate(TEACHERS):
        for b in TEACHERS[i + 1:]:
            tt[f"{a}_vs_{b}"] = jaccard(Y[a], Y[b])
            print(f"  {a} vs {b}: {tt[f'{a}_vs_{b}']:.3f}")

    # THE TEST. If distillation were recovering a shared latent construct, the
    # Opus-taught student would agree with Grok BETTER than Opus does. If it is only
    # parameterising one arm's policy, it will not.
    gain = {
        "opus_student_vs_grok": stu_vs["opus"]["grok"] - jaccard(Y["opus"], Y["grok"]),
        "opus_student_vs_gpt":  stu_vs["opus"]["gpt"]  - jaccard(Y["opus"], Y["gpt"]),
        "grok_student_vs_opus": stu_vs["grok"]["opus"] - jaccard(Y["grok"], Y["opus"]),
    }
    print("\nDoes distilling BRIDGE the gap to the other models? (positive = yes)")
    for k, v in gain.items():
        print(f"  {k}: {v:+.3f}")
    res["student_vs_teacher_jaccard"] = stu_vs
    res["teacher_vs_teacher_jaccard"] = tt
    res["bridging_gain"] = gain

    # ---------- HALF 2: the self-training loop, RUN rather than argued about ------
    print("\n=== 2. The self-training loop: does it mature, or just shrink? ===")
    import duckdb  # noqa
    pool_ids, pool_text, pool_lang = [], [], []
    try:
        con = duckdb.connect()
        q = con.execute("""
            SELECT id, title, abstract_idx, language FROM read_parquet(?)
            WHERE NOT is_paratext AND length(title) > 10
            ORDER BY md5(id || 'selftrain20260712') LIMIT 25000
        """, ["data/frame/canadian_works.parquet"]).fetchall()
        seen = set(ids)
        for wid, title, aidx, language in q:
            short = wid.split("/")[-1]
            if short in seen:
                continue
            abstract = ""
            if aidx:
                try:
                    inv = json.loads(aidx)
                    pos = [(p, w) for w, ps in inv.items() for p in ps]
                    abstract = " ".join(w for _, w in sorted(pos))
                except Exception:
                    pass
            pool_ids.append(short)
            pool_text.append(f"{title} {abstract}".strip())
            pool_lang.append(language or "")
            if len(pool_ids) >= 20000:
                break
        con.close()
    except Exception as e:
        print(f"  pool unavailable ({e}); skipping the loop", file=sys.stderr)

    rounds = []
    if pool_text:
        pool_lang = np.array(pool_lang)
        print(f"  unlabelled pool: {len(pool_text)} works the models never saw "
              f"({100*np.mean(pool_lang=='fr'):.1f}% French)")
        TEACH = "opus"                       # the strongest teacher; kindest case
        cur_X, cur_y = list(X), Y[TEACH].astype(int).copy()
        for r in range(4):
            m, C, ap = fit_with_cv_C(cur_X, cur_y) if r == 0 else (lambda mm: (mm, C, ap))(
                (lambda: (lambda mdl: (mdl.fit(cur_X, cur_y), mdl)[1])(new_model()))())
            if r > 0:
                m.named_steps["logisticregression"].C = C
                m.fit(cur_X, cur_y)
            pp = m.predict_proba(pool_text)[:, 1]
            keep = pp >= 0.5
            fr = float(np.mean(pool_lang[keep] == "fr")) if keep.sum() else float("nan")
            rounds.append({
                "round": r,
                "train_positives": int(cur_y.sum()),
                "pool_positive_rate_pct": round(100 * float(keep.mean()), 2),
                "french_share_of_positives_pct": round(100 * fr, 2) if keep.sum() else None,
            })
            print(f"  round {r}: train_pos={cur_y.sum():6d}  "
                  f"pool_positive={100*keep.mean():6.2f}%  "
                  f"french_share_of_positives={100*fr:5.2f}%" if keep.sum() else
                  f"  round {r}: no positives")
            if r == 3:
                break
            # Retrain on the pool it just labelled ITSELF. No human, no rubric, no anchor.
            cur_X = list(X) + pool_text
            cur_y = np.concatenate([Y[TEACH].astype(int), keep.astype(int)])

        if len(rounds) > 1:
            d_rate = rounds[-1]["pool_positive_rate_pct"] - rounds[0]["pool_positive_rate_pct"]
            d_fr = ((rounds[-1]["french_share_of_positives_pct"] or 0)
                    - (rounds[0]["french_share_of_positives_pct"] or 0))
            print(f"\n  DRIFT over {len(rounds)-1} rounds with NO external signal: "
                  f"positive rate {d_rate:+.2f} pts, French share {d_fr:+.2f} pts.")
            print("  Nothing in the loop can detect either, because its only reference is itself.")
            res["selftrain_drift_positive_rate_pts"] = round(d_rate, 2)
            res["selftrain_drift_french_share_pts"] = round(d_fr, 2)
    res["selftrain_rounds"] = rounds

    # ---------- HALF 3: the job it can actually do -------------------------------
    print("\n=== 3. The job a classifier CAN do: allocate human effort ===")
    truth_any = Y["opus"] | Y["gpt"] | Y["grok"]
    sc = P["opus"]
    order = np.argsort(sc)[::-1]
    n10 = int(np.ceil(0.10 * len(sc)))
    top = np.zeros(len(sc), bool); top[order[:n10]] = True
    recall10 = float((truth_any & top).sum() / truth_any.sum())
    print(f"  works ANY model called in-scope        : {int(truth_any.sum())}")
    print(f"  of those, in the classifier top decile : {int((truth_any & top).sum())} ({100*recall10:.0f}%)")
    print(f"  a BLIND audit would find               : 10%")
    print(f"  -> the stratifier finds {recall10/0.10:.1f}x as many in-scope works per unit of human effort")
    res["stratifier_top_decile_recall_pct"] = round(100 * recall10, 1)
    res["stratifier_lift_vs_blind"] = round(recall10 / 0.10, 1)
    res["used_to_produce_any_estimate"] = False

    os.makedirs("pilot/results", exist_ok=True)
    json.dump(res, open("pilot/results/distillation.json", "w"), indent=2)
    print("\nwrote pilot/results/distillation.json")


if __name__ == "__main__":
    main()
