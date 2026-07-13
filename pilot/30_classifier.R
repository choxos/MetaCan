#!/usr/bin/env Rscript
# Finding 30: the classifier, what it is for, and the number that says it may not label.
#
# ------------------------------------------------------------------------------
# THE PREMISE IT WAS BUILT ON WAS FALSE, AND MY OWN PILOT SAID SO
# ------------------------------------------------------------------------------
# The classifier was proposed to avoid LLM-labelling 4.3M works. Finding 13 had already
# measured that cost: the full rubric over every work in the frame is $1,261. There was
# never anything to avoid. The proposal carried both sentences for a day (D32).
#
# It survives, but only for things a second LLM pass cannot buy, and each is measured
# here rather than asserted:
#
#   1. A CONTINUOUS CALIBRATED SCORE for the audit to stratify on. Measured: top-decile
#      lift of 3.9x to 5.3x toward machine labels.
#   2. RUBRIC REVISIONS TESTABLE IN MINUTES instead of one $1,261 pass each.
#   3. A FRAME-WIDE MAP OF WHERE THE THREE TEACHERS WOULD SPLIT, from 5,600 labels
#      instead of three full passes (3x cost, ~25 days). Measured, and it is WEAK: see
#      below.
#   4. LEARNABILITY AS EVIDENCE ABOUT THE BOUNDARY. This is the finding.
#
# ------------------------------------------------------------------------------
# WHAT THE NUMBERS SAY, INCLUDING THE ONE I DID NOT EXPECT
# ------------------------------------------------------------------------------
# Design-weighted average precision, out-of-fold, venue-grouped, vectorizer fitted on
# train folds only:
#
#   the three teachers      AP 0.135 to 0.170     AUC 0.76 to 0.81
#   consensus (unanimous)   AP 0.078
#   consensus (majority)    AP 0.136
#   consensus (any)         AP 0.209
#
# THE ESTIMAND YOU CHOOSE MOVES THE MEASURED PERFORMANCE BY 2.7x. There is no "the"
# target, and a paper that trains on one consensus rule without naming it has silently
# settled the question its audit exists to answer.
#
# AND THE UNANIMOUS CORE IS THE HARDEST TO LEARN, not the easiest. The works all three
# models agree on do not form a tidy, separable centre; they form the SMALLEST and
# LEAST PREDICTABLE set. If the boundary were a line the models share, with noise around
# it, the agreed core would be the easy part. It is not. That is one more piece of
# evidence for the thing this whole project keeps finding: THE BOUNDARY IS NOT A LINE
# THE MODELS SHARE.
#
# ------------------------------------------------------------------------------
# THE ABSTRACT IS WORTH MORE THAN THE MODEL
# ------------------------------------------------------------------------------
# data/db/works.csv stores has_abstract, a BOOLEAN, and no abstract text. So a model
# trained on the screening payload (which HAS abstracts) cannot score the frame.
#
# Fitted both ways: AP 0.136 on the payload the frame can serve, AP 0.251 on the payload
# it cannot. THE ABSTRACT IS WORTH +0.115 AP, an 84% relative gain, which is far more
# than any modelling choice available. The deployable model is the worse one, and saying
# otherwise would be reporting a metric for a model that cannot run: train/serve skew,
# which is this project's failure pattern exactly (output that looks correct). It is a
# BUILD ASSERTION now: ml/features.py FAILS if a payload field is not in the frame.
#
# The number turns a modelling assumption into a budget decision: re-extracting abstracts
# from the snapshot buys +0.115 AP, and now we know the price of not doing it.

suppressPackageStartupMessages({ library(jsonlite); library(cli); library(glue) })
source("R/findings.R")

P <- "pilot/results/classifier.json"
if (!file.exists(P)) cli_abort("run `python3 ml/train.py` first; {.path {P}} is missing")
d <- fromJSON(P, simplifyVector = FALSE)

fp  <- d$frame_parity$strict
abs_ <- d$with_abstract_NOT_DEPLOYABLE$strict
ap <- function(h, k) h$heads[[k]]$ap_design_weighted

cli_h1("The classifier, evaluated design-weighted and out-of-fold")
cli_li("teacher heads : opus {ap(fp,'opus')} | gpt {ap(fp,'gpt')} | grok {ap(fp,'grok')} (design-weighted AP)")
cli_li("consensus     : unanimous {ap(fp,'consensus_unanimous')} | majority {ap(fp,'consensus_majority')} | any {ap(fp,'consensus_any')}")
cli_alert_danger(
  "THE UNANIMOUS CORE IS THE HARDEST TO LEARN (AP {ap(fp,'consensus_unanimous')}), not the easiest. \\
   If the boundary were a shared line with noise around it, the agreed core would be the separable part. It is not."
)
cli_alert_warning(
  "The estimand moves measured performance {round(ap(fp,'consensus_any') / ap(fp,'consensus_unanimous'), 1)}x. \\
   There is no 'the' target, and picking one silently settles the question the audit exists to answer."
)

dis <- fp$predicting_teacher_disagreement
cli_h2("Can it predict WHERE the teachers would split, across a frame it cannot afford to screen three times?")
cli_li("contested works: {dis$n_contested} of 5,600 (base rate {dis$base_rate})")
cli_li("between-head spread as a detector: AP {dis$average_precision}, {dis$lift_over_base}x the base rate")
cli_alert_warning(
  "IT WORKS, AND IT IS WEAK. {dis$lift_over_base}x lift is a real signal and a poor one. It is reported as what it \\
   is: an efficiency gain for the audit's disagreement stratum, NOT a map anyone should trust on its own."
)

