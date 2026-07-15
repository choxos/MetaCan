#!/usr/bin/env Rscript
# Finding 14: the audit, as I first specified it, CANNOT MEASURE THE THING IT
# EXISTS TO MEASURE. Here is the arithmetic, and here is the design that can.
#
# ------------------------------------------------------------------------------
# THE HOLE
# ------------------------------------------------------------------------------
# The proposal's central promise is "a human audit will quantify what the pipeline
# missed". The mechanism was: partition the frame into screened-in and
# screened-out, draw a probability sample from BOTH, human-code them, and use
# design weights to estimate sensitivity.
#
# The screened-out stratum is ~98.7% of a 3.5M-work frame. The works the screen
# WRONGLY rejected are a vanishing fraction of it. So a simple random sample of
# the screened-out mass finds essentially none of them, and you cannot estimate a
# rate from zero events. The numbers below are brutal: at 95% screen recall, 600
# screened-out records yield an EXPECTED 0.4 hits. To see twenty you would need to
# human-code tens of thousands of records: thousands of coder-hours against the 65
# the proposal budgets.
#
# This is not a flaw introduced by the cheap triage in finding 13. It was in the
# design before that, and I did not see it. A proposal whose thesis is "measure
# what you missed" had, at its centre, an instrument that could not measure what
# it missed.
#
# ------------------------------------------------------------------------------
# WHY THE OBVIOUS PATCH IS NOT ENOUGH
# ------------------------------------------------------------------------------
# The textbook fix is to stratify the screened-out set by the screener's score and
# oversample the top: false negatives concentrate near the threshold. The pilot
# says this works, and says how well: of the 37 works GPT pulled in that Claude
# rejected, THIRTY were in the contested-boundary stratum and only six were in the
# settled rejects. The misses are not spread evenly through the rejected mass.
#
# But look at what that buys, and what it cannot. Score-stratified sampling finds
# the works the screener ALMOST caught. It is structurally blind to the works the
# screener rejected WITH CONFIDENCE.
#
# WHICH WORKS ARE THOSE? Be careful here, because an earlier version of this script
# answered with a number it did not have. It said finding 11 shows the confident
# rejects are "exactly the T2/no-abstract works", citing a 3.6x differential. That
# differential is WITHDRAWN: the cell held four works and the interaction was not
# significant (p = 0.141). See DEVIATIONS.md D6. This script no longer leans on it.
#
# What remains is a MECHANISM, stated a priori from the instrument's own text, plus
# a measured coverage deficit. Both are enough.
#
#   THE MECHANISM. The rubric tells the screener: if the abstract is missing, judge
#   on the TITLE alone. The rubric ALSO names, as its third decisive error, that T2
#   work (STS, LIS, the humanities) MAY USE NONE OF THE FIELD'S VOCABULARY. Put
#   those two sentences together and the consequence is not a hypothesis, it is
#   arithmetic on the rubric: a work with no abstract whose title carries none of
#   the vocabulary will be rejected, and rejected CONFIDENTLY, because nothing in
#   what the screener can see looks like metaresearch. Such a work does not sit near
#   the threshold. It sits deep in the settled rejects, where (i) never looks.
#
#   THE MEASURED DIFFERENCE. 31.5% of the frame carries no abstract, and there one
#   historical model assigned positive labels at roughly half the rate observed
#   among works with abstracts (0.78% vs 1.55%, p = 0.023, robust to adjustment for
#   year and language). A third of the frame is judged on a title. The difference
#   does not establish accuracy, bias, or field prevalence.
#
#   AND THE HARNESS MADE IT WORSE. DEVIATIONS.md D1: the pilot screen was sent six
#   of the eight fields the rubric mandates. Venue, OpenAlex topic, field,
#   affiliations and funders were all WITHHELD. Those are precisely the signals that
#   could rescue a work whose title says nothing. The pilot ran maximally exposed to
#   this failure mode, by accident.
#
# What is NOT claimed: that this blindness has been shown to fall differentially on
# STS and LIS. It has not. It is a reasoned expectation from the rubric's own text,
# and the venue instrument below is how it gets TESTED rather than asserted.
#
# So the one instrument the audit has is blind exactly where the mechanism predicts
# the bias will be. That is worse than having no instrument, because it returns a
# confident number.
#
# ------------------------------------------------------------------------------
# THE TWO INSTRUMENTS THAT ACTUALLY WORK
# ------------------------------------------------------------------------------
# 1. TEST THE FILTER ON LABELLED DATA, NOT ON THE HAYSTACK. The pilot already has
#    5,737 works carrying full-rubric labels. Any filter's recall can be measured
#    directly against them for free: run it over the 5,737 and count what it drops.
#    That is exactly how finding 12 measured the topic route (12%). You never need
#    to hunt for needles in 3.2M discarded works to know what a filter discards;
#    you run the filter on works whose truth you already know.
#
# 2. KNOWN-ITEM RECALL, FOR THE BLIND SPOT SCORES CANNOT SEE. Build a reference
#    set of works that are in-scope by an EXTERNAL criterion, then measure what
#    fraction of it the pipeline keeps. The best such criterion is VENUE: a
#    Canadian-authored article in Social Studies of Science, Scientometrics,
#    Quantitative Science Studies, Research Integrity and Peer Review or JASIST is
#    metaresearch or T2-adjacent BY WHERE IT WAS PUBLISHED, whatever its abstract
#    says about cattle or cardiology.
#
#    This is the frame flip applied a second time, and that is why it works. The
#    project's whole move is to replace "does this look like metaresearch?" with an
#    external, checkable criterion. Aboutness is what defeats topic retrieval
#    (finding 12) and it is what defeats a title-only screen (finding 11). Venue is
#    immune to aboutness. So venue is the instrument that can see into the blind
#    spot, and it costs a few hundred human judgements rather than thousands of
#    hours.

