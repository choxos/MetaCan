#!/usr/bin/env Rscript
# Finding 31: the batch-of-100 loop works, the anchors do not, and the first version of
# this experiment measured its metric on a set the algorithm was editing underneath it.
#
# ------------------------------------------------------------------------------
# THE RESULT: ACTIVE LEARNING EARNS ITS KEEP, AND BY A LOT
# ------------------------------------------------------------------------------
# Same model, same budget, same 100-work batches. The only difference is HOW the batch is
# chosen: the active arm takes 50 max-teacher-disagreement + 30 max-uncertainty + 20
# random; the control takes 100 at random.
#
#   round  1: active AP 0.014   random AP 0.024
#   round 20: active AP 0.139   random AP 0.050
#
# Active wins in 18 of 20 rounds and ends at 2.8x the control. The positive-set churn on a
# held-out set falls from 1.00 to 0.11, so the model's opinion about the SAME works stops
# moving: that is what "matures" can honestly mean here.
#
# The PI's directive (batches of 100, iterate until it matures) is VINDICATED as an
# acquisition policy. At a ~1% base rate a random batch of 100 holds one positive, and the
# control curve is what that buys: almost nothing, slowly.
#
# ------------------------------------------------------------------------------
# WHAT IT IS STILL NOT
# ------------------------------------------------------------------------------
# AP here is AP against the MAJORITY TEACHER. A rising curve means the student imitates
# three LLMs better. It is not accuracy, the teachers disagree with each other at Jaccard
# ~0.5, and no amount of imitation crosses that gap. And every "query" in this simulation
# reveals a label that already exists: it is in-sample recycling, it shows the loop's
# MECHANICS, and it cannot show that the loop matures on 4.3M unlabelled works.
#
# ------------------------------------------------------------------------------
# THE ANCHORS: BOTH REVIEWERS WERE RIGHT AND THE ARITHMETIC IS NOT CLOSE
# ------------------------------------------------------------------------------
# The design claimed 20 random works per batch would "keep an unbiased evaluation stream
# alive". After 20 rounds: 400 anchors holding THREE positives, a design-weighted
# prevalence of 0.006, and a 95% interval 0.016 wide. THE INTERVAL IS WIDER THAN THE
# QUANTITY. They cannot power precision, recall, AP or calibration.
#
# They are kept, demoted, as DRIFT SENTINELS: drawn with known probabilities, never used to
# pick a batch, re-scored under the frozen final model to check the loop has not walked
# away from the frame. That question 400 anchors CAN answer.
#
# ------------------------------------------------------------------------------
# AND THE BUG, WHICH SAID THE OPPOSITE
# ------------------------------------------------------------------------------
# The first version of this script measured AP and churn on the POOL: the unrevealed works.
# But active learning REMOVES the contested works from the pool by construction, so the
# pool gets easier every round and the target moves under the metric. It reported AP
# FALLING from 0.019 to 0.011 and churn pinned at exactly 1.000 for twenty straight rounds,
# and I nearly wrote it up as "the loop degrades, and here is why".
#
# It was caught by the churn: 1.000, twenty times, is not a measurement, it is a constant.
# A METRIC COMPUTED ON A SET THE ALGORITHM IS ACTIVELY EDITING IS NOT A METRIC. The holdout
# is now drawn once, up front, and is invisible to every acquisition decision. See D33.

suppressPackageStartupMessages({ library(jsonlite); library(cli); library(glue) })
source("R/findings.R")

P <- "pilot/results/active_learning.json"
if (!file.exists(P)) cli_abort("run `python3 ml/active.py` first; {.path {P}} is missing")
d <- fromJSON(P, simplifyVector = FALSE)

cv <- d$curve_verdict
av <- d$anchor_verdict
h  <- d$history
last <- h[[length(h)]]

a0 <- cv$ap_active_first_vs_last[[1]]; a1 <- cv$ap_active_first_vs_last[[2]]
r0 <- cv$ap_random_first_vs_last[[1]]; r1 <- cv$ap_random_first_vs_last[[2]]

cli_h1("The batch-of-100 loop, against a random-batch control at the same budget")
cli_li("active  : AP {a0} -> {a1}")
cli_li("random  : AP {r0} -> {r1}")
cli_li("active beats random in {cv$active_beats_random_in_rounds} of {cv$rounds} rounds")
cli_alert_success(
  "ACTIVE LEARNING EARNS ITS KEEP: {round(a1/r1, 1)}x the control's AP at the same budget, and the held-out \\
   positive-set churn falls to {cv$final_churn}, so the model's opinion about the SAME works stops moving."
)
cli_alert_warning(
  "AND IT IS STILL IMITATION. AP is measured against the MAJORITY TEACHER, so a rising curve means the student \\
   copies three LLMs better. The teachers overlap each other at Jaccard ~0.5; imitation cannot cross that."
)

