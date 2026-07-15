from __future__ import annotations

from ml.features import PAYLOAD_FRAME_PARITY


def feature_contract() -> dict[str, object]:
    return {
        "renderer": "field-tagged-v1",
        "fields": list(PAYLOAD_FRAME_PARITY),
        "word_tfidf": {
            "ngram_range": [1, 2],
            "min_df": 2,
            "sublinear_tf": True,
            "max_features": 300_000,
        },
        "character_tfidf": {
            "analyzer": "char_wb",
            "ngram_range": [3, 5],
            "min_df": 3,
            "sublinear_tf": True,
            "max_features": 300_000,
        },
        "estimator": {
            "name": "logistic_regression",
            "C": 1.0,
            "class_weight": "balanced",
            "solver": "liblinear",
        },
        "minimum_positive_and_negative_support": 25,
        "folds": 5,
        "fold_group": "normalized_venue",
    }
