"""Published from the research working tree, where this module lives at ml/gemma.py; renamed here to avoid colliding with this repository's earlier module of that name.

Gemma-4-31B across three backends, and the experiment that decides whether it may label the frame.

WHY A CHEAP MODEL IS INTERESTING HERE, AND WHY IT IS NOT AUTOMATICALLY USABLE
-----------------------------------------------------------------------------
Frontier labels cost ~$1,261 per model over 4.3M works and days of wall-clock. Gemma-4-31B
is free (OpenRouter free tier), included (NVIDIA build), or local-ish (Ollama cloud), and
three backends means real parallelism. If it can apply rubric v3.1 the way Opus and ChatGPT
do, the whole frame gets REAL category labels instead of distilled scores, for nothing.

If it cannot, then labeling 4.3M works with it produces 4.3M confident errors, free of
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
import urllib.response
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import ClassVar, override

from pydantic import BaseModel, ConfigDict

from ml.chunk_validation import (
    InvalidChunk,
    JSON_ADAPTER,
    JsonValue,
    LabelPayload,
    ValidChunk,
    correction_prompt,
    serialize_chunk,
    validate_streams,
)

RUBRIC = "docs/protocol/rubric-v3.md"
SCHEMA = "docs/protocol/screening-schema-v3.json"
MODEL_OR = "google/gemma-4-31b-it:free"
MODEL_NV = "google/gemma-4-31b-it"
MODEL_OLLAMA = "gemma4:31b-cloud"
MODEL_GEMINI = "gemma-4-31b-it"
MODEL_PUTER = "google/gemma-4-31b-it"

type SourceRecord = Mapping[str, JsonValue]
type Backend = Callable[[str], str]
type AttemptRecorder = Callable[[int, str, str], None]
type LabelResult = tuple[tuple[LabelPayload, ...], None] | tuple[None, str]


@dataclass(frozen=True, slots=True)
class MissingEnvironmentVariableError(Exception):
    name: str

    @override
    def __str__(self) -> str:
        return f"environment variable {self.name} is required"


class ChatMessage(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    content: str


class ChatChoice(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    message: ChatMessage


class ChatResponse(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    choices: tuple[ChatChoice, ...]


class OllamaResponse(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    message: ChatMessage


class GeminiPart(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    text: str


class GeminiContent(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    parts: tuple[GeminiPart, ...]


class GeminiCandidate(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    content: GeminiContent


class GeminiResponse(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    candidates: tuple[GeminiCandidate, ...]


class PuterMessage(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    content: str | tuple[dict[str, JsonValue], ...]


class PuterResult(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    message: PuterMessage


class PuterResponse(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    success: bool
    result: PuterResult


def _env(k: str) -> str:
    for line in Path(".env").read_text(encoding="utf-8").splitlines():
        if line.startswith(k + "="):
            return line.split("=", 1)[1].strip()
    value = os.environ.get(k)
    if value is None:
        raise MissingEnvironmentVariableError(name=k)
    return value


def build_prompt(records: Sequence[SourceRecord]) -> str:
    rubric = Path(RUBRIC).read_text(encoding="utf-8")
    schema = Path(SCHEMA).read_text(encoding="utf-8")
    payload = [{k: r.get(k) for k in
                ("id", "title", "abstract", "year", "lang", "type", "venue", "topic", "field")}
               for r in records]
    return (
        "You are screening scholarly works for the MetaCan project. Apply the rubric below to EVERY "
        + "record and output ONE JSON array with ONE object per record, conforming EXACTLY to the JSON "
        + "schema below. Output ONLY the JSON array. No prose, no markdown fences, no commentary.\n\n"
        + "# THE RUBRIC (v3.1, locked)\n\n" + rubric
        + "\n\n# THE OUTPUT SCHEMA (screening-schema-v3.json)\n\n" + schema
        + "\n\n# THE RECORDS\n\n" + json.dumps(payload, ensure_ascii=False, indent=1)
        + "\n\nOutput the JSON array now, with exactly "
        + str(len(records)) + " objects, ids matching the records above."
    )


def _post(
    url: str,
    headers: Mapping[str, str],
    payload: JsonValue,
    timeout: int = 240,
) -> JsonValue:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", **headers},
    )
    response: urllib.response.addinfourl = urllib.request.urlopen(req, timeout=timeout)
    with response:
        return JSON_ADAPTER.validate_json(response.read())


def call_openrouter(prompt: str, timeout: int = 240) -> str:
    key = _env("OPENROUTER_API_KEY")
    data = _post(
        "https://openrouter.ai/api/v1/chat/completions",
        {"Authorization": f"Bearer {key}"},
        {
            "model": MODEL_OR,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "max_tokens": 8192,
        },
        timeout,
    )
    return ChatResponse.model_validate(data).choices[0].message.content


def call_nvidia(prompt: str, timeout: int = 240) -> str:
    key = _env("NVIDIA_API_KEY")
    data = _post(
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
        timeout,
    )
    return ChatResponse.model_validate(data).choices[0].message.content


def call_ollama(prompt: str, timeout: int = 600) -> str:
    data = _post(
        "http://localhost:11434/api/chat",
        {},
        {
            "model": MODEL_OLLAMA,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {"temperature": 0},
        },
        timeout,
    )
    return OllamaResponse.model_validate(data).message.content


def call_gemini(prompt: str, timeout: int = 240) -> str:
    # Google AI Studio serves the same open weights; Gemma models there take
    # user content only (no system role) and the key travels in a header, not
    # the URL, so it never appears in an error string or a logged request line.
    key = _env("GEMINI_API_KEY")
    data = _post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_GEMINI}:generateContent",
        {"x-goog-api-key": key},
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 16384},
        },
        timeout,
    )
    parts = GeminiResponse.model_validate(data).candidates[0].content.parts
    return "".join(p.text for p in parts)


def call_puter(prompt: str, timeout: int = 240) -> str:
    # Puter's driver API is the endpoint puter.js speaks once authenticated.
    # Both anonymous signup and the first in-page call are captcha gated, so
    # the token comes from a logged-in puter.com session pasted into .env.
    key = _env("PUTER_AUTH_TOKEN")
    data = _post(
        "https://api.puter.com/drivers/call",
        {"Authorization": f"Bearer {key}", "Origin": "https://puter.com"},
        {
            "interface": "puter-chat-completion",
            "method": "complete",
            "args": {
                "messages": [{"role": "user", "content": prompt}],
                "model": MODEL_PUTER,
                "temperature": 0,
            },
        },
        timeout,
    )
    content = PuterResponse.model_validate(data).result.message.content
    if isinstance(content, str):
        return content
    return "".join(str(part.get("text", "")) for part in content)


BACKENDS: dict[str, Backend] = {
    "openrouter": call_openrouter,
    "nvidia": call_nvidia,
    "ollama": call_ollama,
    "gemini": call_gemini,
    "puter": call_puter,
}
SLEEP: Callable[[float], None] = time.sleep


def label(
    records: Sequence[SourceRecord],
    backend: str = "openrouter",
    retries: int = 3,
    on_attempt: AttemptRecorder | None = None,
) -> LabelResult:
    prompt = build_prompt(records)
    fn = BACKENDS[backend]
    expected_ids = tuple(str(record["id"]) for record in records)
    retry_prompt = prompt
    err = "no attempts made"
    for attempt in range(retries):
        try:
            raw = fn(retry_prompt)
            if on_attempt is not None:
                on_attempt(attempt + 1, retry_prompt, raw)
            result = validate_streams((raw,), expected_ids)
            match result:
                case ValidChunk():
                    return serialize_chunk(result), None
                case InvalidChunk(errors=errors):
                    err = "; ".join(errors)
                    retry_prompt = correction_prompt(prompt, result)
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code}: {e.read()[:200].decode('utf-8', 'replace')}"
            if e.code == 429:
                SLEEP(20 * (attempt + 1))
                continue
        except (urllib.error.URLError, TimeoutError, OSError, KeyError, TypeError, json.JSONDecodeError) as e:
            err = f"{type(e).__name__}: {e}"
        SLEEP(3 * (attempt + 1))
    return None, err


if __name__ == "__main__":
    # smoke test: one backend, three records, and report latency
    import glob
    batch = JSON_ADAPTER.validate_json(
        Path(sorted(glob.glob("pilot/screening/loop/round_001/batch.json"))[0]).read_text(encoding="utf-8")
    )
    if not isinstance(batch, list):
        sys.exit("batch must be a JSON array")
    recs = [record for record in batch if isinstance(record, dict)][:3]
    for b in sys.argv[1:] or ["openrouter"]:
        t0 = time.time()
        arr, err = label(recs, backend=b, retries=1)
        dt = time.time() - t0
        if arr:
            print(f"{b:12s} OK  {len(arr)} labels in {dt:.1f}s")
            print("   sample:", json.dumps(arr[0])[:180])
        else:
            print(f"{b:12s} FAIL in {dt:.1f}s: {err}")
