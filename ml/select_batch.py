"""Pick the next batch of 100 frame works for the live loop, and write the round's prompts.

THE STAGED PLAN THIS IMPLEMENTS
-------------------------------
Do NOT score 4.3M works with a model trained on 5,600 v1-era labels. Instead: label frame
works in batches, retrain every round, and let a PRESPECIFIED maturity gate decide when the
model has earned a frame pass. The gate lives in ml/loop.py; scoring the frame without it
is refused by ml/score_frame.py.

BATCH COMPOSITION (unchanged from the design both reviewers checked)
  50 max-teacher-disagreement  - where the per-teacher heads split most
  30 max-uncertainty           - where the mean head sits nearest 0.5
  20 random                    - drift sentinels with KNOWN draw probabilities; never an
                                 evaluation stream (finding 31: 400 draws held 3 positives)

WHAT IS NEW HERE VS THE SIMULATION
----------------------------------
The candidates come from the FRAME, not from the 5,600 already-labelled works, and the
labels come from the three LIVE teachers under rubric v3.1 and screening-schema-v3.json.
These are the first labels ever produced under the locked instrument, so the loop is also
the start of the prespecified v2-to-v3 comparison.

Abstracts: works.csv has none (has_abstract is a boolean). The round fetches them from
Crossref/PubMed by DOI, per work, and records PER RECORD where the abstract came from.
A missing abstract is not a blocker: the rubric's confidence rule exists for exactly that
record, and 23.3% of the frame is title-only anyway. What is NOT allowed is pretending the
payload had an abstract when it did not.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
import urllib.parse

import duckdb
import numpy as np
from sklearn.linear_model import LogisticRegression

sys.path.insert(0, ".")
from ml import features, labels as L

FRAME_CSV = "data/db/works.csv"
LOOP_DIR = "pilot/screening/loop"
BATCH = 100
N_DISAGREE, N_UNCERTAIN, N_ANCHOR = 50, 30, 20
CANDIDATE_POOL = 200_000   # scored per round; a fresh random slice of the frame each round
PROMPT_CHUNK = 25          # works per prompt file; small enough for a careful pass


def loop_labelled_ids():
    """Every frame work already labelled by ANY loop round (never re-query)."""
    ids = set()
    if not os.path.isdir(LOOP_DIR):
        return ids
    for rnd in sorted(os.listdir(LOOP_DIR)):
        b = os.path.join(LOOP_DIR, rnd, "batch.json")
        if os.path.exists(b):
            ids.update(r["id"] for r in json.load(open(b)))
    return ids


def train_heads(include_holdout=False):
    """Heads on everything labelled so far EXCEPT the frozen evaluation holdout.

    The holdout (a fixed quarter of the v1 works, L.frozen_holdout_ids) stays out of every
    training corpus while the loop is being judged: the first live evaluation trained on
    it and reported AP 0.969 against memorized works (D35). include_holdout=True is for
    the POST-GATE frame model only, and ml/score_frame.py may pass it only when
    pilot/results/maturity.json says passed.
    """
    ids, recs, y_by_arm, w, strata = L.load_all()
    fields = features.PAYLOAD_FRAME_PARITY
    hold = set() if include_holdout else L.frozen_holdout_ids()
    keep = [i for i, wid in enumerate(ids) if wid not in hold]
    recs = [recs[i] for i in keep]
    texts = [features.render(r, fields) for r in recs]
    Y = {a: [int(y_by_arm[a]["strict"][i]) for i in keep] for a in L.ARMS}

    # v3 loop labels: metaresearch in categories == the strict target
    if os.path.isdir(LOOP_DIR):
        for rnd in sorted(os.listdir(LOOP_DIR)):
            rd = os.path.join(LOOP_DIR, rnd)
            batch_f = os.path.join(rd, "batch.json")
            if not os.path.exists(batch_f):
                continue
            batch = {r["id"]: r for r in json.load(open(batch_f))}
            arm_labels = {}
            for arm in L.ARMS:
                lf = os.path.join(rd, f"labels_{arm}.json")
                if os.path.exists(lf):
                    arm_labels[arm] = {r["id"]: r for r in json.load(open(lf))}
            if len(arm_labels) < len(L.ARMS):
                continue          # a round only counts when ALL teachers have reported
            for wid, rec in batch.items():
                if all(wid in arm_labels[a] for a in L.ARMS):
                    texts.append(features.render(rec, fields))
                    for a in L.ARMS:
                        cats = arm_labels[a][wid].get("categories", [])
                        Y[a].append(1 if "metaresearch" in cats else 0)

    vec = features.vectorizer()
    X = vec.fit_transform(texts)
    heads = {}
    for a in L.ARMS:
        y = np.array(Y[a])
        clf = LogisticRegression(C=1.0, class_weight="balanced", max_iter=2000, solver="liblinear")
        clf.fit(X, y)
        heads[a] = clf
    return vec, heads, len(texts)


def fetch_abstract(doi: str, timeout=10) -> tuple[str, str]:
    """Crossref then PubMed, by DOI. Returns (abstract, source). Empty on miss."""
    if not doi:
        return "", "none"
    doi = doi.replace("https://doi.org/", "")
    try:
        u = f"https://api.crossref.org/works/{urllib.parse.quote(doi)}"
        req = urllib.request.Request(u, headers={"User-Agent": "MetaCan/1.0 (mailto:ahmad.pub@gmail.com)"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            m = json.load(r).get("message", {})
        abs_ = m.get("abstract") or ""
        if abs_:
            import re
            abs_ = re.sub(r"<[^>]+>", " ", abs_)
            abs_ = re.sub(r"\s+", " ", abs_).strip()
            if len(abs_) > 100:
                return abs_[:2500], "crossref"
    except Exception:
        pass
    try:
        u = ("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term="
             + urllib.parse.quote(f"{doi}[doi]"))
        with urllib.request.urlopen(u, timeout=timeout) as r:
            idl = json.load(r)["esearchresult"].get("idlist", [])
        if idl:
            u2 = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&rettype=abstract&retmode=text&id={idl[0]}"
            with urllib.request.urlopen(u2, timeout=timeout) as r:
                txt = r.read().decode("utf-8", "replace")
            if len(txt) > 200:
                return txt[:2500], "pubmed"
    except Exception:
        pass
    return "", "none"


def main(round_no: int, seed: int | None = None):
    rng = np.random.default_rng(seed if seed is not None else 40_000 + round_no)
    done = loop_labelled_ids()
    ids5600 = set(L.load_design().keys())
    exclude = done | ids5600

    vec, heads, n_train = train_heads()
    print(f"round {round_no}: heads trained on {n_train} labelled works "
          f"({len(done)} from the loop so far)")

    con = duckdb.connect()
    # A fresh random slice of the frame per round. Scoring all 4.3M per round is the
    # exact waste the staged plan exists to avoid; 200k random candidates give the
    # acquisition policy plenty to choose from and keep a round under two minutes.
    cand = con.execute(f"""
        SELECT id, doi, title, venue, topic, field, lang, type, year
        FROM read_csv_auto('{FRAME_CSV}', sample_size=1000)
        WHERE NOT is_retracted AND title IS NOT NULL AND length(title) > 10
        USING SAMPLE reservoir({CANDIDATE_POOL} ROWS) REPEATABLE ({int(rng.integers(1, 2**30))})
    """).fetchall()
    cols = ["id", "doi", "title", "venue", "topic", "field", "lang", "type", "year"]
    recs = [dict(zip(cols, r)) for r in cand if r[0] not in exclude]
    print(f"candidate pool: {len(recs):,}")

    texts = [features.render(r, features.PAYLOAD_FRAME_PARITY) for r in recs]
    X = vec.transform(texts)
    S = np.vstack([heads[a].predict_proba(X)[:, 1] for a in L.ARMS])
    spread = S.max(axis=0) - S.min(axis=0)
    mean_s = S.mean(axis=0)
    uncertainty = 1.0 - np.abs(mean_s - 0.5) * 2

    take, taken = [], set()
    for arr, k, why in ((spread, N_DISAGREE, "disagreement"), (uncertainty, N_UNCERTAIN, "uncertainty")):
        for i in np.argsort(-arr):
            if len([t for t in take if t[1] == why]) >= k:
                break
            if i not in taken:
                take.append((int(i), why)); taken.add(int(i))
    rest = [i for i in range(len(recs)) if i not in taken]
    for i in rng.choice(rest, size=N_ANCHOR, replace=False):
        take.append((int(i), "random_anchor"))

    batch = []
    for i, why in take:
        r = dict(recs[i])
        r["selected_for"] = why
        r["score_spread_at_selection"] = round(float(spread[i]), 4)
        r["mean_score_at_selection"] = round(float(mean_s[i]), 4)
        batch.append(r)

    # abstracts, with provenance, politely
    n_found = 0
    for r in batch:
        abs_, src = fetch_abstract(r.get("doi") or "")
        r["abstract"] = abs_
        r["abstract_source"] = src
        n_found += bool(abs_)
        time.sleep(0.15)
    print(f"abstracts recovered: {n_found}/{len(batch)}")

    rd = os.path.join(LOOP_DIR, f"round_{round_no:03d}")
    os.makedirs(os.path.join(rd, "prompts"), exist_ok=True)
    with open(os.path.join(rd, "batch.json"), "w") as f:
        json.dump(batch, f, indent=1)

    rubric = open("docs/protocol/rubric-v3.md").read()
    schema = open("docs/protocol/screening-schema-v3.json").read()
    for c in range(0, len(batch), PROMPT_CHUNK):
        chunk = batch[c:c + PROMPT_CHUNK]
        payload = [{k: r.get(k) for k in
                    ("id", "title", "abstract", "year", "lang", "type", "venue", "topic", "field")}
                   for r in chunk]
        prompt = (
            "You are screening scholarly works for the MetaCan project. Apply the rubric below to EVERY "
            "record and output ONE JSON array with ONE object per record, conforming EXACTLY to the JSON "
            "schema below. Output ONLY the JSON array, no prose before or after it.\n\n"
            "# THE RUBRIC (v3.1, locked)\n\n" + rubric +
            "\n\n# THE OUTPUT SCHEMA (screening-schema-v3.json)\n\n" + schema +
            "\n\n# THE RECORDS\n\n" + json.dumps(payload, ensure_ascii=False, indent=1)
        )
        with open(os.path.join(rd, "prompts", f"prompt_{c // PROMPT_CHUNK + 1:02d}.txt"), "w") as f:
            f.write(prompt)
    print(f"wrote {rd}/batch.json and {(len(batch) + PROMPT_CHUNK - 1) // PROMPT_CHUNK} prompt files")


if __name__ == "__main__":
    main(int(sys.argv[1]), int(sys.argv[2]) if len(sys.argv) > 2 else None)
