from __future__ import annotations

import argparse
import json
from collections.abc import Sequence
from pathlib import Path

from ml.classifier_data import load_training_corpus


def _paths(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--batch", type=Path, required=True)
    parser.add_argument("--codex-labels", type=Path, required=True)
    parser.add_argument("--gemma-labels", type=Path, required=True)
    parser.add_argument("--schema", type=Path, required=True)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train and apply the MetaCan frame classifier")
    commands = parser.add_subparsers(dest="command", required=True)
    validate = commands.add_parser("validate")
    _paths(validate)
    train = commands.add_parser("train")
    _paths(train)
    train.add_argument("--output", type=Path, required=True)
    train.add_argument("--seed", type=int, default=20260714)
    apply = commands.add_parser("apply")
    apply.add_argument("--frame", type=Path, required=True)
    apply.add_argument("--artifact", type=Path, required=True)
    apply.add_argument("--parts", type=Path, required=True)
    apply.add_argument("--output", type=Path, required=True)
    apply.add_argument("--limit", type=int)
    apply.add_argument("--resume", action="store_true")
    verify = commands.add_parser("verify")
    verify.add_argument("--frame", type=Path, required=True)
    verify.add_argument("--artifact", type=Path, required=True)
    verify.add_argument("--parts", type=Path, required=True)
    verify.add_argument("--output", type=Path)
    verify.add_argument("--limit", type=int)
    return parser


def _validate(args: argparse.Namespace) -> int:
    corpus = load_training_corpus(
        args.batch,
        args.codex_labels,
        args.gemma_labels,
        args.schema,
    )
    print(
        json.dumps(
            {
                "records": len(corpus.works),
                "teachers": dict(corpus.teacher_aliases),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "validate":
        return _validate(args)
    if args.command == "train":
        from ml.classifier_model import TrainConfig, train_artifact

        train_artifact(
            TrainConfig(
                batch=args.batch,
                codex_labels=args.codex_labels,
                gemma_labels=args.gemma_labels,
                schema=args.schema,
                output=args.output,
                seed=args.seed,
            )
        )
        return 0
    if args.command == "apply":
        from ml.classifier_inference import ApplyConfig, apply_artifact

        apply_artifact(
            ApplyConfig(
                frame=args.frame,
                artifact=args.artifact,
                parts=args.parts,
                output=args.output,
                limit=args.limit,
                resume=args.resume,
            )
        )
        return 0
    from ml.classifier_inference import VerifyConfig, verify_application

    verify_application(
        VerifyConfig(
            frame=args.frame,
            artifact=args.artifact,
            parts=args.parts,
            output=args.output,
            limit=args.limit,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
