from importlib import import_module

import pytest


def test_head_support_changes_at_twenty_five_known_examples() -> None:
    # Given
    module = import_module("ml.classifier_metrics")
    below = (True,) * 24 + (False,) * 25 + (None,)
    exact = (True,) * 25 + (False,) * 25 + (None,)

    # When
    below_support = module.summarize_support(below)
    exact_support = module.summarize_support(exact)

    # Then
    assert below_support.available is False
    assert exact_support.available is True
    assert exact_support.unknown == 1


def test_weighted_metrics_use_design_weights() -> None:
    # Given
    module = import_module("ml.classifier_metrics")
    labels = (True, False, True, False)
    decisions = (True, True, False, False)
    weights = (2.0, 1.0, 3.0, 4.0)

    # When
    metrics = module.weighted_metrics(labels, decisions, weights)

    # Then
    assert metrics.true_positive == 2.0
    assert metrics.false_positive == 1.0
    assert metrics.false_negative == 3.0
    assert metrics.true_negative == 4.0
    assert metrics.f2 == pytest.approx(10.0 / 23.0)


def test_f2_threshold_ties_choose_the_lower_threshold() -> None:
    # Given
    module = import_module("ml.classifier_metrics")
    series = module.ThresholdSeries(
        scores=(0.25, 0.75),
        labels=(False, False),
        weights=(1.0, 1.0),
        folds=(0, 1),
    )

    # When
    selected = module.select_threshold(series.without_folds())

    # Then
    assert selected.threshold == 0.25
    assert selected.metrics.f2 == 0.0


def test_cross_fitted_threshold_for_fold_is_independent_of_that_fold() -> None:
    # Given
    module = import_module("ml.classifier_metrics")
    original = module.ThresholdSeries(
        scores=(0.1, 0.9, 0.2, 0.8, 0.3, 0.7),
        labels=(True, False, True, False, True, False),
        weights=(1.0,) * 6,
        folds=(0, 0, 1, 1, 2, 2),
    )
    changed = module.ThresholdSeries(
        scores=(0.99, 0.98, 0.2, 0.8, 0.3, 0.7),
        labels=(False, False, True, False, True, False),
        weights=(99.0, 99.0, 1.0, 1.0, 1.0, 1.0),
        folds=original.folds,
    )

    # When
    first = module.cross_fitted_threshold(original)
    second = module.cross_fitted_threshold(changed)

    # Then
    assert first.threshold_for(0) == second.threshold_for(0)


@pytest.mark.parametrize(
    ("codex", "gemma", "candidate", "consensus"),
    [
        (False, False, False, False),
        (False, True, True, False),
        (True, False, True, False),
        (True, True, True, True),
    ],
)
def test_candidate_is_union_and_consensus_is_intersection(
    codex: bool,
    gemma: bool,
    candidate: bool,
    consensus: bool,
) -> None:
    # Given
    module = import_module("ml.classifier_metrics")

    # When
    combined = module.combine_teacher_decisions(codex, gemma)

    # Then
    assert combined.candidate is candidate
    assert combined.consensus is consensus


def test_unavailable_teacher_head_makes_both_derived_values_null() -> None:
    # Given
    module = import_module("ml.classifier_metrics")

    # When
    combined = module.combine_teacher_decisions(None, True)

    # Then
    assert combined.candidate is None
    assert combined.consensus is None
