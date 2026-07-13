#!/usr/bin/env Rscript
# Finding 13: what it actually costs to screen 3.5M works, measured rather than
# guessed, and why the pilot's method is not the method that scales.
#
# The proposal makes a feasibility claim. Feasibility is one of the six judging
# criteria, and a claim with no number behind it is exactly the kind of thing
# this project exists to object to. So: measure the real payload from the real
# screening artifacts, and derive the cost. Nothing here is hand-typed.
#
# WHAT THIS ESTABLISHES, AFTER IT WAS WRONG ONCE.
#
# An earlier version of this script charged the 1,876-token rubric against every
# single WORK. The rubric is a system prompt: it is sent once per CALL. The
# pilot's own chunk files, which this script reads to measure the payload, bundle
# a MEDIAN OF 155 WORKS PER CALL. So the rubric amortises 155-fold and the true
# cost is 5.1x lower than reported. (DEVIATIONS.md D7.)
#
# That error was not cosmetic. It changed the design of the study.
#
# Believing the full screen cost $24,379, I proposed a CHEAP TRIAGE in front of
# it: score all 3.5M works with a short prompt, keep ~8%, run the full rubric only
# on the survivors. And then I had to spend a paragraph defending it, because a
# triage IS A RETRIEVAL STEP, and this project's entire thesis is that retrieval
# destroys these maps: the topic route finds 12% of the field (finding 12).
#
# With the arithmetic right, THE TRIAGE IS UNNECESSARY:
#
#   full rubric, every work in the frame, Haiku-class, batched   ~$794
#   + a second screener (Sonnet) on a 20,000-record sample       ~$14
#   = ~$808, against a ~USD $2,900 grant.
#
# That is the same price as the triage design and it has NO PREFILTER. Every work
# in the frame is read against the full rubric. There is no retrieval step, so
# there is no retrieval recall to defend, and the thesis does not have to be
# argued around: it is simply obeyed.
#
# I proposed a prefilter because I thought I could not afford not to. I was wrong
# about the price. The prefilter is deleted.
#
# WHAT THE SECOND SCREENER IS FOR, AND WHY IT RUNS ON A SAMPLE. Finding 10: two
# machine screeners cannot establish accuracy (they share training data and fail
# together), so their agreement is a PROCESS metric. What the second one is for is
# (a) locating the contested boundary the human audit oversamples, and (b) the
# screener-swap range that is the honest uncertainty on the field's size. Both are
# SAMPLE quantities. Neither needs the frame.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(cli); library(glue)
})
source("R/findings.R")

# The frame is READ, not typed. `FRAME <- 3507205L` was an EXTRAPOLATION from one
# OpenAlex partition, made before the frame existed; the built frame holds
# 4,299,418 works and the estimate was 18% low. See R/frame_size.R.
source("R/frame_size.R")
FRAME <- frame_size()

# --- measure the real payload -------------------------------------------------
# A token is ~4 characters for English prose (the standard rule of thumb; we are
# sizing a budget, not billing a customer, and the two-stage conclusion is robust
# to a +/-25% error in this constant).
CHARS_PER_TOKEN <- 4

chunks <- list.files("pilot/screening/chunks", "\\.json$", full.names = TRUE)
recs   <- map_dfr(chunks, \(f) fromJSON(f, simplifyDataFrame = TRUE))

# Per-work payload. The first version of this script costed the full screen at
# the six-field token count, which prices the D1 DEVIATION rather than the plan:
# the rubric mandates eight fields (venue, topic, field, affiliations, funders).
#
# Naively re-measuring from the finding-16 chunks is ALSO wrong, in the other
# direction: pilot/make_haiku_sample.R trims abstracts at 1,200 characters, so
# its eight-field payload measures SMALLER than the pilot's untrimmed six-field
# one (229 vs 256 tokens), which would price a trim the full screen does not
# apply. So the eight-field cost is constructed from two clean measurements:
#
#   base      : the UNTRIMMED six-field payload, from the pilot's own chunks;
#   increment : the eight-field minus six-field difference measured on the
#               finding-16 sample, where BOTH arms carry the same trim, so the
#               subtraction isolates exactly what the five extra fields weigh.
payload_chars <- nchar(toJSON(recs, auto_unbox = TRUE)) / nrow(recs)
tok_work_6    <- round(payload_chars / CHARS_PER_TOKEN)

