"""Gemma-4-31B across three backends, and the experiment that decides whether it may label the frame.

WHY A CHEAP MODEL IS INTERESTING HERE, AND WHY IT IS NOT AUTOMATICALLY USABLE
-----------------------------------------------------------------------------
Frontier labels cost ~$1,261 per model over 4.3M works and days of wall-clock. Gemma-4-31B
is free (OpenRouter free tier), included (NVIDIA build), or local-ish (Ollama cloud), and
three backends means real parallelism. If it can apply rubric v3.1 the way Opus and ChatGPT
do, the whole frame gets REAL category labels instead of distilled scores, for nothing.

If it cannot, then labelling 4.3M works with it produces 4.3M confident errors, free of
charge, and the database becomes worse than useless: it becomes wrong in a way that looks
authoritative. Finding 16 already measured this exact hazard once, on a cheaper model:
Haiku landed within a whisker of Sonnet's BASE RATE (1.27% vs 1.06%, 98.1% agreement) while
its in-scope SET overlapped Sonnet's by 16%. A cheap screener can reproduce the right
number of positives and the wrong positives.

So Gemma is not trusted, it is TESTED, on the works whose frontier labels already exist:

    * 700 works carry Opus AND ChatGPT labels under rubric v3.1 (loop rounds 1-7).
    * Gemma screens the same 700, under the same rubric, with the same schema.
    * The comparison is SET agreement (Jaccard per category), not rate agreement, because
      rate agreement at a 1% base rate is bought for free by the settled negatives.

The decision rule is prespecified here, before any number exists:

    Gemma may label the frame IF its per-category Jaccard against the two-teacher
    consensus is >= 0.60 for `metaresearch` and the union-of-categories decision.
    Below that it labels nothing, and the ML classifier (trained on frontier labels)
    stays the frame-wide annotator.

0.60 is not arbitrary: the two FRONTIER models agree with each other at roughly 0.44-0.75
(round 001, on an adversarially selected batch). A cheap model that matches the frontier
models about as well as they match each other is doing the same job. One that falls far
below is doing a different job under the same name.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

RUBRIC = "docs/protocol/rubric-v3.md"
SCHEMA = "docs/protocol/screening-schema-v3.json"
MODEL_OR = "google/gemma-4-31b-it:free"
MODEL_NV = "google/gemma-4-31b-it"
MODEL_OLLAMA = "gemma4:31b-cloud"


def _env(k):
    for line in open(".env"):
        if line.startswith(k + "="):
            return line.split("=", 1)[1].strip()
    return os.environ.get(k)


def build_prompt(records) -> str:
    rubric = open(RUBRIC).read()
    schema = open(SCHEMA).read()
    payload = [{k: r.get(k) for k in
                ("id", "title", "abstract", "year", "lang", "type", "venue", "topic", "field")}
               for r in records]
    return (
        "You are screening scholarly works for the MetaCan project. Apply the rubric below to EVERY "
        "record and output ONE JSON array with ONE object per record, conforming EXACTLY to the JSON "
        "schema below. Output ONLY the JSON array. No prose, no markdown fences, no commentary.\n\n"
        "# THE RUBRIC (v3.1, locked)\n\n" + rubric +
        "\n\n# THE OUTPUT SCHEMA (screening-schema-v3.json)\n\n" + schema +
        "\n\n# THE RECORDS\n\n" + json.dumps(payload, ensure_ascii=False, indent=1) +
        "\n\nOutput the JSON array now, with exactly "
        + str(len(records)) + " objects, ids matching the records above."
    )


def _post(url, headers, payload, timeout=240):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def call_openrouter(prompt, timeout=240):
    key = _env("OPENROUTER_API_KEY")
    d = _post("https://openrouter.ai/api/v1/chat/completions",
              {"Authorization": f"Bearer {key}"},
              {"model": MODEL_OR, "messages": [{"role": "user", "content": prompt}],
               "temperature": 0, "max_tokens": 8192}, timeout)
    return d["choices"][0]["message"]["content"]


def call_nvidia(prompt, timeout=240):
    key = _env("NVIDIA_API_KEY")
    d = _post("https://integrate.api.nvidia.com/v1/chat/completions",
              {"Authorization": f"Bearer {key}"},
              {"model": MODEL_NV, "messages": [{"role": "user", "content": prompt}],
               "temperature": 0, "top_p": 0.95, "max_tokens": 16384, "stream": False}, timeout)
    return d["choices"][0]["message"]["content"]


def call_ollama(prompt, timeout=600):
    d = _post("http://localhost:11434/api/chat", {},
              {"model": MODEL_OLLAMA, "messages": [{"role": "user", "content": prompt}],
               "stream": False, "options": {"temperature": 0}}, timeout)
    return d["message"]["content"]


BACKENDS = {"openrouter": call_openrouter, "nvidia": call_nvidia, "ollama": call_ollama}


def extract_array(raw: str):
    """The model writes prose; the HARNESS writes the labels. Same contract as every arm."""
    i = raw.find("[")
    while i != -1:
        j = raw.rfind("]")
        while j > i:
            try:
                c = json.loads(raw[i:j + 1])
                if isinstance(c, list) and c and isinstance(c[0], dict) and "categories" in c[0]:
                    return c
                break
            except Exception:
                j = raw.rfind("]", 0, j)
        i = raw.find("[", i + 1)
    return None


def label(records, backend="openrouter", retries=3):
    prompt = build_prompt(records)
    fn = BACKENDS[backend]
    for attempt in range(retries):
        try:
            raw = fn(prompt)
            arr = extract_array(raw)
            if arr:
                return arr, None
            err = "no JSON array in response"
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code}: {e.read()[:200].decode('utf-8', 'replace')}"
            if e.code == 429:
                time.sleep(20 * (attempt + 1))
                continue
        except Exception as e:
            err = f"{type(e).__name__}: {e}"
        time.sleep(3 * (attempt + 1))
    return None, err


if __name__ == "__main__":
    # smoke test: one backend, three records, and report latency
    import glob
    recs = json.load(open(sorted(glob.glob("pilot/screening/loop/round_001/batch.json"))[0]))[:3]
    for b in sys.argv[1:] or ["openrouter"]:
        t0 = time.time()
        arr, err = label(recs, backend=b, retries=1)
        dt = time.time() - t0
        if arr:
            print(f"{b:12s} OK  {len(arr)} labels in {dt:.1f}s")
            print("   sample:", json.dumps(arr[0])[:180])
        else:
            print(f"{b:12s} FAIL in {dt:.1f}s: {err}")
