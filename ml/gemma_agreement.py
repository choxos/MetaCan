"""Can Gemma-4-31B label the frame? Measured against the frontier teachers, not assumed.

Runs Gemma over the SAME works Opus and ChatGPT already screened under rubric v3.1, and
reports SET agreement per category (Jaccard), not rate agreement. Rate agreement at a ~1%
base rate is bought for free by the settled negatives: finding 16 showed a cheap model
matching a frontier model's base rate to within 0.2 points while overlapping its actual
positive SET by 16%.

The decision rule was written before the numbers existed (ml/gemma.py docstring):
Gemma labels the frame only if Jaccard >= 0.60 against the two-teacher consensus on
`metaresearch` and on the any-category decision.
"""

from __future__ import annotations

import concurrent.futures as cf
import glob
import json
import os
import sys
import time

sys.path.insert(0, ".")
from ml import gemma

CHUNK = 25
OUT = "pilot/screening/gemma_agreement"
CATS = ["metaresearch", "metaepi_narrow", "metaepi_broad", "bibliometrics", "sts",
        "scholarly_communication", "open_science", "research_integrity"]


def load_frontier():
    """The works with BOTH frontier arms under v3.1, and their labels."""
    works, opus, gpt = {}, {}, {}
    for rd in sorted(glob.glob("pilot/screening/loop/round_*")):
        b, lo, lg = f"{rd}/batch.json", f"{rd}/labels_opus.json", f"{rd}/labels_gpt.json"
        if not (os.path.exists(b) and os.path.exists(lo) and os.path.exists(lg)):
            continue
        for r in json.load(open(b)):
            works[r["id"]] = r
        for r in json.load(open(lo)):
            opus[r["id"]] = r
        for r in json.load(open(lg)):
            gpt[r["id"]] = r
    ids = sorted(set(works) & set(opus) & set(gpt))
    return [works[i] for i in ids], {i: opus[i] for i in ids}, {i: gpt[i] for i in ids}


def run(backend="nvidia", workers=6):
    os.makedirs(OUT, exist_ok=True)
    recs, opus, gpt = load_frontier()
    print(f"{len(recs)} works carry both frontier arms under v3.1")

    chunks = [recs[i:i + CHUNK] for i in range(0, len(recs), CHUNK)]
    todo = [(k, c) for k, c in enumerate(chunks) if not os.path.exists(f"{OUT}/chunk_{k:03d}.json")]
    print(f"{len(chunks)} chunks; {len(todo)} to run on {backend} with {workers} workers")

    def work(kc):
        k, c = kc
        t0 = time.time()
        arr, err = gemma.label(c, backend=backend)
        if arr:
            json.dump(arr, open(f"{OUT}/chunk_{k:03d}.json", "w"))
            return k, len(arr), time.time() - t0, None
        return k, 0, time.time() - t0, err

    if todo:
        with cf.ThreadPoolExecutor(max_workers=workers) as ex:
            for k, n, dt, err in ex.map(work, todo):
                print(f"  chunk {k:03d}: {n} labels in {dt:.0f}s" + (f"  FAIL {err[:80]}" if err else ""), flush=True)

    # ---- assemble and compare -------------------------------------------------------
    gem = {}
    for f in sorted(glob.glob(f"{OUT}/chunk_*.json")):
        for r in json.load(open(f)):
            gem[r["id"]] = r
    ids = [r["id"] for r in recs if r["id"] in gem]
    print(f"\nGemma returned labels for {len(ids)} of {len(recs)} works")
    if not ids:
        return

    def cats(lab, i):
        return set(lab[i].get("categories") or []) - {"insufficient_payload"}

    def jac(a, b):
        return len(a & b) / len(a | b) if (a | b) else 1.0

    rows = []
    for c in CATS + ["ANY_CATEGORY"]:
        if c == "ANY_CATEGORY":
            S_o = {i for i in ids if cats(opus, i)}
            S_g = {i for i in ids if cats(gpt, i)}
            S_m = {i for i in ids if cats(gem, i)}
        else:
            S_o = {i for i in ids if c in cats(opus, i)}
            S_g = {i for i in ids if c in cats(gpt, i)}
            S_m = {i for i in ids if c in cats(gem, i)}
        consensus = S_o | S_g          # the union: what EITHER frontier model called it
        rows.append({
            "category": c,
            "n_opus": len(S_o), "n_gpt": len(S_g), "n_gemma": len(S_m),
            "jaccard_gemma_vs_frontier_union": round(jac(S_m, consensus), 3),
            "jaccard_opus_vs_gpt": round(jac(S_o, S_g), 3),
        })

    # study design, which has an external reference standard and is the flag a
    # meta-researcher reaches for first
    des_agree = sum(1 for i in ids if gem[i].get("study_design") == opus[i].get("study_design"))
    des_agree_gpt = sum(1 for i in ids if gem[i].get("study_design") == gpt[i].get("study_design"))
    frontier_des = sum(1 for i in ids if opus[i].get("study_design") == gpt[i].get("study_design"))

    print(f"\n{'category':26s} {'opus':>5s} {'gpt':>5s} {'gemma':>6s}  {'J(gem,frontier)':>16s}  {'J(opus,gpt)':>12s}")
    for r in rows:
        print(f"{r['category']:26s} {r['n_opus']:5d} {r['n_gpt']:5d} {r['n_gemma']:6d}  "
              f"{r['jaccard_gemma_vs_frontier_union']:16.3f}  {r['jaccard_opus_vs_gpt']:12.3f}")
    print(f"\nstudy_design exact match: gemma-opus {des_agree/len(ids):.1%}, "
          f"gemma-gpt {des_agree_gpt/len(ids):.1%}, opus-gpt {frontier_des/len(ids):.1%}")

    meta = next(r for r in rows if r["category"] == "metaresearch")
    anyc = next(r for r in rows if r["category"] == "ANY_CATEGORY")
    passed = (meta["jaccard_gemma_vs_frontier_union"] >= 0.60
              and anyc["jaccard_gemma_vs_frontier_union"] >= 0.60)

    out = {
        "n_works": len(ids),
        "backend": backend,
        "per_category": rows,
        "study_design_exact_match": {
            "gemma_vs_opus": round(des_agree / len(ids), 3),
            "gemma_vs_gpt": round(des_agree_gpt / len(ids), 3),
            "opus_vs_gpt_for_reference": round(frontier_des / len(ids), 3),
        },
        "decision_rule": "Jaccard >= 0.60 vs the frontier union, on metaresearch AND any-category",
        "rule_written_before_the_numbers": True,
        "passed": passed,
        "consequence": (
            "Gemma labels the frame under rubric v3.1" if passed else
            "Gemma does NOT label the frame; the ML classifier trained on frontier labels stays "
            "the frame-wide annotator, and Gemma is reported as a measured negative result"
        ),
    }
    json.dump(out, open("pilot/results/gemma_agreement.json", "w"), indent=1)
    print(f"\nDECISION RULE (prespecified): Jaccard >= 0.60 on metaresearch and any-category")
    print(f"PASSED: {passed} -> {out['consequence']}")


if __name__ == "__main__":
    run(backend=sys.argv[1] if len(sys.argv) > 1 else "nvidia",
        workers=int(sys.argv[2]) if len(sys.argv) > 2 else 6)
