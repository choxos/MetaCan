"""Gemma test 2, run exactly as prespecified before any round_100 label existed.

Test 1 (finding 32) failed Gemma at the 0.60 bar and the rule stood; the same
table showed the bar was derived from loop batches selected FOR disagreement,
where the frontier teachers themselves manage only 0.384/0.360. Test 2 was
therefore prespecified in pilot/32_gemma_gate.R and in the finding, with the
rationale itself as the bar:

    On the enriched sample's random_baseline stratum (1,500 works, NOT selected
    for disagreement), Gemma passes if J(gemma, frontier_union) >= J(opus, gpt)
    on BOTH metaresearch and the any-category decision.

Run AFTER all three arms of round_100 are validated:
    python3 ml/validate_round.py 100 codex
    python3 ml/validate_round.py 100 opus
    python3 ml/validate_round.py 100 gemma
    python3 ml/gemma_test2.py

Consequence, written before the numbers: PASS means Gemma is a validated
screener for the frame (real category labels for 4.3M works, free); FAIL means
the classifier trained on frontier labels stays the frame-wide annotator and
Gemma remains a measured negative result.
"""

from __future__ import annotations

import json
import sys

RD = "pilot/screening/loop/round_100"
SAMPLE = "pilot/screening/bulk/sample.json"
OUT = "pilot/results/gemma_test2.json"
CATS = ["metaresearch", "metaepi_narrow", "metaepi_broad", "bibliometrics", "sts",
        "scholarly_communication", "open_science", "research_integrity"]


def load(arm):
    try:
        return {r["id"]: r for r in json.load(open(f"{RD}/labels_{arm}.json"))}
    except FileNotFoundError:
        sys.exit(f"labels_{arm}.json missing: run `python3 ml/validate_round.py 100 "
                 f"{'codex' if arm == 'gpt' else arm}` first")


def main():
    stratum = {r["id"]: r["stratum"] for r in json.load(open(SAMPLE))}
    opus, gpt, gem = load("opus"), load("gpt"), load("gemma")

    rb = [i for i in stratum if stratum[i] == "random_baseline"]
    ids = [i for i in rb if i in opus and i in gpt and i in gem]
    print(f"random_baseline stratum: {len(rb)} works; {len(ids)} carry all three arms")
    if len(ids) < len(rb):
        print(f"  WARNING: {len(rb) - len(ids)} random_baseline works missing an arm; "
              f"validators should have made this impossible")
    if not ids:
        sys.exit("no works carry all three arms; nothing to test")

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
        rows.append({
            "category": c,
            "n_opus": len(S_o), "n_gpt": len(S_g), "n_gemma": len(S_m),
            "jaccard_gemma_vs_frontier_union": round(jac(S_m, S_o | S_g), 3),
            "jaccard_opus_vs_gpt": round(jac(S_o, S_g), 3),
        })

    print(f"\n{'category':26s} {'opus':>5s} {'gpt':>5s} {'gemma':>6s}  {'J(gem,union)':>13s}  {'J(opus,gpt)':>12s}")
    for r in rows:
        print(f"{r['category']:26s} {r['n_opus']:5d} {r['n_gpt']:5d} {r['n_gemma']:6d}  "
              f"{r['jaccard_gemma_vs_frontier_union']:13.3f}  {r['jaccard_opus_vs_gpt']:12.3f}")

    meta = next(r for r in rows if r["category"] == "metaresearch")
    anyc = next(r for r in rows if r["category"] == "ANY_CATEGORY")
    passed = (meta["jaccard_gemma_vs_frontier_union"] >= meta["jaccard_opus_vs_gpt"]
              and anyc["jaccard_gemma_vs_frontier_union"] >= anyc["jaccard_opus_vs_gpt"])

    out = {
        "n_random_baseline": len(rb),
        "n_with_all_three_arms": len(ids),
        "per_category": rows,
        "decision_rule": ("On the random_baseline stratum, Gemma passes if "
                          "J(gemma, frontier_union) >= J(opus, gpt) on both "
                          "metaresearch and any-category"),
        "rule_written_before_the_numbers": True,
        "prespecified_in": "pilot/32_gemma_gate.R (test2_prespecified), commit 853d865b",
        "passed": passed,
        "consequence": (
            "Gemma is a validated screener for the frame: it matches the frontier union "
            "at least as well as the frontier models match each other, on works not "
            "selected for disagreement" if passed else
            "Gemma does NOT label the frame; the ML classifier trained on frontier "
            "labels stays the frame-wide annotator"
        ),
    }
    json.dump(out, open(OUT, "w"), indent=1)
    print(f"\nDECISION RULE (prespecified): J(gemma, union) >= J(opus, gpt), both targets")
    print(f"PASSED: {passed} -> {out['consequence']}")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
