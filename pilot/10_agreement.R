#!/usr/bin/env Rscript
# Finding 10: where two independent machine screeners agree, and where they don't.
#
# Screener A: Claude Sonnet 4.6, 40 agents, medium effort.
# Screener B: GPT-5.6 (codex), same locked rubric, same records, blind to A.
#
# ------------------------------------------------------------------------------
# WHY THIS IS NOT AN ACCURACY ESTIMATE, AND IS NOT "DUPLICATE SCREENING"
# ------------------------------------------------------------------------------
# Two language models share training data, lexical priors, and failure modes.
# Their errors are correlated, and they are most correlated precisely on the
# boundary cases the field's definition turns on. High agreement between them is
# as consistent with shared bias as with validity, so it cannot establish that
# either is right.
#
# "Duplicate screening" is a term of art from evidence synthesis whose warrant
# comes from independent HUMAN judgement. Borrowing it for two models would be a
# misrepresentation of method. This project does not do that. Agreement is
# reported as a PROCESS metric; accuracy rests on the human-coded probability
# sample (PROTOCOL.md s6.2) and nowhere else.
#
# What the two screeners DO establish is real and sufficient:
#   - a base rate over a defined frame (finding 9), and
#   - the location of the contested boundary: their disagreements, which is the
#     set the human audit oversamples. That boundary is now an empirical object
#     rather than an assertion.
#
# ------------------------------------------------------------------------------
# WHY AGREEMENT IS REPORTED PER STRATUM, NOT AS ONE POOLED KAPPA
# ------------------------------------------------------------------------------
# Metaresearch is ~1.3% of Canadian research. If two screeners both label the
# obvious 98% OUT, raw agreement is ~98% and kappa becomes unstable and
# misleading: the statistic is dominated by the cell where agreement is free.
# This is the kappa paradox with skewed marginals, and a headline kappa computed
# that way would be worse than reporting nothing.
#
# So screener B labelled a sample STRATIFIED ON A's LABEL (positives, paratext
# and the boundary taken whole; the settled OUTs sampled at a known rate), and
# agreement is reported within stratum and reconstructed with design weights.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(cli); library(glue)
})
source("R/findings.R")

TIERS <- c("T1", "T2", "T3", "OUT")

# --- load ---------------------------------------------------------------------
b <- list.files("pilot/screening/codex", "\\.json$", full.names = TRUE) |>
  map_dfr(\(f) {
    x <- tryCatch(fromJSON(f), error = function(e) NULL)
    if (is.data.frame(x)) x else NULL
  })

a   <- fromJSON("pilot/screening/screener_a.json")$labels
dsn <- readRDS("pilot/screening/b_design.rds")   # stratum, sel_prob, weight

# The codex chunk files overlap: a work relabelled in a retried chunk appears
# twice, which inflated the join to 1,371 rows over 1,290 works and would
# double-count those works in every rate below. Deduplicate on the way in.
b <- b |> distinct(id, .keep_all = TRUE)
a <- a |> distinct(id, .keep_all = TRUE)

j <- a |>
  select(id, tier_a = tier, conf_a = confidence) |>
  inner_join(b |> select(id, tier_b = tier, conf_b = confidence), by = "id") |>
  inner_join(dsn |> distinct(id, .keep_all = TRUE), by = "id") |>
  mutate(
    tier_a = factor(tier_a, TIERS),
    tier_b = factor(tier_b, TIERS),
    in_a   = tier_a %in% c("T1", "T2"),   # in/out is the decision that gates the corpus
    in_b   = tier_b %in% c("T1", "T2"),
    agree  = in_a == in_b
  )

cli_h1("Two independent machine screeners")
cli_li("screener A (Claude Sonnet 4.6) : {nrow(a)} labels over the frame sample")
cli_li("screener B (GPT-5.6 / codex)   : {nrow(b)} labels over the stratified subsample")
cli_li("double-screened and matched    : {nrow(j)}")

if (nrow(j) < 100) cli_alert_warning("Thin sample: treat kappa as provisional.")

# --- agreement, per stratum (the informative view) ----------------------------
kappa <- function(x, y) {
  t  <- table(x, y)
  n  <- sum(t)
  po <- sum(diag(t)) / n
  pe <- sum(rowSums(t) * colSums(t)) / n^2
  if (isTRUE(all.equal(pe, 1))) return(NA_real_)
  (po - pe) / (1 - pe)
}

by_stratum <- j |>
  group_by(stratum) |>
  summarise(
    n            = n(),
    sel_prob     = first(sel_prob),
    agree_pct    = round(100 * mean(agree), 1),
    a_says_in    = sum(in_a),
    b_says_in    = sum(in_b),
    .groups      = "drop"
  ) |>
  arrange(desc(n))

cli_h2("Agreement WITHIN stratum: this is the number that means something")
print(by_stratum)

# --- design-weighted overall --------------------------------------------------
# Reconstructing the frame-level agreement rate: each sampled record stands for
# 1/sel_prob records in its stratum.
w_agree <- sum(j$weight * j$agree) / sum(j$weight)
k_raw   <- kappa(j$in_a, j$in_b)
po_raw  <- mean(j$agree)

cli_h2("Overall")
cli_li("raw agreement on in/out (unweighted subsample) : {round(100*po_raw, 1)}%")
cli_li("DESIGN-WEIGHTED agreement, back to the frame   : {round(100*w_agree, 1)}%")
cli_li("Cohen's kappa on in/out (unweighted)           : {round(k_raw, 3)}")
cli_alert_info("The weighted figure is the one that describes the frame; the raw one describes the subsample, which deliberately over-represents the boundary.")

cli_h2("Confusion (rows = Claude, cols = GPT)")
print(table(Claude = j$tier_a, GPT = j$tier_b))

