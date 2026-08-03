from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict


class GemmaSidecar(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(extra="ignore", frozen=True)

    backend: Literal["ollama", "nvidia", "openrouter"]
    n: int


@dataclass(frozen=True, slots=True)
class BackendProvenance:
    backend: str
    status: str
    evidence: str


def gemma_backend(sidecar_path: Path) -> BackendProvenance:
    if sidecar_path.exists():
        sidecar = GemmaSidecar.model_validate_json(sidecar_path.read_text(encoding="utf-8"))
        return BackendProvenance(
            backend=sidecar.backend,
            status="observed_sidecar",
            evidence=str(sidecar_path),
        )
    return BackendProvenance(
        backend="nvidia",
        status="inferred_from_original_runner",
        evidence="The pre-pool runner hard-coded backend=nvidia and did not write sidecars.",
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()