suppressPackageStartupMessages({
  library(dplyr); library(jsonlite); library(cli); library(glue)
})
source("R/findings.R")

# The frame is READ, not typed. `FRAME <- 3507205L` was an EXTRAPOLATION from one
# OpenAlex partition, made before the frame existed; the built frame holds
# 4,299,418 works and the estimate was 18% low. See R/frame_size.R.
source("R/frame_size.R")
FRAME <- frame_size()
BASE_RATE <- 0.0131
FIELD     <- FRAME * BASE_RATE
N_OUT     <- 600L                 # screened-out records the audit budgeted
MIN_HITS  <- 20L                  # events needed for a usable rate
MIN_PER_CODING <- 2               # minutes per record, dual-coded

# The screened-out stratum is what the SCREEN rejects, which at a 1.31% base rate
# is 98.7% of the frame. An earlier version of this script sized it as what a cheap
# TRIAGE discarded (92% of the frame), because finding 13 then proposed one. The
# triage is deleted (finding 13, DEVIATIONS.md D7), and removing it makes this
# finding WORSE, not better: the pool the audit must search is bigger, so the
# density of the screen's misses inside it is lower still.
dropped_pool <- FRAME * (1 - BASE_RATE)

cli_h1("Can a simple random sample of the screened-out mass measure recall?")
grid <- tibble(recall = c(0.99, 0.95, 0.90, 0.80)) |>
  mutate(
    missed        = (1 - recall) * FIELD,
    density       = missed / dropped_pool,
    exp_hits_600  = N_OUT * density,
    n_for_20_hits = MIN_HITS / density,
    coder_hours   = n_for_20_hits * MIN_PER_CODING * 2 / 60
  )
print(grid |> mutate(across(c(missed, n_for_20_hits, coder_hours), \(x) round(x)),
                     density = sprintf("%.4f%%", 100 * density),
                     exp_hits_600 = round(exp_hits_600, 2)) |> as.data.frame())

worst <- grid |> filter(recall == 0.95)
cli_alert_danger(
  "At 95% screen recall, the {N_OUT} screened-out records the audit budgeted yield an EXPECTED \\
   {round(worst$exp_hits_600, 2)} HITS. You cannot estimate a rate from zero events. Seeing {MIN_HITS} would take \\
   {format(round(worst$n_for_20_hits), big.mark=',')} human codings: {format(round(worst$coder_hours), big.mark=',')} coder-hours, against the 65 budgeted."
)
cli_alert_warning(
  "This hole predates the triage. It is in the two-phase design itself, and I did not see it \\
   until I did the arithmetic. The audit could not measure what the pipeline missed."
)

# --- what the pilot says about WHERE the misses live --------------------------
ag <- fromJSON("pilot/results/findings.json")$agreement$values
bs <- as.data.frame(ag$agreement_by_stratum)

