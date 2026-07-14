"""Stage the 10,348-work enriched sample as loop round_100, with abstracts and prompts.

Bulk labelling reuses the loop harness UNCHANGED (prompts layout, per-chunk resume,
validator, training pickup): the sample is just a very large round. Round numbers >= 100
are bulk; the design fields (stratum, pi, weight) travel inside batch.json so nothing
downstream has to re-derive them.
"""
import concurrent.futures as cf
import json, os, sys
sys.path.insert(0, ".")
from ml.select_batch import fetch_abstract, PROMPT_CHUNK

RD = "pilot/screening/loop/round_100"
sample = json.load(open("pilot/screening/bulk/sample.json"))
os.makedirs(f"{RD}/prompts", exist_ok=True)

if not os.path.exists(f"{RD}/batch.json"):
    def enrich(r):
        a, src = fetch_abstract(r.get("doi") or "")
        r["abstract"], r["abstract_source"] = a, src
        return r
    with cf.ThreadPoolExecutor(max_workers=10) as ex:
        sample = list(ex.map(enrich, sample))
    n = sum(1 for r in sample if r["abstract"])
    print(f"abstracts recovered: {n}/{len(sample)}")
    json.dump(sample, open(f"{RD}/batch.json", "w"), indent=1)
else:
    sample = json.load(open(f"{RD}/batch.json"))
    print("batch.json exists, reusing")

rubric = open("docs/protocol/rubric-v3.md").read()
schema = open("docs/protocol/screening-schema-v3.json").read()
for c in range(0, len(sample), PROMPT_CHUNK):
    p = f"{RD}/prompts/prompt_{c // PROMPT_CHUNK + 1:03d}.txt"
    if os.path.exists(p):
        continue
    chunk = sample[c:c + PROMPT_CHUNK]
    payload = [{k: r.get(k) for k in ("id", "title", "abstract", "year", "lang", "type", "venue", "topic", "field")} for r in chunk]
    open(p, "w").write(
        "You are screening scholarly works for the MetaCan project. Apply the rubric below to EVERY "
        "record and output ONE JSON array with ONE object per record, conforming EXACTLY to the JSON "
        "schema below. Output ONLY the JSON array, no prose before or after it.\n\n"
        "# THE RUBRIC (v3.1, locked)\n\n" + rubric +
        "\n\n# THE OUTPUT SCHEMA (screening-schema-v3.json)\n\n" + schema +
        "\n\n# THE RECORDS\n\n" + json.dumps(payload, ensure_ascii=False, indent=1))
print(f"prompts staged: {(len(sample) + PROMPT_CHUNK - 1) // PROMPT_CHUNK}")
