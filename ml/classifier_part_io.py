from __future__ import annotations

# pyright: reportUnknownMemberType=false
import hashlib
import os
import tempfile
from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, cast

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
from numpy.typing import NDArray

from ml.classifier_artifacts import sha256_bytes
from ml.classifier_data import ALL_TARGETS, TargetFamily, Teacher
from ml.classifier_model_types import HeadKey, HeadState, ModelBundle
from ml.features import PAYLOAD_FRAME_PARITY, render

FRAME_COLUMNS = ("id", *PAYLOAD_FRAME_PARITY)


@dataclass(frozen=True, slots=True)
class FramePart:
    index: int
    offset_start: int
    table: pa.Table

    @property
    def offset_end(self) -> int:
        return self.offset_start + self.table.num_rows


class HashDigest(Protocol):
    def update(self, value: bytes, /) -> None: ...


def frame_row_count(path: Path) -> int:
    metadata = pq.ParquetFile(path).metadata
    return metadata.num_rows


def iter_frame_parts(
    path: Path,
    total_rows: int,
    part_size: int,
) -> Iterator[FramePart]:
    source = pq.ParquetFile(path)
    missing = sorted(set(FRAME_COLUMNS) - set(source.schema_arrow.names))
    if missing:
        raise ValueError(f"frame is missing classifier fields: {', '.join(missing)}")
    batches: list[pa.RecordBatch] = []
    accumulated = 0
    emitted = 0
    part_index = 0
    for incoming in source.iter_batches(batch_size=part_size, columns=list(FRAME_COLUMNS)):
        position = 0
        while position < incoming.num_rows and emitted + accumulated < total_rows:
            needed = min(part_size - accumulated, total_rows - emitted - accumulated)
            take = min(needed, incoming.num_rows - position)
            batches.append(incoming.slice(position, take))
            accumulated += take
            position += take
            if accumulated == part_size or emitted + accumulated == total_rows:
                table = pa.Table.from_batches(batches)
                yield FramePart(part_index, emitted, table)
                emitted += accumulated
                part_index += 1
                batches = []
                accumulated = 0
        if emitted == total_rows:
            break
    if emitted != total_rows:
        raise ValueError(f"frame ended at {emitted:,} rows; expected {total_rows:,}")


def table_hash(table: pa.Table) -> str:
    sink = pa.BufferOutputStream()
    with pa.ipc.new_stream(sink, table.schema) as writer:
        writer.write_table(table)
    return sha256_bytes(sink.getvalue().to_pybytes())


def update_ids_hash(digest: HashDigest, identifiers: Sequence[str]) -> None:
    for identifier in identifiers:
        encoded = identifier.encode("utf-8")
        digest.update(len(encoded).to_bytes(4, "big"))
        digest.update(encoded)


def ordered_ids(table: pa.Table) -> tuple[str, ...]:
    values = table.column("id").to_pylist()
    if any(not isinstance(value, str) for value in values):
        raise ValueError("frame ids must be nonnull strings")
    return cast(tuple[str, ...], tuple(values))


def ordered_ids_hash(table: pa.Table) -> str:
    digest = hashlib.sha256()
    update_ids_hash(digest, ordered_ids(table))
    return digest.hexdigest()


def prediction_schema() -> pa.Schema:
    fields: list[pa.Field[pa.DataType]] = [
        pa.field("id", pa.string(), nullable=False)
    ]
    for target in ALL_TARGETS:
        for teacher in Teacher:
            fields.append(pa.field(f"score__{teacher.value}__{target.name}", pa.float32()))
        fields.extend(
            (
                pa.field(f"candidate_union__{target.name}", pa.bool_()),
                pa.field(f"consensus_intersection__{target.name}", pa.bool_()),
            )
        )
    return pa.schema(fields)


def _head(
    bundle: ModelBundle, teacher: Teacher, family: TargetFamily, target: str
) -> HeadState:
    return bundle.head(HeadKey(teacher, family, target))


def score_part(bundle: ModelBundle, frame: pa.Table) -> pa.Table:
    records = cast(list[dict[str, object]], frame.to_pylist())
    texts = tuple(render_work_from_mapping(record) for record in records)
    matrix = bundle.vectorizer.transform(texts)
    columns: dict[str, pa.StringArray | pa.FloatArray | pa.BooleanArray] = {
        "id": pa.array(ordered_ids(frame), type=pa.string())
    }
    for target in ALL_TARGETS:
        teacher_scores: dict[Teacher, NDArray[np.float32] | None] = {}
        for teacher in Teacher:
            head = _head(bundle, teacher, target.family, target.name)
            if head.estimator is None or head.threshold is None:
                teacher_scores[teacher] = None
                columns[head.key.column] = pa.nulls(frame.num_rows, type=pa.float32())
            else:
                scores = np.asarray(head.estimator.predict_proba(matrix)[:, 1], dtype=np.float32)
                teacher_scores[teacher] = scores
                columns[head.key.column] = pa.array(scores, type=pa.float32())
        codex = teacher_scores[Teacher.CODEX]
        gemma = teacher_scores[Teacher.GEMMA]
        if codex is None or gemma is None:
            candidate = consensus = pa.nulls(frame.num_rows, type=pa.bool_())
        else:
            codex_head = _head(bundle, Teacher.CODEX, target.family, target.name)
            gemma_head = _head(bundle, Teacher.GEMMA, target.family, target.name)
            if codex_head.threshold is None or gemma_head.threshold is None:
                raise RuntimeError("available teacher head is missing a threshold")
            codex_decision = codex >= codex_head.threshold
            gemma_decision = gemma >= gemma_head.threshold
            candidate = pa.array(np.logical_or(codex_decision, gemma_decision), type=pa.bool_())
            consensus = pa.array(np.logical_and(codex_decision, gemma_decision), type=pa.bool_())
        columns[f"candidate_union__{target.name}"] = candidate
        columns[f"consensus_intersection__{target.name}"] = consensus
    schema = prediction_schema()
    return pa.Table.from_arrays([columns[name] for name in schema.names], schema=schema)


def render_work_from_mapping(record: dict[str, object]) -> str:
    return render(record, PAYLOAD_FRAME_PARITY)


def merge_parts(paths: Sequence[Path], output: Path, schema: pa.Schema) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{output.name}.", dir=output.parent)
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        with pq.ParquetWriter(temporary, schema, compression="zstd") as writer:
            for path in paths:
                table = pq.read_table(path)
                if not table.schema.equals(schema):
                    raise ValueError(f"prediction schema mismatch in {path.name}")
                writer.write_table(table)
        with temporary.open("rb") as stream:
            os.fsync(stream.fileno())
        os.replace(temporary, output)
        directory = os.open(output.parent, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        temporary.unlink(missing_ok=True)
