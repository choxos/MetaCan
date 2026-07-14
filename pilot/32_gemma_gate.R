#!/usr/bin/env Rscript
# Finding 32: the free model failed the gate, and the gate was aimed at the wrong bar.
#
# Gemma-4-31B (free) screened the same 700 works as the two frontier teachers, same
# rubric v3.1, same schema, 100% schema-clean returns. The prespecified rule said it may
# label the 4.3M frame only at Jaccard >= 0.60 against the frontier union on
# `metaresearch` and on the any-category decision. It scored 0.440 and 0.515. IT FAILS,
# AND THE RULE STANDS: no threshold moves after the numbers exist.
#
# But the same table holds the number the threshold SHOULD have been derived from: on
# these same 700 works the two FRONTIER models agree with each other at 0.384
# (metaresearch) and 0.360 (any-category). Gemma matches the frontier union BETTER than
# the frontier models match each other. The 0.60 bar was calibrated from round-001's
# 0.44-0.75 range without registering that all loop batches are selected FOR
# disagreement, which depresses every pairwise agreement on them. A gate whose rationale
# is "as good as the teachers agree among themselves" was written with a number that is
# not that.
#
# So: (1) Gemma does not label the frame on this evidence; the classifier trained on
# frontier labels stays the frame-wide annotator. (2) A SECOND test is prespecified
# here, before its data exist: on the enriched 10,348-work sample's random_baseline
# stratum (1,500 works, NOT selected for disagreement), Gemma passes if
# J(gemma, frontier_union) >= J(opus, gpt) on both metaresearch and any-category.
# The bar is the rationale itself this time, not a round number recalled from the
# wrong distribution.

suppressPackageStartupMessages({ library(jsonlite); library(cli); library(glue) })
source("R/findings.R")

P <- "pilot/results/gemma_agreement.json"
if (!file.exists(P)) cli_abort("run `python3 ml/gemma_agreement.py` first")
d <- fromJSON(P, simplifyVector = FALSE)

pc <- d$per_category
row <- function(cat) Filter(\(r) r$category == cat, pc)[[1]]
meta <- row("metaresearch"); anyc <- row("ANY_CATEGORY")

cli_h1("Gemma-4-31B vs the frontier teachers, 700 works, rubric v3.1")
cli_li("metaresearch : J(gemma, frontier union) = {meta$jaccard_gemma_vs_frontier_union}; J(opus, gpt) = {meta$jaccard_opus_vs_gpt}")
cli_li("any-category : J(gemma, frontier union) = {anyc$jaccard_gemma_vs_frontier_union}; J(opus, gpt) = {anyc$jaccard_opus_vs_gpt}")
cli_li("study_design exact: gemma-opus {d$study_design_exact_match$gemma_vs_opus}, gemma-gpt {d$study_design_exact_match$gemma_vs_gpt}, opus-gpt {d$study_design_exact_match$opus_vs_gpt_for_reference}")
cli_alert_danger("prespecified gate (>= 0.60 on both): FAILED. The rule stands; Gemma does not label the frame on this evidence.")
cli_alert_warning(
  "AND THE GATE WAS MISCALIBRATED: it demanded 0.60 where the frontier models themselves manage \\
   {meta$jaccard_opus_vs_gpt} and {anyc$jaccard_opus_vs_gpt} on the same works, because every loop batch is selected FOR \\
   disagreement. Test 2 is prespecified on the random_baseline stratum with the rationale as the bar: \\
   J(gemma, union) >= J(opus, gpt), both targets."
)

record_finding(
  "gemma_gate",
  list(
    model = "google/gemma-4-31b-it (free)",
    n_works = d$n_works,
    schema_clean_return_rate = 1.0,
    jaccard_metaresearch_gemma_vs_union = meta$jaccard_gemma_vs_frontier_union,
    jaccard_metaresearch_opus_vs_gpt    = meta$jaccard_opus_vs_gpt,
    jaccard_anycat_gemma_vs_union       = anyc$jaccard_gemma_vs_frontier_union,
    jaccard_anycat_opus_vs_gpt          = anyc$jaccard_opus_vs_gpt,
    study_design_exact = d$study_design_exact_match,
    prespecified_rule = d$decision_rule,
    passed = FALSE,
    rule_honored = TRUE,
    gate_was_miscalibrated_because = paste(
      "the 0.60 bar was set from round-001's 0.44-0.75 pairwise range without registering that loop",
      "batches are selected FOR disagreement, which depresses every agreement statistic computed on them.",
      "On the same 700 works the frontier models agree with each other at 0.384/0.360: below the bar",
      "Gemma was held to, and Gemma beat both numbers."
    ),
    test2_prespecified = paste(
      "On the enriched sample's random_baseline stratum (1,500 works, not selected for disagreement),",
      "Gemma passes if J(gemma, frontier_union) >= J(opus, gpt) on both metaresearch and any-category.",
      "Written before any of those labels exist."
    )
  ),
  headline = glue(
    "THE FREE MODEL FAILED THE GATE, AND THE GATE WAS AIMED AT THE WRONG BAR. Gemma-4-31B screened 700 works ",
    "under rubric v3.1 (100% schema-clean) and scored Jaccard {meta$jaccard_gemma_vs_frontier_union} on metaresearch and {anyc$jaccard_gemma_vs_frontier_union} on ",
    "any-category against the frontier union, under the prespecified 0.60 bar, SO IT DOES NOT LABEL THE FRAME: ",
    "the rule stands because rules that move after the numbers exist are not rules. But the frontier models ",
    "agree with each other at only {meta$jaccard_opus_vs_gpt} and {anyc$jaccard_opus_vs_gpt} on the same works, because every loop batch is ",
    "selected FOR disagreement: the gate demanded of a free model what the frontier models do not achieve ",
    "among themselves there, and Gemma beat the frontier's own mutual agreement on both targets. Test 2 is ",
    "prespecified on the random_baseline stratum with the rationale as the bar: J(gemma, union) >= J(opus, gpt)."
  )
)