cli_h2("The abstract is worth more than the model")
sk <- d$payload_skew
cli_li("payload the frame CAN serve (title, venue, topic, field, lang, type, year): AP {sk$ap_frame_parity}")
cli_li("payload the frame CANNOT serve (the above + abstract)                     : AP {sk$ap_with_abstract}")
cli_alert_danger(
  "+{sk$abstract_is_worth_ap} AP ({round(100 * sk$abstract_is_worth_ap / sk$ap_frame_parity)}% relative). \\
   The DEPLOYABLE model is the worse one, and the better one cannot score the frame: works.csv stores \\
   has_abstract, a boolean, and no abstract text. Reporting the better number would be reporting a metric \\
   for a model that cannot run."
)

record_finding(
  "classifier",
  list(
    evaluation = "out-of-fold, venue-grouped, vectorizer fitted on train folds only, DESIGN-WEIGHTED",
    why_design_weighted = paste(
      "The 5,600 works are a stratified sample: French carries weight 311, aff_core 1,119. An unweighted AP",
      "is an AP over a population that does not exist. Both are reported; the gap is a fact about the design."
    ),
    ap_design_weighted_by_teacher = list(
      opus = ap(fp, "opus"), gpt = ap(fp, "gpt"), grok = ap(fp, "grok")
    ),
    ap_design_weighted_by_consensus_rule = list(
      unanimous = ap(fp, "consensus_unanimous"),
      majority  = ap(fp, "consensus_majority"),
      any       = ap(fp, "consensus_any")
    ),
    estimand_moves_performance_x = round(ap(fp, "consensus_any") / ap(fp, "consensus_unanimous"), 1),
    unanimous_core_is_hardest_to_learn = TRUE,
    top_decile_lift = list(
      opus = fp$heads$opus$lift_top_decile,
      gpt  = fp$heads$gpt$lift_top_decile,
      grok = fp$heads$grok$lift_top_decile
    ),
    ap_by_language_opus = fp$heads$opus$ap_by_language,
    ap_by_language_gpt  = fp$heads$gpt$ap_by_language,
    french_is_model_dependent = paste(
      "GPT's boundary is markedly less learnable in French (AP", fp$heads$gpt$ap_by_language$fr, "vs",
      fp$heads$gpt$ap_by_language$en, "in English) while Opus's is not (", fp$heads$opus$ap_by_language$fr,
      "vs", fp$heads$opus$ap_by_language$en, "). 'Character n-grams do the French work' was an assertion;",
      "measured per language, it is true for one teacher and false for another."
    ),
    predicting_teacher_disagreement = list(
      n_contested   = dis$n_contested,
      base_rate     = dis$base_rate,
      average_precision = dis$average_precision,
      lift_over_base    = dis$lift_over_base,
      verdict = paste(
        "Real but weak. It buys an efficiency gain for the audit's disagreement stratum. It is NOT a",
        "trustworthy standalone map of the contested region, and shared teacher bias is invisible to it:",
        "if all three are wrong the same way the spread is zero and the work looks settled."
      )
    ),
    payload_skew = sk,
    ships_a_category_label = FALSE,
    why_no_label = paste(
      "Distilled from our own metaresearch labels, a student reproduced its own teacher's positive set at",
      "Jaccard 0.17 (finding 25). Two independent adversarial reviews reached the same verdict from",
      "different directions: per-teacher heads are useful for ALLOCATING HUMAN EFFORT and cosmetic as a",
      "solution to the contested boundary. Scores ship. Labels do not."
    ),
    what_the_classifier_is_actually_for = paste(
      "Not cost. Finding 13 says the LLM can read every work in the frame for $1,261, so there was never",
      "anything to avoid, and a proposal that budgeted the full screen while justifying a cheap substitute",
      "for it was describing two studies (D32). It is for: a calibrated score the audit stratifies on;",
      "rubric revisions testable in minutes instead of one $1,261 pass each; a frame-wide estimate of where",
      "the three teachers would split, which three full passes would cost 3x and ~25 days; and learnability",
      "as evidence about the boundary."
    )
  ),
  headline = glue(
    "THE CLASSIFIER MAY NOT LABEL, AND THE NUMBERS SAY WHY. Design-weighted, out-of-fold, venue-grouped: the ",
    "teacher heads reach AP {ap(fp,'opus')} to {ap(fp,'gpt')} at AUC ~0.8, with a {fp$heads$opus$lift_top_decile}x top-decile lift that is real and is lift toward MACHINE ",
    "labels. THE ESTIMAND MOVES THE SCORE {round(ap(fp,'consensus_any') / ap(fp,'consensus_unanimous'), 1)}x (unanimous {ap(fp,'consensus_unanimous')}, majority {ap(fp,'consensus_majority')}, any {ap(fp,'consensus_any')}), so there is no 'the' ",
    "target and choosing one silently settles the question the audit exists to answer. AND THE UNANIMOUS CORE IS ",
    "THE HARDEST TO LEARN, not the easiest: if the boundary were a shared line with noise around it, the agreed ",
    "core would be the separable part, and it is not. The between-head spread predicts where the teachers split ",
    "at {dis$lift_over_base}x the base rate: real, weak, and reported as an efficiency gain rather than a map. Finally, the ",
    "abstract is worth MORE THAN ANY MODELLING CHOICE (+{sk$abstract_is_worth_ap} AP, {round(100 * sk$abstract_is_worth_ap / sk$ap_frame_parity)}% relative), and the frame cannot serve it: ",
    "works.csv stores has_abstract, a boolean, and no text. The DEPLOYABLE model is the WORSE one, the build now ",
    "FAILS if a model is trained on a field inference cannot supply, and the gap is a priced budget decision ",
    "rather than an assumption."
  )
)