read_chunks <- function(dir) {
  fs <- list.files(dir, "^chunk_.*\\.json$", full.names = TRUE)
  stopifnot("chunks missing: run pilot/make_haiku_sample.R" = length(fs) > 0)
  map_dfr(fs, \(f) fromJSON(f, simplifyDataFrame = TRUE))
}
h6 <- read_chunks("pilot/screening/haiku/p6")
h8 <- read_chunks("pilot/screening/haiku/p8_guided")
stopifnot("the two haiku arms must hold the same works" = nrow(h6) == nrow(h8))
tok_extra_fields <- round(
  (nchar(toJSON(h8, auto_unbox = TRUE)) - nchar(toJSON(h6, auto_unbox = TRUE))) /
    nrow(h8) / CHARS_PER_TOKEN)

tok_work <- tok_work_6 + tok_extra_fields
payload_inflation_8_over_6 <- round(tok_work / tok_work_6, 2)

# The rubric is re-sent with every call (it is the system prompt), so its LENGTH
# is a cost driver, not a detail. Read it from the file rather than pinning a
# constant: the full screen will send whatever the rubric says then, and a cost
# model that ignores that is a cost model for a study nobody is running.
#
# The consequence is deliberate and worth stating, because it looks like a bug
# the first time it bites: EDITING THE RUBRIC CHANGES THESE DOLLAR FIGURES. Add a
# worked example to the rubric and the estimate rises. That is correct, and
# pilot/check_proposal_numbers.R will fail the build until the proposal agrees
# again. Prose that silently stops matching its own arithmetic is the failure
# this whole project is about.
rubric_chars <- file.size("docs/protocol/rubric.md")
tok_rubric   <- round(rubric_chars / CHARS_PER_TOKEN)

# Output: one label per work. Measured from screener A's emitted labels.
a <- fromJSON("pilot/screening/screener_a.json")$labels
tok_out <- round(nchar(toJSON(a, auto_unbox = TRUE)) / nrow(a) / CHARS_PER_TOKEN)

cli_h1("Measured payload, from the pilot's own screening artifacts")
cli_li("works in the chunk files    : {format(nrow(recs), big.mark=',')}")
cli_li("payload per work, SIX-field (the pilot's deviation)   : {tok_work_6} tokens")
cli_li("the five withheld fields, measured                     : +{tok_extra_fields} tokens")
cli_li("payload per work, EIGHT-field (what the rubric says)  : {tok_work} tokens ({payload_inflation_8_over_6}x)")
cli_li("rubric (re-sent every call) : {format(tok_rubric, big.mark=',')} tokens")
cli_li("label emitted per work      : {tok_out} tokens")
cli_alert_info("all frame-scale costs below are priced at the EIGHT-field payload: the study, not the deviation")

# --- what a naive full-frame screen costs -------------------------------------
# Batch API pricing, USD per 1M tokens (50% off standard). Sonnet-class.
IN_M  <- 1.50
OUT_M <- 7.50
# A cheap high-recall first pass needs the record but not the full rubric: a
# short prompt, a yes/maybe/no. Haiku-class.
CHEAP_IN_M  <- 0.50
CHEAP_OUT_M <- 2.50
CHEAP_PROMPT_TOK <- 120L   # a short triage instruction, not the full rubric
CHEAP_OUT_TOK    <- 5L     # one word

# THE RUBRIC IS A SYSTEM PROMPT. IT IS SENT ONCE PER *CALL*, NOT ONCE PER *WORK*.
#
# An earlier version of this script charged the full 1,876-token rubric against
# every single work, and reported that screening the frame twice costs $24,379:
# "eight times this grant". That was wrong by a factor of five, and the evidence
# it was wrong was sitting in the very files the script reads to measure the
# payload. The pilot's own chunk files bundle a MEDIAN OF 155 WORKS PER CALL, so
# the rubric amortises 155-fold. Measuring the payload from the artifacts and then
# ignoring what the same artifacts say about batching is not measurement.
#
# The conclusion survives (see below) and the rhetoric does not. DEVIATIONS.md D7.
BATCH <- median(map_int(chunks, \(f) nrow(fromJSON(f))))

