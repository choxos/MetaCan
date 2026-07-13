#!/usr/bin/env Rscript
# Finding 26: the design could not reach 12.9% of the frame, and no weight can fix that.
#
# ------------------------------------------------------------------------------
# THE ONE LINE OF ARITHMETIC NOBODY RAN
# ------------------------------------------------------------------------------
# A stratified probability design rests on one identity:
#
#     sum(N_h) == N
#
# Every stratum's works, added up, must be every work. If they are not, the
# missing works have an inclusion probability of ZERO, and a zero-probability work
# is not underweighted. It is UNREACHABLE. No reweighting recovers it. No
# design-based estimator is defined over it.
#
# This project leans on design weights harder than on anything else. Its answer to
# "the machine screen is noisy" is that a design-weighted estimate from KNOWN
# selection probabilities is unbiased however noisy the stratifier is. That
# guarantee is VOID over a region where the probability is zero.
#
# The identity was never checked. It was checked by an adversarial model I asked to
# attack the classifier design, which added up the five design weights I had handed
# it in a summary table and reported that they came to 3.7M against a 4.3M frame.
#
# ------------------------------------------------------------------------------
# TWO DEFECTS, STACKED, NEITHER OF WHICH THREW
# ------------------------------------------------------------------------------
# 1. THE STRATA DID NOT MEET IN THE MIDDLE.
#      aff_core   = route_ca_aff   AND lang='en' AND NOT route_about_ca
#      about_only = route_about_ca AND NOT route_ca_aff AND ...
#    aff_core discards everything ABOUT Canada. about_only discards everything
#    AFFILIATED with Canada. A work that is BOTH is claimed by NEITHER.
#
#    That is not a random slice. It is exactly where the SECONDARY ESTIMAND lives:
#    "metaresearch about the Canadian research system". The design had a zero
#    probability of ever drawing a Canadian-affiliated work about Canada, and would
#    have reported a number for that estimand anyway.
#
# 2. SQL THREE-VALUED LOGIC ATE THE REST, INVISIBLY.
#    NOT(NULL) is NULL, not TRUE. A row whose stratum predicate evaluates to NULL is
#    selected by `WHERE p` and by `WHERE NOT p` ALIKE: by neither. It is in no
#    stratum and is not even an orphan. It never appears in a count, so the strata
#    and their complement do not sum to the frame, and nothing says so.
#
# ------------------------------------------------------------------------------
# WHY NOTHING CAUGHT IT
# ------------------------------------------------------------------------------
# Every script ran green. EVERY STRATUM RETURNED EXACTLY THE n IT ASKED FOR, because
# a stratum cannot know about the works it was never asked about. The design drew a
# clean, textbook stratified probability sample OF 87% OF THE FRAME, and every number
# computed from it said "the frame".
#
# It also produced *better-looking* numbers than the truth: a tidier sample, smaller
# variance, no awkward residual class. There was no friction anywhere to warn me,
# because the output looked BETTER, not worse. That is the pattern this project keeps
# finding, and this is its sharpest instance: THE DEFECTS THAT SURVIVE ARE THE ONES
# THAT FLATTER YOU.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(dplyr); library(jsonlite); library(cli); library(glue)
})
source("R/findings.R")
source("R/strata.R")

FRAME <- "data/frame/canadian_works.parquet"
con <- dbConnect(duckdb())
on.exit(dbDisconnect(con, shutdown = TRUE), add = TRUE)
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}') WHERE {SAMPLING_FRAME_WHERE}"))
dbExecute(con, glue("CREATE VIEW raw AS SELECT * FROM read_parquet('{FRAME}')"))

N_FRAME <- dbGetQuery(con, "SELECT count(*) n FROM raw")$n
N_SAMP  <- dbGetQuery(con, "SELECT count(*) n FROM f")$n

# --- the design AS IT SHIPPED ----------------------------------------------------
v1 <- strata_v1_exclusive()
covered <- paste(sprintf("(%s)", unlist(v1)), collapse = " OR ")

in_stratum <- dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE {covered}"))$n
orphan     <- dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE NOT ({covered})"))$n
invisible_ <- dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE ({covered}) IS NULL"))$n
hole <- orphan + invisible_

cli_h1("The design as it shipped")
cli_li("sampling frame                      : {format(N_SAMP, big.mark=',')}")
cli_li("reachable (in some stratum)         : {format(in_stratum, big.mark=',')}")
cli_li("orphaned  (predicate FALSE)         : {format(orphan, big.mark=',')}")
cli_li("INVISIBLE (predicate NULL)          : {format(invisible_, big.mark=',')}")
cli_alert_danger(
  "ZERO-PROBABILITY REGION: {format(hole, big.mark=',')} works, {round(100*hole/N_SAMP, 1)}% of the sampling frame. \\
   Not underweighted. UNREACHABLE. Every design-weighted number this project has produced estimated a \\
   {format(in_stratum/1e6, digits=2)}M subpopulation while carrying the frame's name."
)

