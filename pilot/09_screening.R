#!/usr/bin/env Rscript
# Finding 9: what two independent machine screeners agree on, and what they don't.
#
# 6,202 Canadian works from the pinned snapshot, classified twice and blind:
#   screener A: Claude Sonnet 4.6, 41 agents, medium effort
#   screener B: GPT-5.6 (codex), same rubric, same records, no sight of A
#
# What this establishes, and what it does not:
#
#   IT ESTABLISHES the base rate. Metaresearch is rare inside Canadian research,
#   and knowing how rare tells you what precision a retrieval strategy must reach
#   before it is worth anything. A route that returns 10,000 candidates to find
#   200 real ones is not a route; it is a haystack.
#
#   IT ESTABLISHES where the boundary actually is. The records the two screeners
#   disagree on are not noise; they are the field's contested edge, located
#   empirically instead of by assertion. That is the set worth arguing about, and
#   it is the set the human audit should oversample.
#
#   IT DOES NOT ESTABLISH ACCURACY. Two language models share training data,
#   lexical priors, and failure modes; their errors are correlated, and they are
#   most correlated exactly on the boundary cases that matter. High agreement here
#   is evidence of shared bias as much as of validity. Kappa between two models is
#   a property of the models, not of the world.
#
# So this is reported as a PROCESS metric. The accuracy claim rests on the
# human-coded probability sample (PROTOCOL.md s6), and nowhere else. Calling this
# "duplicate screening" would borrow a term whose warrant comes from human
# judgement, and this project does not do that.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(tidyr)
  library(glue); library(cli)
})
source("R/findings.R")

TIERS <- c("T1", "T2", "T3", "OUT")

# --- load both screeners ------------------------------------------------------
load_codex <- function() {
  files <- list.files("pilot/screening/codex", "\\.json$", full.names = TRUE)
  if (!length(files)) return(NULL)
  map_dfr(files, \(f) {
    x <- tryCatch(fromJSON(f), error = function(e) NULL)
    if (is.null(x) || !is.data.frame(x)) return(NULL)
    x
  })
}

load_claude <- function() {
  f <- "pilot/screening/screener_a.json"
  if (!file.exists(f)) return(NULL)
  fromJSON(f)$labels
}

a <- load_claude()
b <- load_codex()

if (is.null(a) || is.null(b)) {
  cli_abort("Need both screeners. A: {!is.null(a)}  B: {!is.null(b)}")
}

cli_h1("Two independent machine screeners, 6,202 Canadian works")
cli_li("screener A (Claude Sonnet 4.6) : {nrow(a)} labels")
cli_li("screener B (GPT-5.6 / codex)   : {nrow(b)} labels")

# --- join ---------------------------------------------------------------------
j <- inner_join(
  a |> select(id, tier_a = tier, conf_a = confidence, genre_a = genre),
  b |> select(id, tier_b = tier, conf_b = confidence, genre_b = genre),
  by = "id"
) |>
  mutate(
    tier_a = factor(tier_a, TIERS),
    tier_b = factor(tier_b, TIERS),
    agree  = tier_a == tier_b,
    # In/out is the decision that actually gates the corpus; tier is a refinement.
    in_a   = tier_a %in% c("T1", "T2"),
    in_b   = tier_b %in% c("T1", "T2"),
    agree_inout = in_a == in_b
  )

cli_alert_info("matched on id: {nrow(j)} works")

# --- prevalence ---------------------------------------------------------------
prev_a <- mean(j$in_a); prev_b <- mean(j$in_b)
both_in <- sum(j$in_a & j$in_b)

cli_h2("Base rate: how rare is metaresearch inside Canadian research?")
cli_li("screener A says in-scope (T1/T2) : {sum(j$in_a)} ({round(100*prev_a, 2)}%)")
cli_li("screener B says in-scope (T1/T2) : {sum(j$in_b)} ({round(100*prev_b, 2)}%)")
cli_li("BOTH say in-scope                : {both_in} ({round(100*both_in/nrow(j), 2)}%)")

# --- agreement (a process metric, not a validity claim) -----------------------
cohen_kappa <- function(x, y) {
  tab <- table(x, y)
  n   <- sum(tab)
  po  <- sum(diag(tab)) / n
  pe  <- sum(rowSums(tab) * colSums(tab)) / n^2
  (po - pe) / (1 - pe)
}

k_tier  <- cohen_kappa(j$tier_a, j$tier_b)
k_inout <- cohen_kappa(j$in_a, j$in_b)
po_tier <- mean(j$agree)

cli_h2("Inter-screener agreement (PROCESS metric, not accuracy)")
cli_li("raw agreement, 4-tier   : {round(100*po_tier, 1)}%")
cli_li("Cohen's kappa, 4-tier   : {round(k_tier, 3)}")
cli_li("Cohen's kappa, in/out   : {round(k_inout, 3)}")

cli_h2("Confusion (rows = A, cols = B)")
print(table(A = j$tier_a, B = j$tier_b))

# --- the disagreement set is the finding --------------------------------------
disagree <- j |> filter(!agree_inout)
cli_h2("The contested boundary")
cli_li("works where the screeners disagree on IN vs OUT: {nrow(disagree)} ({round(100*nrow(disagree)/nrow(j), 2)}%)")
cli_li("...that is the set the human audit oversamples, and the set worth arguing about")

# Disagreement concentrates where confidence is low. Check, don't assume.
lowconf <- j |> mutate(any_low = conf_a == "low" | conf_b == "low")
cli_li("disagreements where at least one screener said 'low': \\
        {round(100 * mean(lowconf$any_low[!j$agree_inout]), 1)}%")

write_json(disagree, "pilot/screening/disagreements.json", pretty = TRUE)
write_json(j,        "pilot/screening/labels_joined.json", pretty = TRUE)

record_finding(
  "screening",
  list(
    n_screened               = nrow(j),
    screener_a               = "claude-sonnet-4-6 (41 agents, medium effort)",
    screener_b               = "gpt-5.6-sol (codex)",
    n_in_scope_a             = sum(j$in_a),
    n_in_scope_b             = sum(j$in_b),
    n_in_scope_both          = both_in,
    prevalence_a_pct         = round(100 * prev_a, 2),
    prevalence_b_pct         = round(100 * prev_b, 2),
    prevalence_both_pct      = round(100 * both_in / nrow(j), 2),
    raw_agreement_4tier_pct  = round(100 * po_tier, 1),
    cohens_kappa_4tier       = round(k_tier, 3),
    cohens_kappa_inout       = round(k_inout, 3),
    n_disagreements_inout    = nrow(disagree),
    pct_disagreements_inout  = round(100 * nrow(disagree) / nrow(j), 2),
    caveat                   = paste(
      "Inter-model agreement is a process metric. Two LLMs share training data and",
      "failure modes, so their errors are correlated and most correlated on the",
      "boundary. This is NOT an accuracy estimate and is NOT duplicate screening.",
      "Accuracy rests on the human-coded probability sample (PROTOCOL.md s6)."
    )
  ),
  headline = glue(
    "Two independent machine screeners over {format(nrow(j), big.mark=',')} Canadian works agree that ",
    "metaresearch is rare ({round(100*both_in/nrow(j), 1)}% in scope to both) and disagree on ",
    "{nrow(disagree)} works ({round(100*nrow(disagree)/nrow(j), 1)}%): kappa {round(k_inout, 2)} on in/out. ",
    "The disagreements locate the field's contested boundary empirically. Agreement between models is ",
    "a process metric, not accuracy."
  )
)
