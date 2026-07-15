from importlib import import_module


def _work(module, index: int, venue: str | None, title: str):
    return module.WorkRecord(
        id=f"W{index + 1}",
        title=title,
        venue=venue,
        weight=1.0,
    )


def test_venue_groups_are_normalized_and_missing_venues_are_singletons() -> None:
    # Given
    data = import_module("ml.classifier_data")
    training = import_module("ml.classifier_training")
    works = (
        _work(data, 0, "  Journal  OF Tests ", "a"),
        _work(data, 1, "journal of tests", "b"),
        _work(data, 2, None, "c"),
        _work(data, 3, "", "d"),
    )

    # When
    groups = training.venue_groups(works)

    # Then
    assert groups[0] == groups[1] == "journal of tests"
    assert groups[2] == "__missing__:W3"
    assert groups[3] == "__missing__:W4"


def test_group_kfold_never_splits_a_normalized_venue() -> None:
    # Given
    data = import_module("ml.classifier_data")
    training = import_module("ml.classifier_training")
    works = tuple(
        _work(data, index, f"venue {index // 2}", f"title {index}")
        for index in range(10)
    )

    # When
    folds = training.assign_folds(works)

    # Then
    by_group: dict[str, set[int]] = {}
    for assignment in folds:
        by_group.setdefault(assignment.group, set()).add(assignment.fold)
    assert all(len(fold_set) == 1 for fold_set in by_group.values())


def test_fold_vectorizer_does_not_learn_heldout_vocabulary() -> None:
    # Given
    data = import_module("ml.classifier_data")
    training = import_module("ml.classifier_training")
    works = tuple(
        _work(
            data,
            index,
            f"venue {index // 2}",
            "leakword leakword common" if index < 2 else "common common filler",
        )
        for index in range(10)
    )
    folds = training.assign_folds(works)
    heldout = folds[0].fold

    # When
    fitted = training.fit_fold_features(works, folds, heldout)

    # Then
    assert "leakword" not in training.word_vocabulary(fitted)
