from __future__ import annotations

import argparse
import concurrent.futures as futures
import json
import subprocess
import sys
import urllib.error
from collections.abc import Sequence
from pathlib import Path

from pydantic import JsonValue, ValidationError

from ml import gemma
from ml.screening_chunks import InvalidChunk, ValidatedChunk
from ml.screening_repair import (
    AttemptOutput,
    StreamOutput,
    repair_chunk,
)
from ml.screening_round import (
    ChunkKey,
    RoundContract,
    ScreeningArm,
    assemble_round,
    inspect_existing,
    load_round_contract,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ROUND = ROOT / "pilot/screening/loop/round_100"
DEFAULT_CODEX_MODEL = "gpt-5.6-luna"


def round_inventory(contract: RoundContract) -> dict[str, object]:
    summary: dict[str, object] = {"chunks_expected": len(contract.expectations)}
    for arm in ScreeningArm:
        valid = 0
        invalid: list[int] = []
        missing: list[int] = []
        for expectation in contract.expectations:
            key = ChunkKey(arm, int(expectation.number))
            inspected = inspect_existing(contract, key)
            if isinstance(inspected, ValidatedChunk):
                valid += 1
            elif isinstance(inspected, InvalidChunk):
                invalid.append(key.number)
            else:
                missing.append(key.number)
        summary[arm.value] = {
            "invalid": invalid,
            "missing": missing,
            "valid": valid,
        }
    return summary


def _codex_output(
    prompt_path: Path,
    model_id: str,
    timeout_seconds: int,
) -> AttemptOutput:
    prompt = prompt_path.read_text(encoding="utf-8")
    command = [
        "codex",
        "exec",
        "--model",
        model_id,
        "-c",
        'model_reasoning_effort="medium"',
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        prompt,
    ]
    try:
        completed = subprocess.run(
            command,
            cwd=ROOT,
            input="",
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
        stdout = completed.stdout
        stderr = completed.stderr
    except subprocess.TimeoutExpired as error:
        stdout = error.stdout if isinstance(error.stdout, str) else ""
        stderr = error.stderr if isinstance(error.stderr, str) else "timeout"
    except FileNotFoundError:
        stdout = ""
        stderr = "codex executable not found"
    return AttemptOutput(
        model_id=model_id,
        backend="codex-cli",
        streams=(StreamOutput("stdout", stdout), StreamOutput("stderr", stderr)),
    )


def _gemma_output(
    records: Sequence[dict[str, JsonValue]],
    backend: gemma.Backend,
) -> AttemptOutput:
    prompt = gemma.build_prompt(records)
    function = gemma.BACKENDS[backend]
    try:
        response = function(prompt)
    except urllib.error.HTTPError as error:
        response = f"request failed with HTTP status {error.code}"
    except (
        urllib.error.URLError,
        TimeoutError,
        OSError,
        RuntimeError,
        ValidationError,
    ) as error:
        response = f"request failed with {type(error).__name__}"
    return AttemptOutput(
        model_id=gemma.model_id(backend),
        backend=backend,
        streams=(StreamOutput("response", response),),
    )


def _records_for_key(contract: RoundContract, key: ChunkKey) -> list[dict[str, JsonValue]]:
    wanted = set(contract.expectation(key.number).ids)
    return [dict(record) for record in contract.batch if record.get("id") in wanted]


def _keys_to_repair(
    contract: RoundContract,
    arm: ScreeningArm,
    selected: set[int] | None,
) -> list[ChunkKey]:
    keys: list[ChunkKey] = []
    for expectation in contract.expectations:
        key = ChunkKey(arm, int(expectation.number))
        if selected is not None and key.number not in selected:
            continue
        if not isinstance(inspect_existing(contract, key), ValidatedChunk):
            keys.append(key)
    return keys


def repair_arm(
    contract: RoundContract,
    arm: ScreeningArm,
    *,
    selected: set[int] | None,
    workers: int,
    codex_model: str,
    gemma_backends: tuple[gemma.Backend, ...],
    timeout_seconds: int,
) -> None:
    keys = _keys_to_repair(contract, arm, selected)
    if not keys:
        print(f"{arm.value}: every selected chunk is already valid", flush=True)
        return

    def run(key: ChunkKey) -> str:
        def attempt_runner(attempt: int) -> AttemptOutput:
            if arm is ScreeningArm.CODEX:
                prompt = contract.round_dir / "prompts" / f"prompt_{key.number:03d}.txt"
                return _codex_output(prompt, codex_model, timeout_seconds)
            backend = gemma_backends[(key.number + attempt - 2) % len(gemma_backends)]
            return _gemma_output(_records_for_key(contract, key), backend)

        accepted = repair_chunk(contract, key, attempt_runner, max_attempts=3)
        return (
            f"{arm.value} chunk {key.number:03d}: accepted attempt "
            f"{accepted.attempt} from {accepted.source_stream}"
        )

    failures: list[str] = []
    with futures.ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        pending = {executor.submit(run, key): key for key in keys}
        for completed in futures.as_completed(pending):
            key = pending[completed]
            try:
                print(completed.result(), flush=True)
            except (RuntimeError, OSError, ValueError) as error:
                message = f"{arm.value} chunk {key.number:03d}: {error}"
                failures.append(message)
                print(message, file=sys.stderr, flush=True)
    if failures:
        raise SystemExit(f"{len(failures)} chunks remain invalid")


def _parse_chunks(raw: str | None) -> set[int] | None:
    if raw is None:
        return None
    return {int(value) for value in raw.split(",") if value.strip()}


def _parse_backend(value: str) -> gemma.Backend:
    match value:
        case "openrouter":
            return "openrouter"
        case "nvidia":
            return "nvidia"
        case "ollama":
            return "ollama"
        case _:
            raise ValueError(f"unknown Gemma backend: {value}")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate and repair round 100 chunks")
    parser.add_argument("--round-dir", type=Path, default=DEFAULT_ROUND)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("check")
    repair = subparsers.add_parser("repair")
    repair.add_argument("--arm", choices=[arm.value for arm in ScreeningArm], required=True)
    repair.add_argument("--chunks")
    repair.add_argument("--workers", type=int, default=4)
    repair.add_argument("--codex-model", default=DEFAULT_CODEX_MODEL)
    repair.add_argument(
        "--gemma-backends",
        default="ollama,nvidia,openrouter",
    )
    repair.add_argument("--timeout-seconds", type=int, default=900)
    subparsers.add_parser("assemble")
    return parser


def main(argv: Sequence[str] | None = None) -> None:
    args = _parser().parse_args(argv)
    contract = load_round_contract(args.round_dir)
    if args.command == "check":
        print(json.dumps(round_inventory(contract), indent=2))
        return
    if args.command == "assemble":
        result = assemble_round(contract)
        print(result.status)
        return
    raw_backends = tuple(value for value in args.gemma_backends.split(",") if value)
    if not raw_backends or any(value not in gemma.BACKENDS for value in raw_backends):
        raise SystemExit("gemma backends must name configured backends")
    backends: tuple[gemma.Backend, ...] = tuple(
        _parse_backend(value) for value in raw_backends
    )
    repair_arm(
        contract,
        ScreeningArm(args.arm),
        selected=_parse_chunks(args.chunks),
        workers=args.workers,
        codex_model=args.codex_model,
        gemma_backends=backends,
        timeout_seconds=args.timeout_seconds,
    )


if __name__ == "__main__":
    main()