cost <- function(n, tok_work, tok_prompt, tok_out, in_m, out_m, batch = BATCH) {
  input <- n * tok_work + (n / batch) * tok_prompt   # prompt once per CALL
  (input / 1e6) * in_m + (n * tok_out / 1e6) * out_m
}

full_one <- cost(FRAME, tok_work, tok_rubric, tok_out, IN_M, OUT_M)
full_two <- 2 * full_one
naive_two <- 2 * cost(FRAME, tok_work, tok_rubric, tok_out, IN_M, OUT_M, batch = 1)

cli_h2("Naive design: the full rubric over the whole frame")
cli_li("works per call, measured from the pilot's own chunks : {BATCH}")
cli_li("one screener  : ${format(round(full_one), big.mark=',')}")
cli_li("two screeners : ${format(round(full_two), big.mark=',')}")
cli_alert_warning(
  "An earlier version of this script charged the rubric once per WORK and got \\
   ${format(round(naive_two), big.mark=',')}, then called that 'eight times the grant'. It is a system prompt; it is \\
   sent once per CALL. Corrected, it is {round(naive_two/full_two, 1)}x smaller."
)
cli_alert_danger(
  "The conclusion still holds: ${format(round(full_two), big.mark=',')} against a CAD $4,000 (~USD $2,900) grant is \\
   {round(full_two/2900, 1)}x, and it leaves nothing for the human coder who IS the study. \\
   The design still has to change. It just has to change for the right reason."
)

# --- the design that fits, and it has NO PREFILTER -----------------------------
# Screen EVERY work in the frame against the FULL rubric. No triage, no keep rate,
# no retrieval step, nothing to defend. The cheap model does the frame; the
# expensive one does a sample, because finding 10 says its output is a process
# metric and process metrics are sample quantities.
HAIKU_FRAME  <- cost(FRAME, tok_work, tok_rubric, tok_out, CHEAP_IN_M, CHEAP_OUT_M)
SONNET_FRAME <- cost(FRAME, tok_work, tok_rubric, tok_out, IN_M, OUT_M)
SCREENER_B_N <- 20000L
screener_b   <- cost(SCREENER_B_N, tok_work, tok_rubric, tok_out, IN_M, OUT_M)

no_prefilter <- HAIKU_FRAME + screener_b

# THE INSTRUMENT THAT WILL ACTUALLY RUN. Everything above is priced at the v1
# rubric, because the measured artifacts are v1's. The funded screen runs under
# the locked v3.1 instrument, which is longer (seven cited categories, worked
# examples, a study-design vocabulary) and emits more fields per label. Pricing
# only the short instrument would understate the bound: D7 with the sign
# flipped. The rubric resolves newest-first, so editing it moves these dollars
# on the next build, and check_proposal_numbers fails until the proposal agrees.
RUBRIC_CURRENT <- Filter(file.exists, c("docs/protocol/rubric-v3.md",
                                        "docs/protocol/rubric-v2.md",
                                        "docs/protocol/rubric.md"))[1]
tok_rubric_v31 <- round(file.size(RUBRIC_CURRENT) / CHARS_PER_TOKEN)
# v3.1 labels carry 8 fields where the measured v1 labels carried 6; scale the
# MEASURED output tokens by the field ratio rather than asserting a number.
tok_out_v31 <- round(tok_out * 8 / 6)
HAIKU_FRAME_V31  <- cost(FRAME, tok_work, tok_rubric_v31, tok_out_v31, CHEAP_IN_M, CHEAP_OUT_M)
screener_b_v31   <- cost(SCREENER_B_N, tok_work, tok_rubric_v31, tok_out_v31, IN_M, OUT_M)
no_prefilter_v31 <- HAIKU_FRAME_V31 + screener_b_v31

