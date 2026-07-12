#!/usr/bin/env Rscript
# Finding 9: metaresearch is ~1% of Canadian research, and that number does the
# work that capture-recapture could not.
#
# We took 6,202 Canadian works from the pinned snapshot (an unfiltered slice of
# Canadian research, NOT a metaresearch search) and screened every one against
# the locked rubric. This is the frame flip: instead of retrieving what looks like
# metaresearch and then asking whether it is Canadian, we take Canadian research
# as given (an external, checkable criterion) and ask of each work whether its
# object of study is research itself.
#
# The base rate is what makes the rest of the design tractable:
#
#   1. IT SIZES THE FIELD without a search strategy. If ~1.3% of Canadian works
#      are metaresearch, then across the 3.5M-work Canadian frame there are on the
#      order of 46,000 of them. That estimate depends on a screening rubric, not on
#      a keyword list, so it does not inherit the keyword list's blind spots.
#
#   2. IT GIVES A COVERAGE ESTIMATE the honest way. Capture-recapture tried to
#      produce this number and failed (finding 7); a base rate produces it without
#      pretending the retrieval routes are independent captures of a closed
#      population. NB: coverage is the route's RECALL against the rubric, measured
#      directly in finding 12 (12%, 95% CI 5.6-21.6%). It is NOT the retrieved set
#      divided by the estimated field size; see the note at record_finding() below.
#
#   3. IT SETS THE PRECISION BAR. At a 1.3% base rate, a route that returns
#      100,000 candidates to find 1,300 real ones is not a route, it is a haystack.
#      This is why screening must be semantic and why the lexicon excludes the
#      promiscuous terms (finding 5).
#
# What this is NOT: an accuracy estimate. These are machine labels. The number is
# a hypothesis with a denominator, and the human-coded probability sample
# (PROTOCOL.md s6) is what will confirm or refute it.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(cli); library(glue)
})
source("R/findings.R")

# The frame is READ, not typed. `FRAME_CANADIAN <- 3507205L` was an EXTRAPOLATION from one
# OpenAlex partition, made before the frame existed; the built frame holds
# 4,299,418 works and the estimate was 18% low. See R/frame_size.R.
source("R/frame_size.R")
FRAME_CANADIAN <- frame_size()
TOPIC_ROUTE    <-   14873L   # what the topic route retrieved  (finding 6)

a <- fromJSON("pilot/screening/screener_a.json")$labels
recs <- readRDS("pilot/screening/canadian_sample.rds") |>
  mutate(id = sub(".*/", "", id))

d <- a |> left_join(recs |> select(id, language, field), by = "id")

n        <- nrow(d)
in_scope <- sum(d$tier %in% c("T1", "T2"))
rate     <- in_scope / n
ci       <- binom.test(in_scope, n)$conf.int

cli_h1("Screening an unfiltered slice of Canadian research")
cli_li("works screened            : {format(n, big.mark = ',')}")
print(d |> count(tier, sort = TRUE))

cli_h2("Base rate of metaresearch (T1 + T2)")
cli_li("in scope                  : {in_scope} / {format(n, big.mark=',')}")
cli_li("base rate                 : {round(100*rate, 2)}% (95% CI {round(100*ci[1], 2)}-{round(100*ci[2], 2)}%)")

est    <- rate * FRAME_CANADIAN
est_lo <- ci[1] * FRAME_CANADIAN
est_hi <- ci[2] * FRAME_CANADIAN

