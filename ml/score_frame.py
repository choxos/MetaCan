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
FRAME_PARQUET = "data/db/works.parquet"
PARTS_DIR = "data/db/scores_parts"
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

    # CHECKPOINTED, because the environment kills long processes. The first frame pass
    # died at 9% to a quadratic scan; the second, streaming, died at ~40 CPU-minutes to a
    # task kill and lost every row, because the rows lived in an in-memory table. Now:
    # one chunk = one parquet part on disk, a resume skips existing parts, and a kill
    # costs at most one chunk. The heads are deterministic across resumes (fixed CV seed,
    # liblinear), so parts scored by different invocations are the same model.
    con = duckdb.connect()
    if not os.path.exists(FRAME_PARQUET):
        print("converting works.csv -> works.parquet (one-time)...", flush=True)
        con.execute(f"""COPY (SELECT id, title, venue, topic, field, lang, type, year
                        FROM read_csv_auto('{FRAME_CSV}', sample_size=1000))
                        TO '{FRAME_PARQUET}' (FORMAT PARQUET)""")
    n_total = con.execute(f"SELECT count(*) FROM '{FRAME_PARQUET}'").fetchone()[0]
    target = min(limit or n_total, n_total)
    n_parts = (target + CHUNK - 1) // CHUNK
    os.makedirs(PARTS_DIR, exist_ok=True)
    print(f"frame: {n_total:,} works; {n_parts} parts of {CHUNK:,}", flush=True)

    vec, heads = fit_final_heads()
    cols = ["id", "title", "venue", "topic", "field", "lang", "type", "year"]

    for part in range(n_parts):
        out = os.path.join(PARTS_DIR, f"part_{part:04d}.parquet")
        if os.path.exists(out):
            continue
        rows = con.execute(
            f"SELECT {', '.join(cols)} FROM '{FRAME_PARQUET}' ORDER BY id LIMIT {CHUNK} OFFSET {part * CHUNK}"
        ).fetchall()
        if not rows:
            break
        recs = [dict(zip(cols, r)) for r in rows]
        texts = [features.render(r, features.PAYLOAD_FRAME_PARITY) for r in recs]
        X = vec.transform(texts)
        S = np.vstack([heads[a].predict_proba(X)[:, 1] for a in heads])
        spread = S.max(axis=0) - S.min(axis=0)
        import pyarrow as pa, pyarrow.parquet as pq
        names = list(heads)
        tbl = pa.table({
            "id": [r["id"] for r in recs],
            **{f"score_{n}": S[i].tolist() for i, n in enumerate(names)},
            "score_spread": spread.tolist(),
            "validation_status": [f"score_only:{model_version}"] * len(recs),
        })
        pq.write_table(tbl, out)
        print(f"  part {part + 1}/{n_parts} written ({(part + 1) * CHUNK:,} works)", flush=True)

    # merge + summary
    con.execute(f"CREATE OR REPLACE VIEW scores AS SELECT * FROM '{PARTS_DIR}/part_*.parquet'")
    con.execute(f"COPY (SELECT * FROM scores) TO '{OUT_PARQUET}' (FORMAT PARQUET)")
    s = con.execute("""SELECT count(*), avg(score_spread), quantile_cont(score_spread, 0.99),
                       count(*) FILTER (WHERE score_spread > 0.5) FROM scores""").fetchone()
    out = {
        "n_scored": s[0],
        "model_version": model_version,
        "teacher_heads": list(heads),
        "mean_teacher_spread": round(s[1], 4),
        "p99_teacher_spread": round(s[2], 4),
        "n_works_where_teachers_would_split": s[3],
        "validation_status_of_every_category_score": f"score_only:{model_version}",
        "no_category_label_ships": True,
    }
    with open("pilot/results/frame_scores.json", "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps(out, indent=1), flush=True)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--baseline"]
    lim = int(args[0]) if args else None
    main(lim, force_baseline="--baseline" in sys.argv)