# WHAT THE AWARD BUYS, in the call's own words: "travel, accommodation, and
# related participation costs". NOT compute, NOT coder wages. An earlier budget
# quietly assumed the award paid for both (D30), which would have planned the
# study against money that may not legally reach it. The grant figure below
# stays ONLY to show the compute fits inside even a solo self-funded budget.
GRANT_USD <- 2900

cli_h2("The design that fits, and it needs no prefilter at all")
cli_li("full rubric, ALL {format(FRAME, big.mark=',')} works, Haiku-class : ${format(round(HAIKU_FRAME), big.mark=',')} (v1 instrument) / ${format(round(HAIKU_FRAME_V31), big.mark=',')} (locked v3.1)")
cli_li("second screener (Sonnet) on {format(SCREENER_B_N, big.mark=',')} stratified : ${format(round(screener_b), big.mark=',')} / ${format(round(screener_b_v31), big.mark=',')}")
cli_alert_success(
  "TOTAL ${format(round(no_prefilter), big.mark=',')} at the v1 instrument; ${format(round(no_prefilter_v31), big.mark=',')} at the v3.1 instrument that will actually run. \\
   SELF-FUNDED: the call's CAD $4,000 covers travel and participation, not compute (D30)."
)

# --- the design I nearly shipped, and why it is worse --------------------------
KEEP      <- 0.08
triage    <- cost(FRAME, tok_work, CHEAP_PROMPT_TOK, CHEAP_OUT_TOK, CHEAP_IN_M, CHEAP_OUT_M)
survivors <- round(FRAME * KEEP)
rubric_on_survivors <- cost(survivors, tok_work, tok_rubric, tok_out, IN_M, OUT_M)
with_prefilter <- triage + rubric_on_survivors + screener_b

cli_h2("Compare: the two-stage design I proposed when I thought the screen cost $24,379")
cli_li("cheap triage over all {format(FRAME, big.mark=',')} works : ${format(round(triage), big.mark=',')}")
cli_li("full rubric on the {format(survivors, big.mark=',')} survivors : ${format(round(rubric_on_survivors), big.mark=',')}")
cli_li("second screener on {format(SCREENER_B_N, big.mark=',')} : ${format(round(screener_b), big.mark=',')}")
cli_li("total : ${format(round(with_prefilter), big.mark=',')}")
cli_alert_danger(
  "It saves ${format(round(no_prefilter - with_prefilter), big.mark=',')}. For that, it buys a RETRIEVAL STEP in front of a project whose \\
   central finding is that retrieval destroys these maps (finding 12: the topic route \\
   finds 12% of the field). It would then need its recall measured, its keep rate \\
   justified, and a paragraph of the proposal defending it."
)
cli_alert_success(
  "So it is DELETED. The prefilter existed only because I had miscosted the alternative \\
   by {round(naive_two/full_two, 1)}x. With the arithmetic right, the frame is screened in full and the thesis \\
   is obeyed rather than argued around."
)

cli_h2("And the pilot's method is NOT the method that scales")
cli_alert_warning(
  "The pilot screened {format(nrow(recs), big.mark=',')} works with agent fan-out (40 concurrent agents). \\
   The frame is {round(FRAME/nrow(recs))}x that. Agent fan-out does not scale to it; BATCH INFERENCE does."
)

