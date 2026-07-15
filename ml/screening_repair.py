from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, cast

from pydantic import JsonValue

from ml.screening_chunks import InvalidChunk, ValidatedChunk
from ml.screening_round import (
    CandidateProvenance,
    CandidateRejected,
    ChunkKey,
    RoundContract,
    accept_candidate,
    atomic_write_text,
    chunk_path,
    inspect_existing,
    quarantine_candidate,
    quarantine_existing,
)

StreamName = Literal["stdout", "stderr", "response"]
AcceptedSource = Literal["stdout", "stderr", "response", "existing"]


@dataclass(frozen=True, slots=True)
class StreamOutput:
    name: StreamName
    text: str


@dataclass(frozen=True, slots=True)
class AttemptOutput:
    model_id: str
    backend: str
    streams: tuple[StreamOutput, ...]


@dataclass(frozen=True, slots=True)
class AcceptedAttempt:
    chunk_path: Path
    attempt: int
    source_stream: AcceptedSource


class RepairExhausted(RuntimeError):
    pass


type AttemptRunner = Callable[[int], AttemptOutput]


def extract_json_arrays(text: str) -> tuple[str, ...]:
    decoder = json.JSONDecoder()
    candidates: list[str] = []
    position = 0
    while True:
        start = text.find("[", position)
        if start < 0:
            break
        try:
            decoded = decoder.raw_decode(text[start:])
        except json.JSONDecodeError:
            position = start + 1
            continue
        value = cast(JsonValue, decoded[0])
        width = decoded[1]
        if isinstance(value, list):
            candidates.append(
                json.dumps(
                    value,
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                )
            )
        position = start + max(width, 1)
    return tuple(candidates)


def _persist_stream(
    contract: RoundContract,
    key: ChunkKey,
    stream: StreamOutput,
    attempt: int,
) -> None:
    path = (
        contract.round_dir
        / f"raw_{key.arm.value}"
        / "attempts"
        / f"chunk_{key.number:03d}"
        / f"attempt_{attempt:02d}.{stream.name}.txt"
    )
    atomic_write_text(path, stream.text)


def accept_attempt_output(
    contract: RoundContract,
    key: ChunkKey,
    output: AttemptOutput,
    *,
    attempt: int,
) -> AcceptedAttempt | None:
    for stream in output.streams:
        _persist_stream(contract, key, stream, attempt)
        for candidate in extract_json_arrays(stream.text):
            provenance = CandidateProvenance(
                model_id=output.model_id,
                backend=output.backend,
                attempt=attempt,
                source_stream=stream.name,
                origin="repair",
            )
            try:
                accept_candidate(contract, key, candidate, provenance)
            except CandidateRejected as error:
                quarantine_candidate(
                    contract,
                    key,
                    candidate,
                    error.failure,
                    attempt=attempt,
                )
                continue
            return AcceptedAttempt(
                chunk_path=chunk_path(contract, key),
                attempt=attempt,
                source_stream=stream.name,
            )
    return None


def repair_chunk(
    contract: RoundContract,
    key: ChunkKey,
    runner: AttemptRunner,
    *,
    max_attempts: int = 3,
) -> AcceptedAttempt:
    if max_attempts < 1:
        raise ValueError("max attempts must be positive")
    existing = inspect_existing(contract, key)
    if isinstance(existing, ValidatedChunk):
        return AcceptedAttempt(
            chunk_path=chunk_path(contract, key),
            attempt=0,
            source_stream="existing",
        )
    if isinstance(existing, InvalidChunk):
        quarantine_existing(contract, key)
    for attempt in range(1, max_attempts + 1):
        accepted = accept_attempt_output(
            contract,
            key,
            runner(attempt),
            attempt=attempt,
        )
        if accepted is not None:
            return accepted
    raise RepairExhausted(f"{key.arm.value} chunk {key.number:03d} failed {max_attempts} attempts")