cli_h2("What that implies for the 3.5M-work Canadian frame")
cli_li("estimated metaresearch works : {format(round(est), big.mark=',')} \\
        ({format(round(est_lo), big.mark=',')}-{format(round(est_hi), big.mark=',')})")
cli_li("the topic route retrieved    : {format(TOPIC_ROUTE, big.mark=',')}")
# The next line used to be:
#   cli_li("=> topic-route coverage : {round(100*TOPIC_ROUTE/est, 1)}% of the estimated field")
# It printed 32.4% on every run: the retracted ratio, computed live, thirty lines
# above a comment insisting the ratio is not computed. A number a script still
# prints is a number the script still claims, whatever the comments say. The
# route's coverage is its RECALL, measured in finding 12 (12%, 95% CI 5.6-21.6%).
cli_alert_info("Coverage of the route is NOT {format(TOPIC_ROUTE, big.mark=',')}/{format(round(est), big.mark=',')}. \\
                That divides a retrieved set by a true field size. See finding 12: recall is 12%.")

cli_h2("Where the in-scope works are")
cat("\nby language:\n"); print(d |> filter(tier %in% c("T1","T2")) |> count(language, sort = TRUE))
cat("\nby OpenAlex field (top 6):\n")
print(d |> filter(tier %in% c("T1","T2")) |> count(field, sort = TRUE) |> head(6))

cli_h2("Confidence")
print(d |> count(confidence, sort = TRUE))

record_finding(
  "base_rate",
  list(
    n_screened                = n,
    screener                  = "claude-sonnet-4-6, 40 agents, medium effort, locked rubric",
    sampling_frame            = "unfiltered Canadian works from the pinned 2026-06-24 snapshot partition",
    tier_counts               = as.list(table(d$tier)),
    n_in_scope_t1_t2          = in_scope,
    base_rate_pct             = round(100 * rate, 2),
    base_rate_ci_lo_pct       = round(100 * ci[1], 2),
    base_rate_ci_hi_pct       = round(100 * ci[2], 2),
    canadian_frame_size       = FRAME_CANADIAN,
    estimated_field_size      = round(est),
    estimated_field_lo        = round(est_lo),
    estimated_field_hi        = round(est_hi),
    topic_route_retrieved     = TOPIC_ROUTE,
    # NB: an earlier version of this script also recorded
    #   topic_route_coverage_pct = 100 * TOPIC_ROUTE / est   (= 32.4%)
    # and called it coverage. It is not. That divides a RETRIEVED SET by a TRUE
    # FIELD SIZE (incommensurable quantities), and it flattered the design.
    # The route's coverage is its RECALL against the rubric, measured directly in
    # pilot/12_topic_route_recall.R: 12% (95% CI 5.6-21.6%). The field is left
    # here so the two numbers can be compared, but the ratio is not computed.
    # The binomial CI is reported because it is the sampling error on THIS
    # screener's labels. It is NOT the uncertainty on the base rate, and it must
    # never be quoted as such: swap the screener and the estimate lands outside
    # it (finding 10: Claude 1.06%, GPT 2.37%, a 2.2x spread). The interval
    # below describes how many T1/T2 labels one model emits. Classifier error
    # dwarfs it, and only the human audit can measure classifier error.
    binomial_ci_is_not_the_uncertainty = TRUE,
    caveat = paste(
      "Machine labels, not a human gold standard, and the binomial CI above is",
      "sampling error on ONE screener; the honest uncertainty is the screener-swap",
      "range in finding 10 (1.06% to 2.37%). The partition is also not a uniform draw:",
      "it under-represents works with abstracts, where the screen finds 2x more",
      "metaresearch (finding 11). This is a hypothesis with a denominator; the",
      "human-coded probability sample tests it. Do NOT divide topic_route_retrieved",
      "by estimated_field_size; see finding 12."
    )
  ),
  headline = glue(
    "Screening {format(n, big.mark=',')} unfiltered Canadian works against the rubric puts metaresearch at ",
    "{round(100*rate, 2)}% of Canadian research, implying ~{format(round(est), big.mark=',')} works in the 3.5M-work ",
    "frame, sizing the field without a search strategy at all. The 95% CI on this screener's labels is ",
    "{round(100*ci[1],2)}-{round(100*ci[2],2)}%, but that is sampling error, NOT the uncertainty: swap the screener and ",
    "the estimate lands outside it (finding 10). The field is somewhere between 37,000 and 83,000 works, and ",
    "only the human audit can narrow that."
  )
)
