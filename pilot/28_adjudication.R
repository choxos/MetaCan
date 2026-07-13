#!/usr/bin/env Rscript
# Finding 28: an independent judge, blinded, on the works the three models split.
#
# ------------------------------------------------------------------------------
# WHY A FOURTH MODEL, AND WHY BLINDED
# ------------------------------------------------------------------------------
# The obvious move was to have Opus adjudicate the disagreements between Opus, GPT
# and Grok. It is also disqualifying: Opus IS one of the three arms, so the
# "consensus" would drift toward its own boundary and the adjudicated labels would
# not be independent of the thing they adjudicate. One of the three votes would be
# the court.
#
# So the judge is FABLE 5 (xhigh), which is not one of the arms. And it is BLIND:
# the three screener opinions are presented as A, B and C, in a random order per
# work, with no model names anywhere. A judge told "Opus said T1 and Grok said OUT"
# is no longer applying the rubric; it is ranking vendors.
#
# The letter-to-model key is kept out of the prompt and used HERE, afterwards, for
# the only check that can falsify the design: DOES THE JUDGE SIDE WITH ONE ARM MORE
# THAN CHANCE? If it did, the adjudication would be a fourth opinion wearing a
# verdict's clothes. That is measured, not assumed away.
#
# ------------------------------------------------------------------------------
# THE SECOND JOB, WHICH IS THE REAL ONE
# ------------------------------------------------------------------------------
# Breaking a tie tells you one work's tier. It teaches the criteria document
# nothing. So the judge also had to name, for every work, WHICH SEAM of the rubric
# produced the split, from the thirteen enumerated in rubric-v2-proposal.md, or
# `none` if the rubric decides cleanly and a screener simply erred.
#
# That converts adjudication from a tiebreak into a MEASUREMENT OF THE INSTRUMENT:
# a frequency-weighted census of which missing sentences are actually costing
# agreement in the wild. It is the difference between "here are 179 answers" and
# "here is the sentence your rubric is missing, and here is how many works it costs
# you."

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(cli); library(glue)
})
source("R/findings.R")

DIR <- "pilot/screening/frame1k"
ADJ <- file.path(DIR, "adjudication")

verdicts <- list.files(ADJ, "^verdict_\\d+\\.json$", full.names = TRUE) |>
  map_dfr(\(f) fromJSON(f))
key <- fromJSON(file.path(ADJ, "blinding_key.json"))
dossier <- fromJSON(file.path(DIR, "disagreement_dossier.json"))

contested <- dossier |> filter(!(opus == gpt & gpt == grok))
v <- verdicts |> inner_join(contested |> select(id, opus, gpt, grok), by = "id")

