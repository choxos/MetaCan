#!/usr/bin/env python3
"""Train the v2 student: a SPECTER2 encoder imitating the two teachers.

WHY A SECOND STUDENT. The v1 student (train_distillation.py) is TF-IDF into
per-head linear models: cheap, deterministic, and blind twice over: bags of
words instead of context, and NO ABSTRACTS, because the frame table stores
none. v2 keeps everything honest about v1 (same teachers, same 10,348-work
round-100 sample, same head semantics, same weighted-F-beta thresholding at
beta=2.0, same imitation-only claims) and changes exactly two things: the
text model (allenai/specter2_base, a scientific-paper encoder) and the input
(title + de-inverted abstract from ml/build_abstracts.py + metadata, which
is what the TEACHERS read).

EVALUATION SHAPE, after review. The eval split is grouped BY VENUE, like
v1's out-of-fold scheme, because the venue string sits inside the encoder
text and a random split would let the model recognize held-out works by
their journal. Metrics and thresholds come from a venue-grouped holdout fit;
the DEPLOYED weights are then refit on all 10,348 rows with the same
hyperparameters, which is v1's fit-all-after-measuring pattern. The two
reports still estimate generalization differently (5-fold OOF vs one grouped
holdout) and the report says so; they are compared as estimates of the same
quantity, not as the same estimator.

WHAT IT DOES NOT CHANGE. The ceiling. This model imitates Codex and Gemma;
its metrics are teacher-imitation metrics; nothing here estimates truth.
French strata are reported wherever the holdout carries enough French
POSITIVES (not merely French rows), because SPECTER2's vocabulary is English
and the French stratum must be measured, not assumed.

Run:    python3 -m ml.train_encoder            (M2, MPS; eval fit + refit)
Smoke:  METACAN_SMOKE=1 python3 -m ml.train_encoder
Output: data/db/encoder_model/                 (weights + heads + thresholds)
        pilot/results/encoder_model.json       (report)
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import duckdb
import numpy as np
import torch
import transformers
from sklearn.model_selection import GroupShuffleSplit
from torch import nn
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModel, AutoTokenizer, get_linear_schedule_with_warmup

from ml.distillation_data import SampleRecord, load_training_data
from ml.distillation_targets import (
    BINARY_TARGETS,
    CATEGORICAL_TARGETS,
    binary_value,
    categorical_value,
)
from ml.prediction_policy import weighted_fbeta_threshold

SAMPLE_PATH = Path("pilot/screening/bulk/sample.json")
CODEX_PATH = Path("pilot/screening/loop/round_100/labels_gpt.json")
GEMMA_PATH = Path("pilot/screening/loop/round_100/labels_gemma.json")
ABSTRACTS = Path("data/db/abstracts.parquet")
OUT_DIR = Path("data/db/encoder_model")
REPORT_PATH = Path("pilot/results/encoder_model.json")

ENCODER = "allenai/specter2_base"
MAX_LEN = 320
# Micro-batch 12 with 2-step gradient accumulation: effective batch 24, but
# half the attention-matrix peak, which is what has to fit under the MPS cap
# while the 31B ollama neighbor owns the rest of unified memory (batch 24
# OOMed at the 35 percent cap in the smoke run).
BATCH = 12
GRAD_ACCUM = 2
EPOCHS = 3
LR_ENCODER = 2e-5
LR_HEADS = 1e-3
SEED = 20260719
HOLDOUT_FRACTION = 0.15
BETA = 2.0
TEACHERS = ("codex", "gemma")
# The ollama lane serves gemma4:31b-CLOUD (hosted; zero local GPU memory),
# so this process can take a real share of unified memory. The cap exists so
# a leak degrades to OOM backoff instead of freezing the desktop; 0.35 was
# sized for a resident-31B neighbor that turned out not to exist and OOMed
# even micro-batches.
MPS_MEMORY_FRACTION = 0.6
EMPTY_CACHE_EVERY = 200

SMOKE = bool(int(os.environ.get("METACAN_SMOKE", "0")))

HASHED_PATHS = (
    SAMPLE_PATH,
    CODEX_PATH,
    GEMMA_PATH,
    Path("docs/protocol/rubric-v3.md"),
    Path("docs/protocol/screening-schema-v3.json"),
    Path("ml/train_encoder.py"),
    Path("ml/distillation_targets.py"),
    Path("ml/prediction_policy.py"),
    Path("ml/chunk_validation.py"),
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def encoder_text(record: SampleRecord, abstract: str | None) -> str:
    """Natural text, not feature tokens: encoders read prose. Title and
    abstract first (what SPECTER2 was pretrained on), a short metadata tail
    after the separator so venue and field remain visible. MUST stay
    byte-identical with ml/apply_encoder.py's row_text."""
    tail_bits = [
        record.venue or "",
        record.topic or "",
        record.field or "",
        record.lang or "",
        record.type or "",
        str(record.year) if record.year else "",
    ]
    tail = "; ".join(x for x in tail_bits if x)
    body = (abstract or "").strip()
    return f"{(record.title or '').strip()} [SEP] {body} [SEP] {tail}"


