"""Study design, validated against the only external reference standard this project has.

WHY THIS IS THE ONLY ANNOTATION ALLOWED TO SHIP AS A LABEL
---------------------------------------------------------
Every category in the rubric is contested: three frontier models cut the metaresearch
boundary differently under one locked rubric, and the field itself says in print that it
has no consensus definition. There is no reference standard, so no machine label may be
asserted.

Study design is different, and ONLY inside MEDLINE: NLM assigns publication types
independently of this project, so a design label can be WRONG in a way the pipeline cannot
hide. That is the whole value. It is also the whole limit.

THREE THINGS THE FIRST VERSION OF THIS GOT WRONG
------------------------------------------------
1. "MEDLINE publication types are human-indexed by NLM." FALSE. Full human indexing ended
   as universal practice around 2011; automation completed in April 2022.

2. "So: pre-2022 is the human era, post-2022 the automated one." ALSO FALSE, and it is the
   more dangerous error because it looks like the fix. A YEAR CUTOFF CANNOT SEPARATE THE
   ERAS: they overlap for a decade. NLM publishes the answer per record, in the
   `IndexingMethod` attribute:
       absent      -> fully human indexed         (THE reference)
       "Curated"   -> automated, human-reviewed   (agreement with a reviewed machine)
       "Automated" -> machine                     (agreement with a machine)
   The reference subset is defined by that FIELD, not by a date.

3. Publication types are treated as an exhaustive, mutually exclusive design ontology. They
   are not. They are OVERLAPPING BINARY ATTRIBUTES: a work can be both Systematic Review
   and Meta-Analysis, and often is. So this fits SIX INDEPENDENT BINARY HEADS, never a
   multiclass head with a softmax that forces a choice the standard itself does not make.

AND THE CENSORING TRAP, which would have quietly poisoned every negative
------------------------------------------------------------------------
A publication type that did not exist yet cannot be absent for a substantive reason.
`Observational Study` entered the vocabulary in 2014; `Systematic Review` in 2019. A 2008
cohort study carries no Observational Study tag because THE TAG DID NOT EXIST, not because
it is not observational. Training on those records as negatives teaches the model that
older cohort studies are not observational, and validating on them measures agreement with
a censoring artifact.

So every class carries an ELIGIBILITY WINDOW, prespecified here, and a record outside its
class's window is not a negative: it is NOT DATA for that class.
"""

from __future__ import annotations

# The six classes, each with the MEDLINE publication type it is validated against and the
# year that type entered the vocabulary. A record published before `first_year` is
# EXCLUDED from that class's training and evaluation, in both directions.
CLASSES = {
    "randomized_trial": {
        "pub_type": "Randomized Controlled Trial",
        "first_year": 1991,
    },
    "nonrandomized_trial": {
        "pub_type": "Controlled Clinical Trial",
        "first_year": 1991,
    },
    "observational": {
        "pub_type": "Observational Study",
        "first_year": 2014,   # THE TRAP: absent before this is not a negative
    },
    "systematic_review": {
        "pub_type": "Systematic Review",
        "first_year": 2019,   # THE TRAP, again, and only five years of eligible data
    },
    "meta_analysis": {
        "pub_type": "Meta-Analysis",
        "first_year": 1993,
    },
    "case_report": {
        "pub_type": "Case Reports",
        "first_year": 1991,
    },
}

# NLM's record-level indexing provenance. This, not a year, defines the reference subset.
INDEXING_HUMAN = None          # attribute absent => fully human indexed
INDEXING_CURATED = "Curated"   # automated, then human-reviewed
INDEXING_AUTOMATED = "Automated"


def eligible(year: int, cls: str) -> bool:
    """Is this record DATA for this class, in either direction?"""
    if year is None:
        return False
    return year >= CLASSES[cls]["first_year"]


def reference_stratum(indexing_method) -> str:
    """What kind of evidence is this record's publication type?"""
    if indexing_method in (None, "", "NA"):
        return "human"        # the reference standard
    if indexing_method == INDEXING_CURATED:
        return "curated"      # a machine a human checked
    return "automated"        # a machine


# The release gate, prespecified BEFORE any number exists, because a threshold chosen after
# seeing the results is not a threshold, it is a preference.
#
# The gate is on the LOWER CONFIDENCE BOUND, not the point estimate: a class that scrapes
# the bar on a small eligible sample has not cleared it, and `Systematic Review` (eligible
# only from 2019) is exactly that case.
GATE = {
    "min_precision_lower_95": 0.90,
    "min_recall_lower_95": 0.80,
    "min_eligible_human_indexed_records": 200,
    "evaluated_on": "human-indexed records only, within the class's eligibility window",
    "temporal_split": "train on earlier years, test on later; a random split leaks time",
    "what_a_failed_class_ships_as": "a score, marked unvalidated, never a label",
    "what_the_curated_and_automated_strata_measure": (
        "agreement with another machine, reported separately and never pooled into the gate"
    ),
}


def gate_report(cls: str, n_eligible: int, precision_lb: float, recall_lb: float) -> dict:
    passed = (
        n_eligible >= GATE["min_eligible_human_indexed_records"]
        and precision_lb >= GATE["min_precision_lower_95"]
        and recall_lb >= GATE["min_recall_lower_95"]
    )
    return {
        "class": cls,
        "pub_type": CLASSES[cls]["pub_type"],
        "eligible_from": CLASSES[cls]["first_year"],
        "n_eligible_human_indexed": n_eligible,
        "precision_lower_95": precision_lb,
        "recall_lower_95": recall_lb,
        "ships_as": "label" if passed else "score (unvalidated)",
        "gate": GATE,
    }