cli_h1("Do the misses concentrate? The pilot already answered this.")
print(bs |> select(stratum, n, sel_prob, a_says_in, b_says_in))
boundary_hits <- bs$b_says_in[bs$stratum == "boundary"]
settled_hits  <- bs$b_says_in[bs$stratum == "settled_out"]
cli_alert_info(
  "Of the {ag$gpt_in_claude_out} works GPT pulled in that Claude rejected, {boundary_hits} are in the CONTESTED \\
   BOUNDARY and only {settled_hits} are in the settled rejects. Misses concentrate near the threshold, \\
   so score-stratified oversampling of the screened-out set is not optional; it is the only \\
   thing that makes the stratum samplable at all."
)

# --- but score-stratification is blind where the MECHANISM predicts the bias ----
rb <- fromJSON("pilot/results/findings.json")$base_rate_robustness$values
cli_h2("And here is what score-stratification CANNOT see")
cli_alert_warning(
  "NOT claimed: that the blindness falls DIFFERENTIALLY on STS and LIS. An earlier version of \\
   this script said so, citing a 3.6x figure from finding 11. That figure rested on four works \\
   and a non-significant interaction (p = {rb$interaction_p}) and is WITHDRAWN (DEVIATIONS.md D6)."
)
cli_alert_danger(
  "What IS claimed, and it is enough. MECHANISM: the rubric says judge on the title alone when the \\
   abstract is missing, and the rubric ALSO says T2 work may use none of the field's vocabulary. A \\
   work with neither is rejected CONFIDENTLY. It sits deep in the settled rejects, not near the \\
   threshold, so score-stratified sampling never looks at it. MEASURED: {rb$no_abstract_share_pct}% of the frame \\
   carries no abstract. There, one historical model assigned positive labels at {rb$base_rate_no_abstract_pct}% against \\
   {rb$base_rate_has_abstract_pct}% where abstracts were available (p = {rb$chisq_p_abstract}). This is model behaviour, \\
   not evidence of accuracy or field prevalence."
)
cli_alert_danger(
  "AND THE HARNESS MADE IT WORSE (DEVIATIONS.md D1). The pilot screen was sent SIX of the EIGHT \\
   fields the rubric mandates: venue, topic, field, affiliations and funders were all WITHHELD. \\
   Those are exactly the signals that could rescue a work whose title says nothing. The pilot ran \\
   maximally exposed to this failure mode, by accident."
)
cli_alert_warning(
  "So the audit's one instrument is blind exactly where the mechanism predicts the bias. That is \\
   worse than no instrument, because it returns a confident number. The venue instrument below is \\
   how the prediction gets TESTED rather than asserted."
)

# --- instrument 1: measure the filter on labelled data ------------------------
a <- fromJSON("pilot/screening/screener_a.json")$labels
n_labelled <- nrow(a)
n_inscope  <- sum(a$tier %in% c("T1", "T2"))

cli_h1("Instrument 1: test the filter on works whose truth you already know")
cli_li("works already carrying full-rubric labels : {format(n_labelled, big.mark=',')}")
cli_li("of which in scope (T1+T2)                 : {n_inscope}")
cli_alert_success(
  "Any filter's recall is measurable against these for FREE: run it over the {format(n_labelled, big.mark=',')} and \\
   count what it drops. That is exactly how finding 12 scored the topic route (12%). You never \\
   need to hunt needles in {format(round(dropped_pool), big.mark=',')} discarded works to learn what a filter discards."
)

# --- instrument 2: known-item recall, via venue -------------------------------
# Venue is an EXTERNAL criterion, like Canadian affiliation. It is immune to
# aboutness, which is the thing that defeats both topic retrieval (finding 12)
# and a title-only screen (finding 11).
REFERENCE_VENUES <- c(
  "Social Studies of Science", "Scientometrics", "Quantitative Science Studies",
  "Research Integrity and Peer Review", "Journal of the Association for Information Science and Technology",
  "Research Evaluation", "Accountability in Research", "PLOS ONE (metaresearch collection)",
  "Recherches qualitatives", "Documentation et bibliotheques"
)
cli_h1("Instrument 2: known-item recall, on an external criterion")
cli_li("reference venues (in-scope BY WHERE PUBLISHED, whatever the abstract is about):")
for (v in REFERENCE_VENUES) cli_li("  {v}")
cli_alert_success(
  "A Canadian-authored article in Social Studies of Science is T2 by venue even if its abstract \\
   is entirely about cattle or cardiology. Venue is immune to aboutness, so it is the ONE \\
   instrument that can see into the blind spot finding 11 found. This is the frame flip applied \\
   a second time: replace 'does this look like metaresearch?' with an external, checkable criterion."
)