# --- what was in the hole --------------------------------------------------------
cli_h2("What was in it")
# `IS NOT TRUE`, not `NOT (...)`. The first version of this very line used
# `NOT (covered)` and therefore dropped 2,752 NULL-predicate works: it committed,
# inside the finding that documents the NULL bug, the NULL bug. Which is the most
# honest possible demonstration that a comment is not a control and a habit is not
# a guard. `IS NOT TRUE` catches FALSE and NULL alike; nothing else does.
aff_and_about <- dbGetQuery(con, glue(
  "SELECT count(*) n FROM f WHERE ({covered}) IS NOT TRUE
     AND COALESCE(route_ca_aff, FALSE) AND COALESCE(route_about_ca, FALSE)"))$n
cli_li("Canadian-affiliated AND about Canada: {format(aff_and_about, big.mark=',')} works")
cli_alert_danger(
  "That cell is where the SECONDARY ESTIMAND lives. The study's secondary estimand is 'metaresearch ABOUT the \\
   Canadian research system', and the design had a ZERO probability of drawing a Canadian-affiliated work about \\
   Canada, because aff_core excluded everything about Canada and about_only excluded everything affiliated with it."
)

# --- the repair ------------------------------------------------------------------
cli_h2("The repair")
S <- all_strata_sql()
counts <- vapply(S, \(p) dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE {p}"))$n, numeric(1))
for (s in names(S)) cli_li("{s}: {format(counts[[s]], big.mark=',')}")
cli_li("SUM: {format(sum(counts), big.mark=',')}   sampling frame: {format(N_SAMP, big.mark=',')}")
stopifnot("the repaired strata still do not partition" = sum(counts) == N_SAMP)
cli_alert_success(
  "The {length(S)} strata now PARTITION the sampling frame by CONSTRUCTION (the residual strata are the exact \\
   NULL-safe complement, `IS NOT TRUE`, which catches FALSE and NULL alike). Asserted on every build by \\
   pilot/check_strata_partition.R, which is verified BOTH ways: it passes here, and it FAILS on the design as it \\
   actually shipped."
)

record_finding(
  "zero_probability_region",
  list(
    full_frame                  = N_FRAME,
    unscreenable_excluded       = N_FRAME - N_SAMP,
    sampling_frame              = N_SAMP,
    reachable_under_shipped_design = in_stratum,
    orphaned_predicate_false    = orphan,
    invisible_predicate_null    = invisible_,
    zero_probability_works      = hole,
    pct_of_sampling_frame       = round(100 * hole / N_SAMP, 1),
    aff_and_about_cell          = aff_and_about,
    strata_after_repair         = length(S),
    strata_sum_after_repair     = sum(counts),
    partition_holds             = sum(counts) == N_SAMP,
    found_by = paste(
      "An adversarial model asked to attack the classifier design. Its first move was to add up the five design",
      "weights in a summary table I had handed it: 2000x1119 + 1000x664.2 + 750x536.8 + 750x310.9 + 500x335.8",
      "= 3,705,875, against a frame of 4,299,418. I had never added them up."
    ),
    caveat = paste(
      "The repair does not retro-fix numbers produced under the broken design; those estimated a 3.7M",
      "subpopulation and were reported under the frame's name, and saying so IS the finding. Every",
      "design-weighted figure is now re-derived against the seven-stratum design. The five original predicates",
      "are kept byte-for-byte because 5,000 works had already been drawn from them by hash order, and widening a",
      "stratum silently re-draws it."
    )
  ),
  headline = glue(
    "THE SAMPLING DESIGN COULD NOT REACH {round(100*hole/N_SAMP, 1)}% OF THE FRAME, AND NO WEIGHT CAN FIX THAT. A stratified design rests on one ",
    "identity, sum(N_h) = N. It was never checked. {format(hole, big.mark=',')} works ({round(100*hole/N_SAMP, 1)}% of the sampling frame) had an inclusion ",
    "probability of EXACTLY ZERO: {format(orphan, big.mark=',')} that no predicate claimed, because aff_core excluded everything ABOUT Canada ",
    "while about_only excluded everything AFFILIATED with Canada, so a work that was both fell between them; and ",
    "{format(invisible_, big.mark=',')} more whose predicate evaluated to SQL NULL, which `WHERE p` and `WHERE NOT p` BOTH decline to select, so ",
    "they were in no stratum and were not even orphans. Nothing threw. Every stratum returned exactly the n it ",
    "asked for, because a stratum cannot know about the works it was never asked about, and the design drew a ",
    "clean textbook probability sample OF 87% OF THE FRAME while every number computed from it said 'the frame'. ",
    "A zero-probability work is not underweighted, it is UNREACHABLE, and design weights are the guarantee this ",
    "project leans on hardest. THE CELL IT DELETED WAS THE SECONDARY ESTIMAND'S: {format(aff_and_about, big.mark=',')} Canadian-affiliated works ",
    "about Canada, in a study whose secondary estimand is 'metaresearch about the Canadian research system'. ",
    "Repaired by adding the exact NULL-safe complement as two strata; the {length(S)} strata now partition the frame by ",
    "construction ({format(sum(counts), big.mark=',')} = {format(N_SAMP, big.mark=',')}), asserted on every build. It was found by an adversarial model adding up five ",
    "numbers I handed it. The defect made the sample TIDIER and the variance SMALLER, which is why nothing about it ",
    "felt wrong: the errors that survive are the ones that flatter you."
  )
)
