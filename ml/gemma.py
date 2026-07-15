"""Gemma-4-31B across three backends and its frame labeling experiment.

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
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, JsonValue, TypeAdapter, ValidationError

from ml.screening_repair import extract_json_arrays

RUBRIC = "docs/protocol/rubric-v3.md"
SCHEMA = "docs/protocol/screening-schema-v3.json"
MODEL_OR = "google/gemma-4-31b-it:free"
MODEL_NV = "google/gemma-4-31b-it"
MODEL_OLLAMA = "gemma4:31b-cloud"
type Backend = Literal["openrouter", "nvidia", "ollama"]
type LabelRecord = dict[str, JsonValue]


class _Message(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)
    content: str


class _Choice(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)
    message: _Message


class _ChatResponse(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)
    choices: tuple[_Choice, ...]


class _OllamaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)
    message: _Message


_CHAT_ADAPTER = TypeAdapter(_ChatResponse)
_OLLAMA_ADAPTER = TypeAdapter(_OllamaResponse)
_LABELS_ADAPTER = TypeAdapter(list[LabelRecord])


def _env(k: str) -> str | None:
    configured = os.environ.get(k)
    if configured:
        return configured
    for path in (Path(".env"), Path("site/.env")):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith(k + "="):
                return line.split("=", 1)[1].strip()
    return None


def _required_env(k: str) -> str:
    value = _env(k)
    if not value:
        raise RuntimeError(f"missing credential: {k}")
    return value


def model_id(backend: Backend) -> str:
    return {
        "openrouter": MODEL_OR,
        "nvidia": MODEL_NV,
        "ollama": MODEL_OLLAMA,
    }[backend]


def build_prompt(records: Sequence[Mapping[str, JsonValue]]) -> str:
    rubric = Path(RUBRIC).read_text(encoding="utf-8")
    schema = Path(SCHEMA).read_text(encoding="utf-8")
    payload = [
        {
            k: r.get(k)
            for k in ("id", "title", "abstract", "year", "lang", "type", "venue", "topic", "field")
        }
        for r in records
    ]
    return (
        "You are screening scholarly works for the MetaCan project. Apply the rubric below "
        "to EVERY record and output ONE JSON array with ONE object per record, conforming "
        "EXACTLY to the JSON "
        "schema below. Output ONLY the JSON array. No prose, no markdown fences, no commentary. "
        "In the rubric, OUT means an empty categories array. Never emit OUT as a category "
        "value. Copy every input id exactly once and in the same order. Use only these genres: "
        "empirical, review, methods, commentary, editorial, protocol, dataset, software, other. "
        "Use only these study designs: randomized_trial, nonrandomized_trial, observational, "
        "systematic_review, meta_analysis, case_report, qualitative, simulation_or_modeling, "
        "bench_or_experimental, theoretical_or_conceptual, not_applicable, design_other. Domain "
        "is required for metaresearch and must be null or absent otherwise.\n\n"
        "# THE RUBRIC (v3.1, locked)\n\n"
        + rubric
        + "\n\n# THE OUTPUT SCHEMA (screening-schema-v3.json)\n\n"
        + schema
        + "\n\n# THE RECORDS\n\n"
        + json.dumps(payload, ensure_ascii=False, indent=1)
        + "\n\nOutput the JSON array now, with exactly "
        + str(len(records))
        + " objects, ids matching the records above."
    )


def _post[T](
    url: str,
    headers: Mapping[str, str],
    payload: dict[str, JsonValue],
    adapter: TypeAdapter[T],
    timeout: int = 240,
) -> T:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", **headers},
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return adapter.validate_json(response.read())


def call_openrouter(prompt: str, timeout: int = 240) -> str:
    key = _required_env("OPENROUTER_API_KEY")
    response = _post(
        "https://openrouter.ai/api/v1/chat/completions",
        {"Authorization": f"Bearer {key}"},
        {
            "model": MODEL_OR,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "max_tokens": 8192,
        },
        _CHAT_ADAPTER,
        timeout,
    )
    if not response.choices:
        raise RuntimeError("OpenRouter returned no choices")
    return response.choices[0].message.content


def call_nvidia(prompt: str, timeout: int = 240) -> str:
    key = _required_env("NVIDIA_API_KEY")
    response = _post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {"Authorization": f"Bearer {key}"},
        {
            "model": MODEL_NV,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "top_p": 0.95,
            "max_tokens": 16384,
            "stream": False,
        },
        _CHAT_ADAPTER,
        timeout,
    )
    if not response.choices:
        raise RuntimeError("NVIDIA returned no choices")
    return response.choices[0].message.content


def call_ollama(prompt: str, timeout: int = 600) -> str:
    response = _post(
        "http://localhost:11434/api/chat",
        {},
        {
            "model": MODEL_OLLAMA,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {"temperature": 0},
        },
        _OLLAMA_ADAPTER,
        timeout,
    )
    return response.message.content


type BackendFunction = Callable[[str], str]
BACKENDS: dict[Backend, BackendFunction] = {
    "openrouter": call_openrouter,
    "nvidia": call_nvidia,
    "ollama": call_ollama,
}


def extract_array(raw: str) -> list[LabelRecord] | None:
    for candidate in extract_json_arrays(raw):
        try:
            labels = _LABELS_ADAPTER.validate_json(candidate)
        except ValidationError:
            continue
        if labels and "categories" in labels[0]:
            return labels
    return None


def label(
    records: Sequence[Mapping[str, JsonValue]],
    backend: Backend = "openrouter",
    retries: int = 3,
) -> tuple[list[LabelRecord] | None, str | None]:
    prompt = build_prompt(records)
    fn = BACKENDS[backend]
    err = "no attempts performed"
    for attempt in range(retries):
        try:
            raw = fn(prompt)
            arr = extract_array(raw)
            if arr:
                return arr, None
            err = "no JSON array in response"
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code}"
            if e.code == 429:
                time.sleep(20 * (attempt + 1))
                continue
        except (urllib.error.URLError, TimeoutError, OSError, RuntimeError, ValidationError) as e:
            err = f"{type(e).__name__}: {e}"
        time.sleep(3 * (attempt + 1))
    return None, err


if __name__ == "__main__":
    # smoke test: one backend, three records, and report latency
    import glob

    batch_path = Path(sorted(glob.glob("pilot/screening/loop/round_001/batch.json"))[0])
    recs = _LABELS_ADAPTER.validate_json(batch_path.read_text(encoding="utf-8"))[:3]
    for raw_backend in sys.argv[1:] or ["openrouter"]:
        if raw_backend not in BACKENDS:
            raise SystemExit(f"unknown backend: {raw_backend}")
        b = raw_backend
        t0 = time.time()
        arr, err = label(recs, backend=b, retries=1)
        dt = time.time() - t0
        if arr:
            print(f"{b:12s} OK  {len(arr)} labels in {dt:.1f}s")
            print("   sample:", json.dumps(arr[0])[:180])
        else:
            print(f"{b:12s} FAIL in {dt:.1f}s: {err}")
