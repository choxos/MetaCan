from __future__ import annotations

import re
from typing import TypedDict

from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.pipeline import FeatureUnion


class FrameRecord(TypedDict, total=False):
    title: str | None
    abstract: str | None
    venue: str | None
    topic: str | None
    field: str | None
    lang: str | None
    type: str | None
    year: int | None


N_FEATURES = 2**18
FEATURE_DIMENSIONS = N_FEATURES * 2
_WHITESPACE = re.compile(r"\s+")


def _clean(value: str | int | None) -> str:
    return _WHITESPACE.sub(" ", str(value)).strip() if value is not None else ""


def frame_text(record: FrameRecord) -> str:
    values = {field: _clean(record.get(field)) for field in FrameRecord.__annotations__}
    parts: list[str] = []
    if values["title"]:
        parts.append(f"TITLE {values['title']}")
    if values["venue"]:
        parts.append(f"VENUE_{values['venue'].replace(' ', '_')} {values['venue']}")
    if values["topic"]:
        parts.append(f"TOPIC_{values['topic'].replace(' ', '_')}")
    if values["field"]:
        parts.append(f"FIELD_{values['field'].replace(' ', '_')}")
    for field in ("lang", "type", "year"):
        if values[field]:
            parts.append(f"{field.upper()}_{values[field]}")
    return " ".join(parts)


def vectorizer() -> FeatureUnion:
    return FeatureUnion(
        (
            (
                "word",
                HashingVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    n_features=N_FEATURES,
                    alternate_sign=False,
                    lowercase=True,
                    norm="l2",
                ),
            ),
            (
                "char",
                HashingVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    n_features=N_FEATURES,
                    alternate_sign=False,
                    lowercase=True,
                    norm="l2",
                ),
            ),
        )
    )