cli_h2("The 20 random anchors per batch")
cli_li("after {cv$rounds} rounds: {last$n_anchors} anchors, holding {last$anchor_positives_seen} positives")
cli_li("design-weighted prevalence {last$anchor_prevalence_hat}, 95% interval {last$anchor_ci_width} wide")
cli_alert_danger(
  "THE INTERVAL IS WIDER THAN THE QUANTITY. Two independent adversarial reviews said this before the code ran, \\
   and the arithmetic is not close. The anchors are a valid probability sample and a USELESS evaluation stream. \\
   Demoted to drift sentinels. THE LOOP LEARNS; THE AUDIT MEASURES."
)

record_finding(
  "active_learning",
  list(
    batch = d$batch_composition,
    rounds = cv$rounds,
    ap_active_start = a0, ap_active_end = a1,
    ap_random_start = r0, ap_random_end = r1,
    active_over_random_x = round(a1 / r1, 1),
    active_beats_random_in_rounds = cv$active_beats_random_in_rounds,
    holdout_churn_final = cv$final_churn,
    active_arm_outperformed_random_control_in_simulation = TRUE,
    what_ap_measures_here = paste(
      "Agreement with the MAJORITY TEACHER, not accuracy. A rising curve is better imitation of three LLMs",
      "that overlap each other at Jaccard ~0.5. No amount of imitation establishes accuracy; a",
      "human-coded probability sample is required."
    ),
    anchors_n = last$n_anchors,
    anchors_positives = last$anchor_positives_seen,
    anchors_prevalence = last$anchor_prevalence_hat,
    anchors_ci_width = last$anchor_ci_width,
    anchors_are_a_usable_evaluation_stream = FALSE,
    anchors_demoted_to = "drift sentinels, rescored under the frozen final model, never used to pick a batch",
    simulation_caveat = paste(
      "Every query reveals a label that already exists: 16,800 labels over 5,600 works. This is in-sample",
      "recycling. It demonstrates the loop's MECHANICS and cannot show that the loop matures on 4.3M",
      "unlabelled works, nor validate the v3.1 instrument, under which no screening has run."
    ),
    superseded_result = paste(
      "The first version of this experiment measured AP and churn on the POOL of unrevealed works. Active",
      "learning REMOVES contested works from the pool by construction, so the pool gets easier every round",
      "and the evaluation target moves under the metric. It reported AP FALLING from 0.019 to 0.011 with",
      "churn pinned at exactly 1.000 for twenty straight rounds, and the conclusion was going to be 'the",
      "loop degrades'. The constant churn is what gave it away. A metric computed on a set the algorithm is",
      "actively editing is not a metric. See DEVIATIONS.md D33."
    )
  ),
  headline = glue(
    "THE BATCH-OF-100 LOOP WORKS, AND THE 20 RANDOM ANCHORS IN IT DO NOT. Against a random-batch control at ",
    "identical budget, active acquisition (50 max-teacher-disagreement + 30 max-uncertainty + 20 random) takes ",
    "held-out AP from {a0} to {a1} while the control reaches {r1}: {round(a1/r1, 1)}x, winning {cv$active_beats_random_in_rounds} of {cv$rounds} rounds, with ",
    "held-out positive-set churn falling to {cv$final_churn}. At a ~1% base rate a random batch of 100 holds one positive, ",
    "and the control curve is what that buys. BUT the anchors, which were supposed to keep an unbiased ",
    "evaluation stream alive, hold {last$anchor_positives_seen} positives after {last$n_anchors} draws: prevalence {last$anchor_prevalence_hat} with a 95% interval ",
    "{last$anchor_ci_width} wide, WIDER THAN THE QUANTITY ITSELF. They are demoted to drift sentinels. AP here is agreement ",
    "with the majority TEACHER, so the whole curve is imitation, not accuracy. The planned human study is not ",
    "preregistered and remains necessary to measure accuracy. ",
    "The first version of this script said the loop DEGRADED, because it measured ",
    "AP on the shrinking pool the algorithm was itself editing; the churn sat at exactly 1.000 for twenty ",
    "rounds, which is a constant, not a measurement (D33)."
  )
)
