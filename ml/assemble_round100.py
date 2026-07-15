from __future__ import annotations

import argparse
from collections.abc import Sequence
from pathlib import Path

from ml.screening_round import assemble_round, load_round_contract

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ROUND = ROOT / "pilot/screening/loop/round_100"


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Assemble validated round 100 labels")
    parser.add_argument("--round-dir", type=Path, default=DEFAULT_ROUND)
    args = parser.parse_args(argv)
    result = assemble_round(load_round_contract(args.round_dir))
    print(result.status)


if __name__ == "__main__":
    main()
