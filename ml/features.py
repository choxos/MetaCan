"""The feature builder, and the one place that decides what a model is allowed to see.

WHY THIS FILE EXISTS SEPARATELY FROM THE TRAINER
------------------------------------------------
The training payload (pilot/screening/frame1k/chunks/*.json) carries an `abstract`.
The frame as committed (data/db/works.csv) carries `has_abstract`, a BOOLEAN, and no
abstract text at all.

So a classifier trained on the screening payload sees a field that the 4.3M works it is
supposed to score DO NOT HAVE. It would train on title+abstract, report a flattering
score, and then run over the frame on titles alone. Nothing would crash. The metric
would simply be a metric for a model that never runs.

That is train/serve skew, and it is this project's whole failure pattern: a defect that
produces output that looks correct. So the parity is not a comment. It is an assertion:

    build_matrix() takes an explicit `fields` list, and assert_payload_parity() FAILS
    the run if a field is in the training payload but not derivable from the frame.

A model may only use a field the frame can supply. If the abstract is wanted at frame
scale, the snapshot pass must re-extract it; until then the shipped model is the one
that can actually run, and the cost of the missing abstract is MEASURED (finding 30)
rather than hidden behind a score nobody could reproduce at inference time.
"""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Final

import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion

# Every field the frame (data/db/works.csv) can supply for all 4,299,418 works.
# `abstract` is deliberately ABSENT: the frame stores has_abstract, not the text.
FRAME_FIELDS: Final = frozenset(
    {
        "id",
        "doi",
        "title",
        "year",
        "lang",
        "type",
        "venue",
        "topic",
        "field",
        "cited_by",
        "is_retracted",
        "has_abstract",
        "route_ca_aff",
        "route_ca_fund",
        "route_ca_venue",
        "route_about_ca",
        "ca_institutions",
        "funders",
        "keywords",
    }
)

# The two payloads a model may be trained on, named so the choice is explicit and a
# reader can see which one shipped.
PAYLOAD_FRAME_PARITY: Final = (
    "title",
    "venue",
    "topic",
    "field",
    "lang",
    "type",
    "year",
)
PAYLOAD_WITH_ABSTRACT: Final = (*PAYLOAD_FRAME_PARITY, "abstract")


class PayloadSkew(RuntimeError):
    """Raised when a model would be trained on a field inference cannot supply."""


def assert_payload_parity(fields: Sequence[str]) -> None:
    """FAIL if training would see a field the frame cannot serve.

    Called by the trainer before it fits anything. A model that trips this is not
    'slightly optimistic'; its reported score belongs to a model that cannot run.
    """
    unserveable = sorted(set(fields) - FRAME_FIELDS)
    if unserveable:
        raise PayloadSkew(
            f"payload fields {unserveable} are NOT in the frame (data/db/works.csv), so a "
            f"model trained on them cannot score the 4.3M works it exists to score. Either "
            f"drop the field, or re-extract it from the snapshot for the WHOLE frame first. "
            f"Frame fields: {sorted(FRAME_FIELDS)}"
        )


_WS = re.compile(r"\s+")


def _clean(x: object) -> str:
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return ""
    return _WS.sub(" ", str(x)).strip()


def render(rec: Mapping[str, object], fields: Sequence[str]) -> str:
    """One record to one string, field-tagged.

    Fields are TAGGED rather than concatenated bare, so the model can tell a word in a
    title from the same word in a venue name. 'Scientometrics' as a venue is a near
    certainty; 'scientometrics' in a title is a topic. Untagged, they are one feature.
    """
    parts: list[str] = []
    for f in fields:
        v = _clean(rec.get(f))
        if not v:
            continue
        if f == "title":
            parts.append(f"TITLE {v}")
        elif f == "abstract":
            parts.append(f"ABS {v}")
        elif f == "venue":
            parts.append(f"VENUE_{v.replace(' ', '_')} {v}")
        elif f == "topic":
            parts.append(f"TOPIC_{v.replace(' ', '_')}")
        elif f == "field":
            parts.append(f"FIELD_{v.replace(' ', '_')}")
        elif f == "lang":
            parts.append(f"LANG_{v}")
        elif f == "type":
            parts.append(f"TYPE_{v}")
        elif f == "year":
            parts.append(f"YEAR_{v}")
        elif f == "keywords":
            parts.append(f"KW {v}")
    return " ".join(parts)


def vectorizer() -> FeatureUnion:
    """Word n-grams for English, character n-grams for everything else.

    5.5% of the frame is French and 23.3% is title-only. A word-only model on a French
    title is a model on five words. Character 3-5 grams share subword structure across
    EN/FR ('bibliométr', 'métascien', 'reproduc'), which is what makes ONE model serve
    both languages instead of two models, one of which would be trained on 300 records.

    min_df=2 on words is deliberate: a token appearing once cannot generalize and only
    fits the sample. sublinear_tf because a term twice in an abstract is not twice the
    evidence.
    """
    return FeatureUnion(
        [
            (
                "word",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    min_df=2,
                    sublinear_tf=True,
                    strip_accents=None,  # accents are SIGNAL in French, not noise
                    lowercase=True,
                    max_features=300_000,
                ),
            ),
            (
                "char",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=3,
                    sublinear_tf=True,
                    lowercase=True,
                    max_features=300_000,
                ),
            ),
        ]
    )


def build_matrix(records, fields, fitted=None):
    """Records -> sparse matrix.

    `fitted` is a vectorizer already fitted ON TRAIN ONLY. Passing None fits a new one;
    passing a fitted one transforms with it. There is no third option, because the third
    option is fitting the IDF on the test set, which is the leak that produced 100%
    recall in this project once already (finding 25, first version, withdrawn).
    """
    assert_payload_parity(fields)
    texts = [render(r, fields) for r in records]
    if fitted is None:
        vec = vectorizer()
        X = vec.fit_transform(texts)
        return X, vec
    return fitted.transform(texts), fitted


def hstack_dense(X, dense_cols):
    """Attach a few dense numeric columns (has_abstract, year) to the sparse text block."""
    if dense_cols is None or len(dense_cols) == 0:
        return X
    D = sparse.csr_matrix(np.asarray(dense_cols, dtype=np.float64))
    return sparse.hstack([X, D], format="csr")
