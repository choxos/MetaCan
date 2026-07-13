#!/usr/bin/env Rscript
# Build guard: the strata must PARTITION the sampling frame.
#
# ------------------------------------------------------------------------------
# WHAT THIS EXISTS TO PREVENT, AND WHY A COMMENT WAS NEVER GOING TO BE ENOUGH
# ------------------------------------------------------------------------------
# The five original strata left 549,370 works (12.9% of the sampling frame) with an
# inclusion probability of exactly zero: 366,856 that no predicate claimed, and
# 182,514 whose predicate evaluated to NULL and which were therefore selected by
# neither `WHERE covered` nor `WHERE NOT covered`.
#
# Nothing failed. Every script ran. Every stratum returned exactly the n it asked
# for. The design produced a clean stratified sample of 87% of the frame while every
# number computed from it said "the frame".
#
# The check that would have caught it is one line of arithmetic:
#
#     sum(N_h) == N
#
# and nobody ran it, including me. It was caught by an adversarial model that added
# up five design weights in a summary table I had handed it. So the arithmetic is no
# longer optional, and it is no longer mine to remember.
#
# THE THREE THINGS ASSERTED HERE:
#   1. EXHAUSTIVE  every work in the sampling frame is in exactly one stratum
#   2. DISJOINT    no work is in two (double-counted works get double weight)
#   3. NONEMPTY    no stratum is empty (an empty stratum is a definition that
#                  silently does nothing, and its weight is Inf)
#
# See DEVIATIONS.md D22 and finding 26.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(cli); library(glue)
})
source("R/strata.R")

FRAME <- "data/frame/canadian_works.parquet"
if (!file.exists(FRAME)) {
  cli_alert_warning("no frame at {.path {FRAME}}; skipping the partition check (run R/harvest_frame.R first)")
  quit(status = 0)
}

con <- dbConnect(duckdb())
on.exit(dbDisconnect(con, shutdown = TRUE), add = TRUE)
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}') WHERE {SAMPLING_FRAME_WHERE}"))

N <- dbGetQuery(con, "SELECT count(*) n FROM f")$n
S <- all_strata_sql()

# 1. EXHAUSTIVE + counts.
counts <- vapply(S, \(p) dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE {p}"))$n, numeric(1))
total  <- sum(counts)

cli_h1("Strata")
for (s in names(S)) {
  cli_li("{.strong {s}}: {format(counts[[s]], big.mark=',')}  (weight at n={STRATA_ALL_N[[s]]}: {round(counts[[s]]/STRATA_ALL_N[[s]], 1)})")
}
cli_li("SUM: {format(total, big.mark=',')}")
cli_li("sampling frame: {format(N, big.mark=',')}")

problems <- character(0)

if (total != N) {
  gap <- N - total
  problems <- c(problems, glue(
    "THE STRATA DO NOT PARTITION THE SAMPLING FRAME. sum(N_h) = {format(total, big.mark=',')} but the frame is \\
     {format(N, big.mark=',')}: {format(abs(gap), big.mark=',')} works ({round(100*abs(gap)/N, 1)}%) are \\
     {ifelse(gap > 0, 'UNREACHABLE (inclusion probability zero)', 'DOUBLE COUNTED (inflated weight)')}."
  ))
}

# 2. DISJOINT, pairwise. Precedence is supposed to guarantee this; "supposed to" is
# what the last design also had.
nm <- names(S)
for (i in seq_along(nm)) for (j in seq_along(nm)) {
  if (i >= j) next
  ov <- dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE ({S[[i]]}) AND ({S[[j]]})"))$n
  if (ov > 0) problems <- c(problems, glue("strata {nm[i]} and {nm[j]} OVERLAP on {format(ov, big.mark=',')} works"))
}

# 3. NONEMPTY, and big enough to draw from.
for (s in nm) {
  if (counts[[s]] == 0) problems <- c(problems, glue("stratum {s} is EMPTY (its weight would be infinite)"))
  else if (counts[[s]] < STRATA_ALL_N[[s]])
    problems <- c(problems, glue("stratum {s} holds {counts[[s]]} works but the design asks for {STRATA_ALL_N[[s]]}"))
}

if (length(problems)) {
  cli_h1("THE DESIGN IS NOT A PARTITION")
  for (p in problems) cli_li(p)
  cli_abort(c(
    "{length(problems)} defect{?s} in the stratification.",
    "x" = "A work with inclusion probability zero is not underweighted, it is UNREACHABLE, and no design weight \\
           recovers it. An estimator built on this design does not estimate the frame; it estimates whatever \\
           subpopulation the strata happened to cover, while reporting the frame's name.",
    "i" = "This exact defect cost 12.9% of the frame, including the entire cell the secondary estimand lives in. \\
           See DEVIATIONS.md D22."
  ))
}

cli_alert_success(
  "the {length(S)} strata PARTITION the sampling frame: exhaustive ({format(total, big.mark=',')} = \\
   {format(N, big.mark=',')}), pairwise disjoint, none empty"
)