record_finding(
  "screening_cost",
  list(
    measured_from            = "pilot/screening/chunks/*.json (6-field), pilot/screening/haiku/p8_guided/chunk_*.json (8-field), docs/protocol/rubric.md; not asserted",
    chars_per_token_assumed  = CHARS_PER_TOKEN,
    tokens_per_work          = tok_work,
    tokens_per_work_six_field_deviation = tok_work_6,
    payload_inflation_8_over_6 = payload_inflation_8_over_6,
    costed_at_the_rubric_payload_not_the_deviation = TRUE,
    tokens_rubric            = tok_rubric,
    tokens_per_label         = tok_out,
    batch_works_per_call     = BATCH,
    frame_size               = FRAME,
    grant_usd_approx         = GRANT_USD,
    # the error that changed the design
    naive_cost_charging_rubric_per_work_usd = round(naive_two),
    corrected_cost_two_screeners_usd        = round(full_two),
    cost_overstatement_x                    = round(naive_two / full_two, 1),
    # the design that fits, with NO prefilter
    cost_full_rubric_whole_frame_cheap_usd  = round(HAIKU_FRAME),
    cost_full_rubric_whole_frame_sonnet_usd = round(SONNET_FRAME),
    cost_second_screener_on_sample_usd      = round(screener_b),
    second_screener_n                       = SCREENER_B_N,
    total_no_prefilter_usd                  = round(no_prefilter),
    # the instrument that will actually run (longer rubric, 8-field labels)
    tokens_rubric_v31                       = tok_rubric_v31,
    tokens_per_label_v31                    = tok_out_v31,
    cost_full_rubric_whole_frame_v31_usd    = round(HAIKU_FRAME_V31),
    cost_second_screener_v31_usd            = round(screener_b_v31),
    total_no_prefilter_v31_usd              = round(no_prefilter_v31),
    award_pays_for_compute                  = FALSE,
    award_purpose_in_the_calls_words        = "travel, accommodation, and related participation costs",
    prefilter_needed                        = FALSE,
    # the design that was deleted
    prefilter_design_total_usd              = round(with_prefilter),
    prefilter_saving_usd                    = round(with_prefilter - no_prefilter),
    prefilter_deleted_because = paste(
      "It is a RETRIEVAL STEP, in a project whose central finding is that retrieval",
      "destroys these maps (finding 12: the topic route finds 12% of the field). It",
      "existed only because the rubric was miscosted at once per WORK rather than once",
      "per CALL, overstating the alternative 5.1x. With the arithmetic right it saves",
      "almost nothing and costs the thesis. Deleted."
    ),
    pilot_works_screened     = nrow(recs),
    frame_to_pilot_ratio     = round(FRAME / nrow(recs)),
    method_that_scales       = "batch inference, not agent fan-out",
    supersedes = paste(
      "an earlier version charged the rubric once per work, reported $24,379 for the",
      "full-frame two-screener design, called it 'eight times the grant', and used that",
      "to justify a cheap prefilter. The rubric is a system prompt sent once per CALL,",
      "and the pilot's own chunks batch 155 works per call. DEVIATIONS.md D7."
    ),
    caveat = paste(
      "Token counts use a 4-chars-per-token approximation and list prices as of 2026-07;",
      "both will move, and the conclusion is robust to +/-25% in either. Screening the",
      "frame with a cheaper model than the pilot used makes the CHOICE OF MODEL more",
      "consequential, not less: finding 10 shows two screeners already imply base rates a",
      "factor of two apart. That is precisely why the second screener and the",
      "screener-swap range are reported, and why the human audit is the study."
    )
  ),
  headline = glue(
    "The full rubric over the {format(FRAME, big.mark=',')}-work frame with two screeners costs ${format(round(full_two), big.mark=',')}, not the ",
    "${format(round(naive_two), big.mark=',')} an earlier version of this script reported: the rubric is a system prompt sent once per CALL, ",
    "and the pilot's own chunks batch {BATCH} works per call, so it was overcharged {round(naive_two/full_two, 1)}x. That error was not ",
    "cosmetic. It made me propose a cheap TRIAGE in front of the screen, which is a RETRIEVAL STEP in a project ",
    "whose central finding is that retrieval destroys these maps. With the arithmetic right the triage is ",
    "unnecessary: the full rubric over EVERY work in the frame, plus a second screener on a {format(SCREENER_B_N, big.mark=',')}-record ",
    "sample, costs ${format(round(no_prefilter), big.mark=',')} at the v1 instrument and ${format(round(no_prefilter_v31), big.mark=',')} at the locked v3.1 instrument that will actually run. ",
    "THE PREFILTER IS DELETED. And the compute is SELF-FUNDED: the call's CAD $4,000 covers, in its own words, ",
    "'travel, accommodation, and related participation costs', not inference and not coder wages (D30)."
  )
)