class WorkDataset(Dataset):
    def __init__(self, texts: list[str], tokenizer, targets: dict[str, np.ndarray], weights: np.ndarray):
        self.texts = texts
        self.tokenizer = tokenizer
        self.targets = targets
        self.weights = weights

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, i: int):
        enc = self.tokenizer(
            self.texts[i],
            truncation=True,
            max_length=MAX_LEN,
            padding="max_length",
            return_tensors="pt",
        )
        item = {k: v.squeeze(0) for k, v in enc.items()}
        item["weight"] = torch.tensor(self.weights[i], dtype=torch.float32)
        for name, arr in self.targets.items():
            item[name] = torch.tensor(arr[i])
        return item


class EncoderStudent(nn.Module):
    """One shared trunk, one head per teacher per target: the same contract
    the v1 artifact exposes, so the site's candidate/consensus policy applies
    unchanged. `encoder_source` lets apply-time code build straight from the
    saved local encoder instead of downloading the base model first."""

    def __init__(self, n_binary: int, categorical_sizes: dict[str, int], encoder_source: str | Path = ENCODER):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(encoder_source)
        hidden = self.encoder.config.hidden_size
        self.dropout = nn.Dropout(0.1)
        self.binary_heads = nn.ModuleDict(
            {teacher: nn.Linear(hidden, n_binary) for teacher in TEACHERS}
        )
        self.categorical_heads = nn.ModuleDict(
            {
                teacher: nn.ModuleDict(
                    {name: nn.Linear(hidden, size) for name, size in categorical_sizes.items()}
                )
                for teacher in TEACHERS
            }
        )

    def forward(self, input_ids, attention_mask):
        out = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        pooled = self.dropout(out.last_hidden_state[:, 0])
        binary = {t: self.binary_heads[t](pooled) for t in TEACHERS}
        categorical = {
            t: {name: head(pooled) for name, head in self.categorical_heads[t].items()}
            for t in TEACHERS
        }
        return binary, categorical


def weighted_average_precision(labels: np.ndarray, scores: np.ndarray, weights: np.ndarray) -> float:
    """Design-weighted AP over SCORE GROUPS: tied scores are one decision
    point, not len(ties) of them, so the result cannot depend on sort order
    within a tie. The sample is stratified; unweighted AP would answer a
    question about the design instead of the frame."""
    y = labels.astype(float)
    total_pos = float((weights * y).sum())
    if total_pos <= 0:
        return float("nan")
    order = np.argsort(-scores, kind="stable")
    s, y, w = scores[order], y[order], weights[order]
    ap = 0.0
    tp = fp = 0.0
    prev_recall = 0.0
    i = 0
    n = len(s)
    while i < n:
        j = i
        while j < n and s[j] == s[i]:
            j += 1
        tp += float((w[i:j] * y[i:j]).sum())
        fp += float((w[i:j] * (1 - y[i:j])).sum())
        recall = tp / total_pos
        precision = tp / max(tp + fp, 1e-12)
        ap += precision * (recall - prev_recall)
        prev_recall = recall
        i = j
    return float(ap)


