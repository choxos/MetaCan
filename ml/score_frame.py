"""Score all 4,299,418 works. Chunked, local, and honest about what a score is.

WHAT SHIPS
----------
For every work in the frame, per category:
  - one score PER TEACHER (opus / gpt / grok), so a user can see whose boundary a record
    sits inside rather than a single number that hides the question;
  - the SPREAD between them, which is this project's map of the contested region;
  - a validation_status, which for every category is `score_only`.

WHAT DOES NOT SHIP
------------------
A category label. Not one. Not for the confident core, not thresholded, not "provisional".
The distillation ceiling (Jaccard 0.17 against its own teacher) is the reason, and both
adversarial reviewers said the same thing: per-teacher heads are useful for ALLOCATING
HUMAN EFFORT and cosmetic as a solution to the boundary. A score that a user can threshold
is a tool. A label is an assertion, and this model has not earned one.

The scores are calibrated TO THE TEACHER, ON THE SAMPLE. They are not frame-calibrated
probabilities, and the column names say so.
"""

from __future__ import annotations

import json
import sys

import os

import duckdb
import numpy as np
from sklearn.linear_model import LogisticRegression

sys.path.insert(0, ".")
from ml import features, labels as L

FRAME_CSV = "data/db/works.csv"
OUT_PARQUET = "data/db/frame_scores.parquet"
CHUNK = 250_000


def fit_final_heads():
    """Heads on EVERYTHING labelled so far: v1 works plus every completed loop round.

    Delegated to ml.select_batch.train_heads so the frame pass and the loop's acquisition
    scoring can never quietly train on different corpora (two corpora would be two models
    wearing one name, D20's shape at the model layer).
    """
    from ml.select_batch import train_heads
    vec, heads, n_train = train_heads()
    print(f"heads trained on {n_train:,} labelled works")
    return vec, heads


def main(limit=None, force_baseline=False):
    # THE GATE. The frame pass is earned by the loop (ml/loop.py), not scheduled.
    # Scoring 4.3M works with an immature model is exactly the waste the staged plan
    # exists to avoid, and an explicit baseline pass must SAY it is one.
    gate = {}
    if os.path.exists("pilot/results/maturity.json"):
        gate = json.load(open("pilot/results/maturity.json"))
    if not gate.get("passed") and not force_baseline:
        raise SystemExit(
            "REFUSED: the maturity gate has not passed (pilot/results/maturity.json). "
            "Run loop rounds until it does, or pass --baseline to score anyway with "
            "model_version marked v0-immature."
        )
    model_version = "mature" if gate.get("passed") else "v0-immature-baseline"

    vec, heads = fit_final_heads()
    con = duckdb.connect()

    n_total = con.execute(f"SELECT count(*) FROM read_csv_auto('{FRAME_CSV}', sample_size=1000)").fetchone()[0]
    print(f"frame: {n_total:,} works")

    con.execute("DROP TABLE IF EXISTS scores")
    con.execute("""
        CREATE TABLE scores (
            id VARCHAR,
            score_opus DOUBLE, score_gpt DOUBLE, score_grok DOUBLE,
            score_spread DOUBLE,
            validation_status VARCHAR
        )
    """)

    done = 0
    target = limit or n_total
    # ONE streaming pass. The first version re-ran the query with LIMIT/OFFSET per chunk,
    # which re-parses the 2GB CSV from the top every time: quadratic, hours of redundant
    # IO, found because the job was still at 9% after half an hour.
    cur = con.execute(f"""
        SELECT id, title, venue, topic, field, lang, type, year
        FROM read_csv_auto('{FRAME_CSV}', sample_size=1000)
        {f'LIMIT {target}' if limit else ''}
    """)
    while done < target:
        rows = cur.fetchmany(min(CHUNK, target - done))
        if not rows:
            break
        cols = ["id", "title", "venue", "topic", "field", "lang", "type", "year"]
        recs = [dict(zip(cols, r)) for r in rows]
        texts = [features.render(r, features.PAYLOAD_FRAME_PARITY) for r in recs]
        X = vec.transform(texts)

        S = np.vstack([heads[a].predict_proba(X)[:, 1] for a in L.ARMS])
        spread = S.max(axis=0) - S.min(axis=0)

        payload = [
            (recs[i]["id"], float(S[0, i]), float(S[1, i]), float(S[2, i]), float(spread[i]), f"score_only:{model_version}")
            for i in range(len(recs))
        ]
        con.executemany("INSERT INTO scores VALUES (?, ?, ?, ?, ?, ?)", payload)
        done += len(rows)
        print(f"  scored {done:,} / {target:,}", flush=True)

    con.execute(f"COPY scores TO '{OUT_PARQUET}' (FORMAT PARQUET)")
    summary = con.execute("""
        SELECT count(*) n,
               avg(score_spread) mean_spread,
               quantile_cont(score_spread, 0.99) p99_spread,
               count(*) FILTER (WHERE score_spread > 0.5) n_high_disagreement
        FROM scores
    """).fetchone()
    out = {
        "n_scored": summary[0],
        "mean_teacher_spread": round(summary[1], 4),
        "p99_teacher_spread": round(summary[2], 4),
        "n_works_where_teachers_would_split": summary[3],
        "validation_status_of_every_category_score": "score_only",
        "no_category_label_ships": True,
        "note": (
            "The spread column is the deliverable the LLMs cannot afford to produce: running three "
            "teachers over the whole frame costs 3x a single pass and ~25 days. This estimates WHERE they "
            "would disagree, over all of it, from 5,600 labelled works."
        ),
    }
    with open("pilot/results/frame_scores.json", "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--baseline"]
    lim = int(args[0]) if args else None
    main(lim, force_baseline="--baseline" in sys.argv)
