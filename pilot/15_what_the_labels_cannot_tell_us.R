#!/usr/bin/env Rscript
# Finding 15: two limits on the machine labels themselves, found by attacking the
# FIXES rather than the original design.
#
# ------------------------------------------------------------------------------
# (A) THE 12% IS ONE MODEL'S OPINION. SCORE IT AGAINST THE OTHER AND IT IS 7%.
# ------------------------------------------------------------------------------
# Finding 12's headline (the topic route retrieves 12% of Canadian metaresearch)
# is measured against screener A's labels. Finding 14 then promotes that method to
# a general instrument: "any filter's recall is measured on the 5,737 works that
# already carry rubric labels".
#
# But those labels are a MACHINE's. So the instrument measures agreement with a
# machine, not accuracy, and finding 10 already proved that machine-vs-machine
# agreement is a process metric that moves by a factor of two when you swap models.
#
# The obvious question is therefore: does the 12% move too? It does.
#
#   scored against screener A (Claude):  recall 12%
#   scored against screener B (GPT):     recall  7%
#
# This is finding 10's screener swap, applied to finding 12's headline. It was not
# applied there, and it should have been from the start.
#
# WHAT SURVIVES, AND IT IS THE POINT. Both numbers say the same thing: the topic
# route finds a SMALL FRACTION of the field, and the disagreement is about whether
# that fraction is one in eight or one in fourteen. The conclusion is not merely
# unharmed by the swap, it is STRENGTHENED: the second screener thinks the route is
# WORSE. But "12%" is not a measurement against truth, and this project does not
# get to quote it as one. Only the human audit measures against truth.
#
# ------------------------------------------------------------------------------
# (B) THE FRENCH STRATUM IS NOT POWERED. NOT EVEN CLOSE.
# ------------------------------------------------------------------------------
# The proposal promises "French and English performance reported separately". That
# is its answer to the inclusiveness criterion, and it is a promise about the AUDIT.
#
# The audit has a budget of n ~= 1,000 records and ~65 coder-hours.
#
# The pilot contains ONE French in-scope work. One. At that rate, seeing twenty
# French positives requires coding on the order of 1,600 French records, which is
# larger than the entire audit. French SENSITIVITY cannot be estimated at this n,
# and no amount of stratification conjures positives that are not in the frame.
#
# WHY, AND WHY IT IS NOT A REASON TO DROP THE CLAIM. The frame here is
# OpenAlex-only. Erudit, the principal francophone Canadian platform, matches ZERO
# OpenAlex sources (finding 3). So the francophone metaresearch is not thinly
# represented in this frame; it is very largely ABSENT FROM IT. "Exactly one of 75
# is French" is not a fact about Canadian scholarship. It is a measurement of the
# pipeline's blindness, and it is the strongest single argument for harvesting
# Erudit rather than a reason to abandon the French claim.
#
# WHAT THE PROPOSAL MUST THEREFORE SAY, AND NOW DOES:
#   - French power comes from the ERUDIT HARVEST, not from OpenAlex.
#   - The pilot did not harvest Erudit (it verified the endpoint: 379 sets, live).
#   - So I CANNOT YET DEMONSTRATE that the French stratum will be powered. I can
#     state the condition it depends on, and the number that decides it.
#   - If the Erudit harvest does not deliver enough French metaresearch to estimate
#     a French sensitivity, the French claim is WITHDRAWN, not fudged. That was
#     always the contingency; this finding puts a number on when it triggers.

suppressPackageStartupMessages({
  library(dplyr); library(jsonlite); library(cli); library(glue)
})
source("R/findings.R")
source("R/frame.R")

AUDIT_N        <- 1000L   # records the audit can afford to human-code
MIN_POSITIVES  <- 20L     # events needed for a usable sensitivity estimate

d <- readRDS("pilot/screening/canadian_sample.rds") |>
  mutate(id = sub(".*/", "", id), topic_id = sub(".*/", "", topic_id))
a <- fromJSON("pilot/screening/screener_a.json")$labels
b <- fromJSON("pilot/screening/labels_joined.json") |> distinct(id, .keep_all = TRUE)

# --- (A) the topic route's recall, scored against EACH screener ----------------
score_route <- function(lab) {
  j <- lab |> left_join(d |> select(id, topic_id), by = "id") |>
    mutate(on_route = !is.na(topic_id) & topic_id %in% CANDIDATE_TOPICS)
  tp <- sum(j$on_route & j$in_scope); fn <- sum(!j$on_route & j$in_scope)
  ci <- binom.test(tp, tp + fn)$conf.int
  list(n = nrow(lab), pos = tp + fn, tp = tp,
       recall = 100 * tp / (tp + fn), lo = 100 * ci[1], hi = 100 * ci[2])
}
ra <- score_route(a |> transmute(id, in_scope = tier %in% c("T1", "T2")))
rb <- score_route(b |> transmute(id, in_scope = in_b))