def fit_model(
    texts: list[str],
    targets: dict[str, np.ndarray],
    weights: np.ndarray,
    idx: np.ndarray,
    tokenizer,
    sizes: dict[str, int],
    device: torch.device,
    epochs: int,
    label: str,
) -> EncoderStudent:
    torch.manual_seed(SEED)
    model = EncoderStudent(len(BINARY_TARGETS), sizes).to(device)
    dataset = WorkDataset(
        [texts[i] for i in idx],
        tokenizer,
        {k: v[idx] for k, v in targets.items()},
        weights[idx] / weights[idx].mean(),
    )
    loader = DataLoader(dataset, batch_size=BATCH, shuffle=True)
    head_params = [p for n_, p in model.named_parameters() if not n_.startswith("encoder.")]
    optimizer = torch.optim.AdamW(
        [
            {"params": model.encoder.parameters(), "lr": LR_ENCODER},
            {"params": head_params, "lr": LR_HEADS},
        ],
        weight_decay=0.01,
    )
    total_updates = (len(loader) + GRAD_ACCUM - 1) // GRAD_ACCUM * epochs
    scheduler = get_linear_schedule_with_warmup(optimizer, int(total_updates * 0.1), total_updates)
    bce = nn.BCEWithLogitsLoss(reduction="none")
    ce = nn.CrossEntropyLoss(reduction="none")

    model.train()
    for epoch in range(epochs):
        running = 0.0
        optimizer.zero_grad(set_to_none=True)
        for step, batch in enumerate(loader):
            batch = {k: v.to(device) for k, v in batch.items()}
            binary, categorical = model(batch["input_ids"], batch["attention_mask"])
            w = batch["weight"]
            loss = torch.tensor(0.0, device=device)
            for teacher in TEACHERS:
                lb = bce(binary[teacher], batch[f"{teacher}_binary"]).mean(dim=1)
                loss = loss + (lb * w).mean()
                for name in sizes:
                    lc = ce(categorical[teacher][name], batch[f"{teacher}_{name}"])
                    loss = loss + (lc * w).mean() / len(sizes)
            (loss / GRAD_ACCUM).backward()
            if (step + 1) % GRAD_ACCUM == 0 or step + 1 == len(loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad(set_to_none=True)
            running += float(loss.detach())
            if (step + 1) % 100 == 0:
                print(
                    f"[{label}] epoch {epoch + 1} step {step + 1}/{len(loader)} loss {running / 100:.4f}",
                    flush=True,
                )
                running = 0.0
            if device.type == "mps" and (step + 1) % EMPTY_CACHE_EVERY == 0:
                torch.mps.empty_cache()
    return model


def score_holdout(model, texts, targets, hold_idx, tokenizer, sizes, device):
    dataset = WorkDataset(
        [texts[i] for i in hold_idx],
        tokenizer,
        {k: v[hold_idx] for k, v in targets.items()},
        np.ones(len(hold_idx)),
    )
    loader = DataLoader(dataset, batch_size=BATCH * 2, shuffle=False)
    bin_scores = {t: [] for t in TEACHERS}
    cat_scores = {t: {n_: [] for n_ in sizes} for t in TEACHERS}
    model.eval()
    with torch.no_grad():
        for batch in loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            binary, categorical = model(batch["input_ids"], batch["attention_mask"])
            for t in TEACHERS:
                bin_scores[t].append(torch.sigmoid(binary[t]).cpu().numpy())
                for name in sizes:
                    cat_scores[t][name].append(torch.softmax(categorical[t][name], dim=1).cpu().numpy())
    return (
        {t: np.vstack(v) for t, v in bin_scores.items()},
        {t: {n_: np.vstack(v) for n_, v in d.items()} for t, d in cat_scores.items()},
    )


def main() -> None:
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    device = torch.device(
        "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    )
    if device.type == "mps":
        torch.mps.set_per_process_memory_fraction(MPS_MEMORY_FRACTION)
    print(f"device: {device}", flush=True)

    data = load_training_data(SAMPLE_PATH, CODEX_PATH, GEMMA_PATH)
    if SMOKE:
        data = type(data)(
            records=data.records[:400],
            codex_labels=data.codex_labels[:400],
            gemma_labels=data.gemma_labels[:400],
        )
        print("SMOKE MODE: 400 rows, 1 epoch, artifacts not saved", flush=True)
    epochs = 1 if SMOKE else EPOCHS
    ids = [str(r.id) for r in data.records]

    con = duckdb.connect()
    abs_rows = con.execute(
        f"SELECT id, abstract FROM '{ABSTRACTS}' WHERE id IN (SELECT unnest(?::VARCHAR[]))",
        [ids],
    ).fetchall()
    abstracts = dict(abs_rows)
    n_abs = sum(1 for i in ids if i in abstracts)
    print(f"{len(ids):,} works, {n_abs:,} with abstracts", flush=True)

    texts = [encoder_text(r, abstracts.get(str(r.id))) for r in data.records]
    weights = np.array([r.weight for r in data.records], dtype=np.float64)

    labels_by_teacher = {"codex": data.codex_labels, "gemma": data.gemma_labels}
    targets: dict[str, np.ndarray] = {}
    categorical_values: dict[str, list[str]] = {}
    for teacher in TEACHERS:
        recs = labels_by_teacher[teacher]
        targets[f"{teacher}_binary"] = np.array(
            [[binary_value(rec, t) for t in BINARY_TARGETS] for rec in recs], dtype=np.float32
        )
        for ct in CATEGORICAL_TARGETS:
            values = list(ct.values)
            categorical_values[ct.name] = values
            index = {v: k for k, v in enumerate(values)}
            targets[f"{teacher}_{ct.name}"] = np.array(
                [index[categorical_value(rec, ct)] for rec in recs], dtype=np.int64
            )

    # Venue-grouped eval split: v1 holds out whole venues, and the venue
    # string sits inside the encoder text, so a random split would let the
    # model recognize held-out works by their journal.
    groups = np.array([r.venue or "UNKNOWN_VENUE" for r in data.records])
    splitter = GroupShuffleSplit(n_splits=1, test_size=HOLDOUT_FRACTION, random_state=SEED)
    train_idx, hold_idx = next(splitter.split(np.arange(len(ids)), groups=groups))
    print(
        f"eval fit: train {len(train_idx):,}, holdout {len(hold_idx):,}"
        f" ({len(set(groups[hold_idx]))} held-out venues)",
        flush=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(ENCODER)
    sizes = {ct.name: len(ct.values) for ct in CATEGORICAL_TARGETS}

    eval_model = fit_model(texts, targets, weights, train_idx, tokenizer, sizes, device, epochs, "eval")
    bin_scores, cat_scores = score_holdout(eval_model, texts, targets, hold_idx, tokenizer, sizes, device)
    del eval_model
    if device.type == "mps":
        torch.mps.empty_cache()

    hold_weights = weights[hold_idx]
    hold_langs = np.array([data.records[i].lang or "" for i in hold_idx])

    report_heads: dict[str, dict] = {}
    thresholds: dict[str, float] = {}
    for t in TEACHERS:
        scores = bin_scores[t]
        for j, target in enumerate(BINARY_TARGETS):
            y = targets[f"{t}_binary"][hold_idx][:, j].astype(bool)
            s = scores[:, j].astype(float)
            sel = weighted_fbeta_threshold(list(y), list(s), list(hold_weights), beta=BETA)
            thresholds[f"{t}:{target.name}"] = sel.threshold
            entry: dict = {
                "weighted_ap": weighted_average_precision(y, s, hold_weights),
                "threshold": sel.threshold,
                "positives_in_holdout": int(y.sum()),
            }
            fr = hold_langs == "fr"
            entry["fr_rows_in_holdout"] = int(fr.sum())
            entry["fr_positives_in_holdout"] = int(y[fr].sum())
            # Gate on POSITIVES: twenty French rows with two positives is an
            # anecdote, not a stratum estimate.
            if y[fr].sum() >= 10:
                entry["weighted_ap_fr"] = weighted_average_precision(y[fr], s[fr], hold_weights[fr])
            en = hold_langs == "en"
            if y[en].sum() >= 10:
                entry["weighted_ap_en"] = weighted_average_precision(y[en], s[en], hold_weights[en])
            report_heads[f"{t}:{target.name}"] = entry
        for name in sizes:
            probs = cat_scores[t][name]
            y_idx = targets[f"{t}_{name}"][hold_idx]
            pred = probs.argmax(axis=1)
            acc = float(((pred == y_idx) * hold_weights).sum() / hold_weights.sum())
            report_heads[f"{t}:{name}"] = {"weighted_accuracy": acc}

    if SMOKE:
        print("SMOKE TRAIN OK: shapes, loss, holdout scoring, thresholds all ran", flush=True)
        return

    # The deployed weights: refit on ALL rows with the measured
    # hyperparameters, v1's fit-all-after-measuring pattern. Thresholds stay
    # the holdout-fitted ones; refitting them on training scores would be
    # optimistic in the known direction.
    final_model = fit_model(
        texts, targets, weights, np.arange(len(ids)), tokenizer, sizes, device, epochs, "final"
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tokenizer.save_pretrained(OUT_DIR / "tokenizer")
    final_model.encoder.save_pretrained(OUT_DIR / "encoder")
    torch.save(
        {
            "binary_heads": final_model.binary_heads.state_dict(),
            "categorical_heads": final_model.categorical_heads.state_dict(),
        },
        OUT_DIR / "heads.pt",
    )

    hashes = {str(p): sha256(p) for p in HASHED_PATHS}
    hashes[str(ABSTRACTS)] = sha256(ABSTRACTS)
    hashes["ml/build_abstracts.py"] = sha256(Path("ml/build_abstracts.py"))
    weight_hashes = {
        "heads.pt": sha256(OUT_DIR / "heads.pt"),
        **{
            f"encoder/{f.name}": sha256(f)
            for f in sorted((OUT_DIR / "encoder").glob("*.safetensors"))
        },
    }
    digest = hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()[:12]
    version = f"metacan-v2-encoder-{digest}"
    config = {
        "model_version": version,
        "encoder": ENCODER,
        "max_len": MAX_LEN,
        "teachers": list(TEACHERS),
        "binary_targets": [t.name for t in BINARY_TARGETS],
        "categorical_values": categorical_values,
        "thresholds": thresholds,
        "beta": BETA,
        "holdout_fraction": HOLDOUT_FRACTION,
        "split": "venue-grouped (GroupShuffleSplit)",
        "seed": SEED,
        "epochs": EPOCHS,
        "software": {"torch": torch.__version__, "transformers": transformers.__version__},
        "input_hashes": hashes,
        "weight_hashes": weight_hashes,
    }
    (OUT_DIR / "config.json").write_text(json.dumps(config, indent=2))

    report = {
        "model_version": version,
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "purpose": "full_frame_teacher_distillation (v2 encoder arm)",
        "training_rows_eval_fit": len(train_idx),
        "holdout_rows": len(hold_idx),
        "training_rows_final_fit": len(ids),
        "abstract_coverage_in_sample": n_abs / len(ids),
        "evaluation_note": (
            "Venue-grouped holdout (the venue string is inside the encoder"
            " text; a random split would leak it), thresholds fitted on the"
            " same holdout at beta=2, deployed weights refit on all rows."
            " v1's report uses 5-fold grouped out-of-fold estimates of the"
            " same quantity; the two are compared as different estimators of"
            " one thing, not as one estimator. All metrics are"
            " TEACHER-IMITATION metrics under design weights; nothing here"
            " estimates scientific truth. French strata appear only where the"
            " holdout carries at least 10 French POSITIVES."
        ),
        "heads": report_heads,
        "prediction_status": "machine_predicted_unvalidated",
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(json.dumps({k: v for k, v in report.items() if k != "heads"}, indent=2), flush=True)
    for k in sorted(report_heads):
        print(k, report_heads[k], flush=True)
    print(f"TRAIN ENCODER COMPLETE: {version}", flush=True)


if __name__ == "__main__":
    main()