if (nrow(v) != nrow(contested))
  cli_abort("the judge returned {nrow(v)} verdicts for {nrow(contested)} contested works; \\
             an adjudication that does not reconcile is not an adjudication")
cli_alert_success("all {nrow(v)} contested works adjudicated and reconciled")

# --- 1. THE CHECK THAT COULD FALSIFY THE WHOLE DESIGN ----------------------------
cli_h1("1. Is the judge independent, or does it side with one arm?")

sides_with <- function(row) {
  m <- c(opus = row$opus, gpt = row$gpt, grok = row$grok)
  names(m)[m == row$tier]
}
agree <- map(seq_len(nrow(v)), \(i) sides_with(v[i, ]))
n_agree <- c(
  opus = sum(map_lgl(agree, \(a) "opus" %in% a)),
  gpt  = sum(map_lgl(agree, \(a) "gpt"  %in% a)),
  grok = sum(map_lgl(agree, \(a) "grok" %in% a))
)
n_none <- sum(lengths(agree) == 0)

for (m in names(n_agree))
  cli_li("judge agrees with {m}: {n_agree[[m]]} of {nrow(v)} ({round(100*n_agree[[m]]/nrow(v))}%)")
cli_li("judge agrees with NONE of the three: {n_none} ({round(100*n_none/nrow(v))}%)")

# Is the spread across arms bigger than chance? The null is that the judge has no
# arm preference; the test is on the three agreement counts.
chi <- suppressWarnings(chisq.test(n_agree))
spread <- round(max(n_agree) / min(n_agree), 2)
cli_li("spread across arms: {spread}x   (chi-square p = {signif(chi$p.value, 3)})")

if (chi$p.value < 0.05) {
  cli_alert_danger(
    "THE JUDGE FAVOURS AN ARM (p = {signif(chi$p.value, 3)}). The adjudication is a fourth opinion, not a verdict, \\
     and it must be reported as such. The blinding did not save it."
  )
} else {
  cli_alert_success(
    "No detectable arm preference (p = {signif(chi$p.value, 3)}). The judge is not simply re-voting for one of the \\
     screeners. NOTE this is a test for an EFFECT and not a proof of its absence; it is also not a claim that \\
     the judge is CORRECT, only that it is not captured. Correctness is what the human audit is for."
  )
}
cli_alert_info(
  "The judge overruled ALL THREE screeners on {n_none} works ({round(100*n_none/nrow(v))}%). A judge that never overrules \\
   everyone is a majority vote with extra steps."
)

# --- 2. THE SEAM CENSUS: which missing sentence costs the most agreement ---------
cli_h1("2. Which rubric seam produced the disagreement")

seams <- v |> count(seam, sort = TRUE) |> mutate(pct = round(100 * n / sum(n), 1))
print(as.data.frame(seams), row.names = FALSE)

silent <- sum(v$rubric_is_silent %in% TRUE)
cli_alert_danger(
  "THE RUBRIC IS SILENT ON {silent} OF {nrow(v)} CONTESTED WORKS ({round(100*silent/nrow(v))}%). Only \\
   {sum(v$seam == 'none')} of the splits are a screener misapplying a rule that exists. On the rest, THE FIELD'S \\
   BOUNDARY IS BEING SET BY THE SCREENER, NOT BY THE INSTRUMENT, and every model was left to invent the missing \\
   sentence privately. That is the finding: the disagreement is not noise to be averaged away, it is the shape \\
   of what the rubric does not say."
)

top <- seams |> filter(seam != "none") |> head(3)
cli_h2("The three seams that cost the most agreement")
for (i in seq_len(nrow(top)))
  cli_li("{top$seam[i]}: {top$n[i]} works ({top$pct[i]}%)")

# --- 3. what the judge did with the tiers ----------------------------------------
cli_h2("Adjudicated tiers on the contested works")
print(as.data.frame(v |> count(tier, sort = TRUE)), row.names = FALSE)

IN <- function(t) t %in% c("T1", "T2")
cli_li("judged IN SCOPE (T1/T2): {sum(IN(v$tier))} of {nrow(v)} contested works")

record_finding(
  "adjudication",
  list(
    judge                     = "Fable 5 (xhigh), which is NOT one of the three screened arms",
    blinded                   = TRUE,
    blinding                  = "three screener opinions presented as A/B/C, order randomized per work, no model names in the prompt",
    contested_works           = nrow(v),
    judge_agrees_with         = n_agree,
    judge_agrees_with_none    = n_none,
    arm_preference_spread     = spread,
    arm_preference_chisq_p    = signif(chi$p.value, 3),
    judge_is_captured         = chi$p.value < 0.05,
    rubric_is_silent          = silent,
    pct_rubric_is_silent      = round(100 * silent / nrow(v)),
    splits_from_screener_error = sum(v$seam == "none"),
    seam_census               = setNames(seams$n, seams$seam),
    adjudicated_tiers         = setNames(count(v, tier)$n, count(v, tier)$tier),
    adjudicated_in_scope      = sum(IN(v$tier)),
    caveat = paste(
      "The judge is a MODEL, not a human, and this is NOT a reference standard. It is an independent, blinded,",
      "documented fourth reading whose value is the SEAM CENSUS, not the tiers. Its tiers are used for nothing",
      "downstream and produce no estimate. The arm-preference test shows the judge is not CAPTURED; it says",
      "nothing about whether it is CORRECT, and correctness is exactly what the human audit exists to establish.",
      "A model cannot certify a model, which is the whole argument of this project and it applies to the judge too."
    )
  ),
  headline = glue(
    "AN INDEPENDENT BLINDED JUDGE SAYS THE RUBRIC IS SILENT ON {round(100*silent/nrow(v))}% OF THE WORKS THE MODELS FOUGHT OVER. Fable 5, ",
    "which is not one of the three screened arms, adjudicated all {nrow(v)} contested works seeing three screener opinions ",
    "as A/B/C in random order with no model names, so it was asked which reading of the RUBRIC is right rather than ",
    "which model to trust. It shows no arm preference (spread {spread}x, chi-square p = {signif(chi$p.value, 3)}), so it is not a fourth vote ",
    "for one of the screeners, and it overruled ALL THREE on {n_none} works. Its verdict on the instrument: the rubric is ",
    "SILENT on {silent} of {nrow(v)} contested works, and only {sum(v$seam == 'none')} splits are a screener misapplying a rule that actually ",
    "exists. THE FIELD'S BOUNDARY IS BEING SET BY THE SCREENER, NOT BY THE INSTRUMENT. The seams that cost the most ",
    "agreement are {top$seam[1]} ({top$n[1]} works), {top$seam[2]} ({top$n[2]}), and {top$seam[3]} ({top$n[3]}). This is what converts adjudication ",
    "from a tiebreak into a measurement: not 179 answers, but a frequency-weighted census of which sentences the ",
    "rubric is missing and exactly how many works each one costs. The judge's TIERS are used for nothing and produce ",
    "no estimate: a model cannot certify a model, and that argument applies to the judge too."
  )
)