cli_h1("(A) The topic route's recall depends on WHICH MACHINE you score it against")
cli_li("against screener A (Claude): {round(ra$recall)}% (95% CI {round(ra$lo)}-{round(ra$hi)}), from {ra$pos} positives")
cli_li("against screener B (GPT)   : {round(rb$recall)}% (95% CI {round(rb$lo)}-{round(rb$hi)}), from {rb$pos} positives")
cli_alert_danger(
  "Finding 14 promotes 'score the filter against the 5,737 rubric labels' to a general \\
   instrument. Those labels are a MACHINE's, so the instrument measures AGREEMENT WITH A \\
   MACHINE, not accuracy. Finding 10 proved that quantity swings by a factor of two. Here it \\
   swings the headline from {round(ra$recall)}% to {round(rb$recall)}%."
)
cli_alert_success(
  "The CONCLUSION survives and in fact strengthens: both screeners say the topic route finds \\
   a small fraction of the field, and the second one thinks it is WORSE. But 12% is not a \\
   measurement against truth, and this project does not get to quote it as one."
)

# --- (B) is the French stratum powered? ---------------------------------------
j <- a |>
  left_join(d |> select(id, language), by = "id") |>
  mutate(in_scope = tier %in% c("T1", "T2"),
         french   = !is.na(language) & language == "fr")

fr_n   <- sum(j$french)
fr_pos <- sum(j$french & j$in_scope)
fr_rate <- fr_pos / fr_n
needed <- MIN_POSITIVES / max(fr_rate, 1e-9)

cli_h1("(B) Is the French stratum powered for ANYTHING?")
cli_li("French records in the pilot : {fr_n}")
cli_li("French records IN SCOPE     : {fr_pos}")
cli_alert_danger(
  "ONE. To see {MIN_POSITIVES} French positives at this rate the audit must human-code \\
   ~{format(round(needed), big.mark=',')} French records. The whole audit is {format(AUDIT_N, big.mark=',')}. \\
   FRENCH SENSITIVITY CANNOT BE ESTIMATED IN AN OPENALEX-ONLY FRAME, and no amount of \\
   stratification conjures positives that are not there."
)
cli_alert_info(
  "This is not a reason to drop the French claim; it is the reason for the Erudit harvest. \\
   Erudit matches ZERO OpenAlex sources (finding 3), so francophone metaresearch is not \\
   thinly represented in this frame, it is largely ABSENT from it. 'One of 75 is French' \\
   measures the pipeline, not Canadian scholarship."
)
cli_alert_warning(
  "But the pilot did NOT harvest Erudit (it verified the endpoint: 379 live sets). So I \\
   cannot yet demonstrate the French stratum will be powered. The proposal now says that, \\
   states the condition, and keeps the contingency: if the harvest does not deliver enough \\
   French metaresearch to estimate a French sensitivity, the claim is WITHDRAWN, not fudged."
)

record_finding(
  "label_limits",
  list(
    # (A) the instrument is model-dependent
    route_recall_vs_screener_a_pct = round(ra$recall),
    route_recall_vs_screener_b_pct = round(rb$recall),
    route_recall_a_ci = c(round(ra$lo, 1), round(ra$hi, 1)),
    route_recall_b_ci = c(round(rb$lo, 1), round(rb$hi, 1)),
    positives_screener_a = ra$pos,
    positives_screener_b = rb$pos,
    instrument_ii_is_model_dependent = TRUE,
    instrument_ii_caveat = paste(
      "Finding 14's instrument (ii) scores a filter against the 5,737 MACHINE labels. That",
      "measures agreement with a machine, not accuracy. Swap the machine and the topic",
      "route's recall moves from 12% to 7%. The conclusion (the route finds a small",
      "fraction) survives and strengthens; the NUMBER is not a measurement against truth."
    ),
    # (B) the French stratum is not powered
    french_records_in_pilot   = fr_n,
    french_in_scope_in_pilot  = fr_pos,
    french_records_needed_for_20_positives = round(needed),
    audit_budget_records      = AUDIT_N,
    french_stratum_is_powered = needed <= AUDIT_N,
    french_power_depends_on   = "the Erudit harvest, which the pilot did NOT run (it verified the endpoint: 379 live sets)",
    caveat = paste(
      "(A) is a limit on every recall number this project quotes against machine labels,",
      "including its own headline. (B) is a limit on the inclusiveness promise: French",
      "sensitivity cannot be estimated in an OpenAlex-only frame, because Erudit matches",
      "zero OpenAlex sources and the francophone literature is therefore largely absent",
      "from the frame rather than merely sparse in it. Both are stated in the proposal",
      "rather than left for a reviewer."
    )
  ),
  headline = glue(
    "Two limits on the machine labels, found by attacking the fixes. (A) The topic route's recall is ",
    "{round(ra$recall)}% against screener A and {round(rb$recall)}% against screener B: finding 14's instrument (ii) scores filters ",
    "against MACHINE labels, so it measures agreement with a machine, not accuracy, and finding 10 already ",
    "showed that swings by a factor of two. The conclusion strengthens (the second screener thinks the route ",
    "is WORSE) but 12% is not truth. (B) The pilot holds exactly {fr_pos} French in-scope work, so seeing {MIN_POSITIVES} French ",
    "positives needs ~{format(round(needed), big.mark=',')} coded French records against an audit budget of {format(AUDIT_N, big.mark=',')}. FRENCH SENSITIVITY IS NOT ",
    "ESTIMABLE IN AN OPENALEX-ONLY FRAME. That is an argument for the Erudit harvest, not against the French ",
    "claim, but the pilot did not run that harvest, so the power is stated as a condition rather than a promise."
  )
)
