"""Recover chunks whose labels exist on disk but were never harvested.

THE BUG THIS REPAIRS
--------------------
run_loop_round.sh parses the model's answer out of STDOUT. For 42 of round_100's
414 codex chunks, the codex CLI wrote the complete JSON array to STDERR and left
stdout empty, so the harness said "no v3 JSON array in stdout" and moved on. The
wrapper then retried those chunks thirty times, and each retry failed the same
way, deterministically, on labels that were already sitting in the run directory.
Thirty passes of a resilient wrapper cannot fix a parser that is reading the
wrong stream.

So this script re-reads BOTH streams for every missing chunk and salvages any
array that parses and matches the chunk's expected ids. A salvaged chunk is
identical to a fresh one; the validator checks set equality against batch.json
either way, and anything that does not match the ids it claims is discarded here
rather than trusted.

Chunks with no recoverable array in either stream are listed for a re-run: those
are the ones the EPERM window killed before codex produced anything at all.
"""

from __future__ import annotations

import sys
from pathlib import Path

from ml.screening_chunks import InvalidChunk, ValidatedChunk
from ml.screening_repair import extract_json_arrays
from ml.screening_round import (
    CandidateProvenance,
    CandidateRejected,
    ChunkKey,
    ScreeningArm,
    accept_candidate,
    inspect_existing,
    load_round_contract,
    quarantine_existing,
)

RD = Path("pilot/screening/loop/round_100")


def main(arm: str = "codex") -> None:
    contract = load_round_contract(RD)
    screening_arm = ScreeningArm(arm)
    raw_dir = RD / f"raw_{arm}"
    salvaged: list[int] = []
    unrecoverable: list[int] = []
    for expectation in contract.expectations:
        number = int(expectation.number)
        key = ChunkKey(screening_arm, number)
        inspected = inspect_existing(contract, key)
        if isinstance(inspected, ValidatedChunk):
            continue
        if isinstance(inspected, InvalidChunk):
            quarantine_existing(contract, key)
        found = False
        for stream in ("stdout", "stderr"):
            path = raw_dir / f"{stream}_{number:03d}.txt"
            if not path.is_file():
                continue
            try:
                raw = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for candidate in extract_json_arrays(raw):
                try:
                    accept_candidate(
                        contract,
                        key,
                        candidate,
                        CandidateProvenance(
                            model_id="gpt-5.6-luna" if arm == "codex" else None,
                            backend=None,
                            attempt=None,
                            source_stream=stream,
                            origin="preexisting",
                        ),
                    )
                except CandidateRejected:
                    continue
                found = True
                break
            if found:
                break
        if found:
            salvaged.append(number)
        else:
            unrecoverable.append(number)

    print(
        f"[salvage {arm}] salvaged {len(salvaged)} chunks from disk: "
        f"{' '.join(f'{number:03d}' for number in salvaged) or 'none'}"
    )
    print(
        f"[salvage {arm}] {len(unrecoverable)} chunks have no recoverable array "
        "and must be re-run: "
        f"{' '.join(f'{number:03d}' for number in unrecoverable) or 'none'}"
    )
    valid = sum(
        isinstance(
            inspect_existing(contract, ChunkKey(screening_arm, int(expectation.number))),
            ValidatedChunk,
        )
        for expectation in contract.expectations
    )
    print(f"[salvage {arm}] {valid}/{len(contract.expectations)} chunks now valid")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "codex")