record_finding(
  "audit_power",
  list(
    problem = paste(
      "A simple random sample of the screened-out stratum cannot measure screening",
      "sensitivity: the works the screen wrongly rejected are a vanishing fraction of",
      "a 3.2M-record rejected mass."
    ),
    screened_out_pool           = round(dropped_pool),
    screened_out_is_the_screens_rejects = TRUE,
    audit_screened_out_budgeted = N_OUT,
    expected_hits_at_95_recall  = round(worst$exp_hits_600, 2),
    codings_needed_for_20_hits_at_95_recall = round(worst$n_for_20_hits),
    coder_hours_needed          = round(worst$coder_hours),
    coder_hours_budgeted        = 65,
    naive_audit_is_powered      = FALSE,
    # where the misses actually live
    disputed_in_boundary        = boundary_hits,
    disputed_in_settled_rejects = settled_hits,
    misses_concentrate_near_threshold = TRUE,
    # and what that still cannot see
    blind_spot = paste(
      "Score-stratified oversampling finds the works the screener ALMOST caught; it is",
      "blind to the ones it rejected CONFIDENTLY. WHICH works those are is a MECHANISM,",
      "not a measurement: the rubric says judge on the title alone when the abstract is",
      "missing, and the rubric also says T2 work may use none of the field's vocabulary,",
      "so a work with neither is rejected confidently and sits deep in the settled",
      "rejects. An earlier version cited a 3.6x differential from finding 11 as if this",
      "were measured. It is not, and that figure is withdrawn (DEVIATIONS.md D6). The",
      "venue instrument is how the prediction gets tested rather than asserted."
    ),
    blind_spot_is_a_mechanism_not_a_measurement = TRUE,
    # the two instruments that work
    instrument_1 = paste(
      "Measure any filter's recall against the", n_labelled, "works that already carry",
      "full-rubric labels, exactly as finding 12 scored the topic route. Free, and it",
      "needs no needle-hunting in the discarded mass."
    ),
    instrument_2 = paste(
      "Known-item recall on an external criterion: VENUE. A Canadian-authored paper in",
      "Social Studies of Science is T2 by where it was published, whatever its abstract",
      "is about. Venue is immune to aboutness, which is what defeats topic retrieval",
      "(finding 12) and title-only screening (finding 11), so it is the only instrument",
      "that can see into the blind spot."
    ),
    reference_venues = REFERENCE_VENUES,
    n_labelled_works = n_labelled,
    n_in_scope       = n_inscope,
    caveat = paste(
      "The recall grid assumes the screen's misses are uniform in the rejected mass,",
      "which the pilot shows they are not (they concentrate at the boundary). That makes",
      "the naive design LESS hopeless than the grid implies but does not save it, and it",
      "does nothing at all about the confident-reject blind spot. Known-item recall on a",
      "venue reference set is a non-probability estimate: it bounds and diagnoses recall",
      "on the hard cases, it does not replace the design-weighted population estimate."
    )
  ),
  headline = glue(
    "The audit as first specified could not measure what it exists to measure. A simple random sample of the ",
    "{format(round(dropped_pool), big.mark=',')}-record screened-out mass yields an expected {round(worst$exp_hits_600, 2)} hits from the {N_OUT} records ",
    "budgeted; seeing {MIN_HITS} would take {format(round(worst$coder_hours), big.mark=',')} coder-hours against the 65 planned. Score-stratified ",
    "oversampling rescues it only partly (the pilot shows {boundary_hits} of {ag$gpt_in_claude_out} disputed works sit at the contested ",
    "boundary), and it stays BLIND to the confident rejects. Which works those are is a MECHANISM, not a measured ",
    "differential: the rubric says judge on the title alone with no abstract, and says T2 work may use none of the ",
    "field's vocabulary, so a work with neither is rejected confidently and never sampled. (An earlier version cited a ",
    "3.6x figure here as if it were measured; it rested on four works and is withdrawn.) So recall is measured two ",
    "other ways: against the {format(n_labelled, big.mark=',')} works that already carry ",
    "rubric labels, and by KNOWN-ITEM recall on a venue reference set, because venue is an external criterion ",
    "immune to the aboutness that defeats everything else."
  )
)