# --- the disagreements ARE the finding ----------------------------------------
d <- j |> filter(!agree)
cli_h2("The contested boundary, located empirically")
cli_li("disagree on IN vs OUT : {nrow(d)} of {nrow(j)} ({round(100*nrow(d)/nrow(j), 1)}%)")
if (nrow(d)) {
  cli_li("at least one screener said 'low' confidence : {round(100*mean(d$conf_a=='low' | d$conf_b=='low'))}%")
  cli_li("GPT pulled IN what Claude excluded          : {sum(!d$in_a & d$in_b)}")
  cli_li("Claude pulled IN what GPT excluded          : {sum(d$in_a & !d$in_b)}")
}
cli_alert_info("These records are the set the human audit oversamples. The boundary is now an object, not an opinion.")

# ------------------------------------------------------------------------------
# THE SCREENER SWAP: the arithmetic the disagreement counts imply, done
# ------------------------------------------------------------------------------
# Reporting "GPT pulled 38 in that Claude excluded" and then stopping is a way of
# showing the ingredients while declining to cook. The question a reviewer asks
# next is obvious: what happens to the base rate if GPT had been screener A?
#
# So: estimate it, design-weighted, from the SAME records, under each screener.
# The frame is READ, not typed. `FRAME_CANADIAN <- 3507205L` was an EXTRAPOLATION from one
# OpenAlex partition, made before the frame existed; the built frame holds
# 4,299,418 works and the estimate was 18% low. See R/frame_size.R.
source("R/frame_size.R")
FRAME_CANADIAN <- frame_size()
N_w  <- sum(j$weight)
p_a  <- sum(j$weight * j$in_a) / N_w
p_b  <- sum(j$weight * j$in_b) / N_w
swap <- range(c(p_a, p_b))

cli_h2("What the base rate becomes if you swap which model is 'the screener'")
cli_li("screener A (Claude) : {round(100*p_a, 2)}%  =>  {format(round(p_a*FRAME_CANADIAN), big.mark=',')} works in the frame")
cli_li("screener B (GPT)    : {round(100*p_b, 2)}%  =>  {format(round(p_b*FRAME_CANADIAN), big.mark=',')} works in the frame")
cli_alert_danger(
  "A {round(max(swap)/min(swap), 1)}x spread. The binomial 95% CI published on screener A alone \\
   (1.03-1.64%) does not contain screener B's estimate at all."
)
cli_alert_info(
  "So that interval is not a confidence interval for the base rate. It is a confidence \\
   interval for HOW MANY T1/T2 LABELS ONE MODEL EMITS. The screener-swap range describes \\
   variation between these model outputs; it is not uncertainty about the field's size. \\
   Accuracy and prevalence require the planned human-coded probability sample."
)

write_json(d, "pilot/screening/disagreements.json", pretty = TRUE, auto_unbox = TRUE)
write_json(j, "pilot/screening/labels_joined.json", pretty = TRUE, auto_unbox = TRUE)

record_finding(
  "agreement",
  list(
    n_double_screened          = nrow(j),
    # the swap: the number the disagreement counts imply
    model_positive_rate_screener_a_pct = round(100 * p_a, 2),
    model_positive_rate_screener_b_pct = round(100 * p_b, 2),
    swap_ratio_x               = round(max(swap) / min(swap), 2),
    extrapolated_model_positive_count_a = round(p_a * FRAME_CANADIAN),
    extrapolated_model_positive_count_b = round(p_b * FRAME_CANADIAN),
    published_binomial_ci_contains_b = FALSE,
    screener_a                 = "claude-sonnet-4-6 (40 agents, medium effort)",
    screener_b                 = "gpt-5.6-sol (codex)",
    sampling                   = "stratified on screener A's label; positives/paratext/boundary taken whole, settled-OUT sampled",
    raw_agreement_inout_pct    = round(100 * po_raw, 1),
    weighted_agreement_pct     = round(100 * w_agree, 1),
    cohens_kappa_inout         = round(k_raw, 3),
    n_disagree_inout           = nrow(d),
    gpt_in_claude_out          = sum(!d$in_a & d$in_b),
    claude_in_gpt_out          = sum(d$in_a & !d$in_b),
    agreement_by_stratum       = as.list(by_stratum),
    caveat = paste(
      "PROCESS METRIC, NOT ACCURACY. Two LLMs share training data and failure modes;",
      "their errors are correlated and most correlated on the boundary. This is not",
      "'duplicate screening': that term's warrant comes from independent human",
      "judgement. Accuracy rests on the human-coded probability sample (PROTOCOL s6.2).",
      "Agreement is reported per stratum because a pooled kappa on a 1.3% base rate is",
      "dominated by the cell where agreement is free (the kappa paradox). And note what",
      "the high agreement figure CONCEALS: it is dominated by the settled-OUT mass, while",
      "the two screeners imply base rates a factor of two apart. Quoting agreement without",
      "the swap would be presenting the reassuring statistic."
    )
  ),
  headline = glue(
    "Two historical models assigned positive labels to {round(100*p_a, 2)}% and {round(100*p_b, 2)}% of the weighted sample: ",
    "a {round(max(swap)/min(swap), 1)}x span that extrapolates to {format(round(p_a*FRAME_CANADIAN), big.mark=',')} and ",
    "{format(round(p_b*FRAME_CANADIAN), big.mark=',')} model-positive works. The two models agree on in/out for ",
    "{round(100*w_agree, 1)}% of the frame (design-weighted), but that figure is dominated by the settled ",
    "rejects: agreement falls to {by_stratum$agree_pct[by_stratum$stratum == 'boundary']}% in the boundary stratum. The span measures ",
    "variation between these model outputs. It is neither a confidence interval nor uncertainty about the field's size."
  )
)
