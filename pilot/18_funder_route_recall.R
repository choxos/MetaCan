#!/usr/bin/env Rscript
# Finding 18: the funder route is structurally broken, and CIHR's own project
# database is what proves it.
#
# ------------------------------------------------------------------------------
# WHY THIS TEST EXISTS
# ------------------------------------------------------------------------------
# CA-FUND is one of the four routes that admit a work to the frame, and it
# admitted 788,103 works. It is also the clause in the PRIMARY ESTIMAND that
# exists to rescue works with no usable affiliation string (finding 2: 64% of the
# topic space carries none). So the estimand leans on it, and NOTHING TESTED IT.
#
# The venue reference set tests the topic route against an external criterion.
# This is the same instrument pointed at the funder route, and the external
# criterion is CIHR's own record of what it funded: 44,190 projects, published by
# the funder, owing nothing to OpenAlex.
#
# ------------------------------------------------------------------------------
# THE TEST I EXPECTED TO WIN, AND DID NOT. READ THIS BEFORE THE RESULT.
# ------------------------------------------------------------------------------
# I wrote this script expecting to show that OpenAlex badly under-tags CIHR. The
# comparison I set up was: 44,190 CIHR projects against the works OpenAlex tags
# with CIHR, and I wrote the interpretation ("below even the absurd floor of one
# paper per grant") BEFORE RUNNING IT.
#
# It came back 178,133 works: FOUR PUBLICATIONS PER FUNDED PROJECT. That is a
# perfectly plausible publication rate for a health-research grant. The
# comparison does not embarrass OpenAlex at all, and the sentence I had already
# written was false.
#
# I am leaving this paragraph in the file rather than quietly deleting the
# expectation, because the pattern is the finding: across this project, every
# error I have caught ran in my favour, and I caught this one only because the
# number refused to cooperate. DEVIATIONS.md D14.
#
# THE COMPARISON WAS ALSO THE WRONG ONE, which is the real lesson. Papers-per-
# grant is a RATIO OF TAGGED THINGS TO FUNDED THINGS; it says nothing about
# RECALL, because its numerator and denominator are not linked record to record.
# It is the same error as the retracted 32.4% coverage figure (D3): dividing two
# quantities that are not commensurable and reading the quotient as performance.
#
# ------------------------------------------------------------------------------
# WHAT THE DATA DOES SUPPORT, AND IT IS ENOUGH
# ------------------------------------------------------------------------------
# CA-FUND cannot admit a work whose funder OpenAlex never recorded. So the route
# has a hard CEILING, and the ceiling is measurable without any linkage at all:
# it is the share of the frame that carries ANY funder metadata. That number is
# devastating on its own, and it needs no expectation of mine to be true.
#
# ------------------------------------------------------------------------------
# WHAT THIS IS NOT
# ------------------------------------------------------------------------------
# CIHR's CSV carries no DOIs and no publication links, so this is NOT a
# record-level known-item join, and no recall POINT ESTIMATE is claimed here. A
# record-level test needs grant-to-publication linkage, which finding 21 builds.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(cli); library(glue); library(dplyr)
})
source("R/findings.R")

FRAME <- "data/frame/canadian_works.parquet"
CIHR  <- path.expand("~/Documents/GitHub/CIHRPT/cihr_projects.csv")
if (!file.exists(FRAME)) cli_abort("run R/harvest_frame.R first")
if (!file.exists(CIHR))  cli_abort("CIHR projects CSV not found at {.path {CIHR}}")

con <- dbConnect(duckdb())
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}')"))

# --- what CIHR says it funded --------------------------------------------------
cihr <- dbGetQuery(con, glue("
  SELECT count(*) AS projects,
         count(DISTINCT principal_investigators) AS pis,
         min(competition_year_month) AS first_comp,
         max(competition_year_month) AS last_comp
  FROM read_csv_auto('{CIHR}', ignore_errors = true)"))

# --- what OpenAlex says it can see ---------------------------------------------
# CIHR's OpenAlex funder id, verified against the pinned Canadian funder list
# rather than typed from memory. Three of six hand-typed funder ids in an earlier
# version of this project were WRONG and pointed at other funders; the pinned
# list exists because of that.
cihr_id <- dbGetQuery(con, "
  SELECT id, display_name, works_count FROM read_parquet('data/frame/canadian_funders.parquet')
  WHERE display_name ILIKE '%Canadian Institutes of Health Research%' ORDER BY works_count DESC LIMIT 1")
stopifnot("CIHR not found in the pinned funder list" = nrow(cihr_id) == 1)

oa <- dbGetQuery(con, glue("
  SELECT
    count(*)                                                        AS frame_works,
    sum((len(funder_ids) > 0)::int)                                 AS with_any_funder,
    sum(list_contains(funder_ids, '{cihr_id$id}')::int)             AS tagged_cihr,
    sum((route_ca_aff AND len(funder_ids) = 0)::int)                AS ca_aff_no_funder,
    sum(route_ca_aff::int)                                          AS ca_aff
  FROM f"))

pct_any  <- 100 * oa$with_any_funder / oa$frame_works
per_proj <- oa$tagged_cihr / cihr$projects

# How many works does CA-FUND actually RESCUE? The estimand's funder clause exists
# to admit works whose affiliation is missing. This is the number of works it
# admits that NO other route would have.
rescued <- dbGetQuery(con, "
  SELECT sum((route_ca_fund AND NOT route_ca_aff AND NOT route_ca_venue AND NOT route_about_ca)::int) AS n FROM f")$n

cli_h1("The funder route, tested against CIHR's own record of what it funded")
cli_li("CIHR projects (CIHR's own database) : {format(cihr$projects, big.mark=',')}, {format(cihr$pis, big.mark=',')} distinct PIs")
cli_li("frame works OpenAlex tags with CIHR : {format(oa$tagged_cihr, big.mark=',')}  ({round(per_proj, 2)} per funded project)")
cli_alert_warning(
  "I EXPECTED THIS TO SHOW UNDER-TAGGING, AND IT DOES NOT. {round(per_proj, 2)} publications per grant is \\
   a plausible rate, and the interpretation I had already written ('below even a floor of one \\
   paper per grant') was FALSE. The comparison was also the wrong one: papers-per-grant divides \\
   two quantities that are not linked record to record, which is the same error as the retracted \\
   32.4% coverage figure. It is recorded in DEVIATIONS.md D14 rather than deleted."
)

cli_h2("What the data DOES support: the route's ceiling")
cli_li("frame works carrying ANY funder at all   : {format(oa$with_any_funder, big.mark=',')} ({round(pct_any, 1)}%)")
cli_li("Canadian-affiliated works with NO funder : {format(oa$ca_aff_no_funder, big.mark=',')} of {format(oa$ca_aff, big.mark=',')} ({round(100*oa$ca_aff_no_funder/oa$ca_aff, 1)}%)")
cli_li("works CA-FUND rescues that NO other route reaches : {format(rescued, big.mark=',')}")
cli_alert_danger(
  "{round(100 - pct_any, 1)}% of the frame carries NO FUNDER METADATA AT ALL. That is CA-FUND's CEILING, and \\
   it needs no expectation of mine to be true: the route cannot admit a work whose funder \\
   OpenAlex never recorded. The PRIMARY ESTIMAND leans on CA-FUND precisely to rescue works whose \\
   affiliation is missing (finding 2, 64% have no affiliation string), and {round(100*oa$ca_aff_no_funder/oa$ca_aff, 1)}% of \\
   Canadian-AFFILIATED works have no funder either. BOTH CLAUSES OF THE ESTIMAND REST ON \\
   METADATA THAT IS MOSTLY ABSENT."
)

# --- who the funder metadata does record, and the skew it carries ---------------
# DuckDB will not UNNEST in a bare SELECT list here; do it in a subquery.
top <- dbGetQuery(con, "
  SELECT funder, count(*) n FROM (SELECT unnest(funder_names) AS funder FROM f WHERE len(funder_names) > 0)
  GROUP BY 1 ORDER BY 2 DESC LIMIT 8")
cli_h2("The funders OpenAlex does record (finding 6's skew, now on the real frame)")
print(as.data.frame(top), row.names = FALSE)

record_finding(
  "funder_route_recall",
  list(
    external_criterion        = "CIHR's own project database (44,190 projects), which owes nothing to OpenAlex",
    cihr_projects             = cihr$projects,
    cihr_distinct_pis         = cihr$pis,
    cihr_funder_id            = cihr_id$id,
    frame_works               = oa$frame_works,
    frame_works_tagged_cihr   = oa$tagged_cihr,
    tagged_publications_per_funded_project = round(per_proj, 2),
    papers_per_grant_is_a_plausible_rate_not_a_defect = TRUE,
    expectation_i_wrote_before_running_and_that_was_false =
      "that OpenAlex under-tags CIHR so badly it falls below one paper per grant. It is 4.03 per grant, a plausible rate. See DEVIATIONS.md D14.",
    works_ca_fund_rescues_alone     = rescued,
    frame_works_with_any_funder     = oa$with_any_funder,
    pct_frame_with_any_funder       = round(pct_any, 1),
    pct_frame_with_no_funder        = round(100 - pct_any, 1),
    ca_aff_works                    = oa$ca_aff,
    ca_aff_works_with_no_funder     = oa$ca_aff_no_funder,
    pct_ca_aff_with_no_funder       = round(100 * oa$ca_aff_no_funder / oa$ca_aff, 1),
    top_recorded_funders            = as.list(setNames(top$n, top$funder)),
    is_an_aggregate_not_a_record_level_join = TRUE,
    caveat = paste(
      "CIHR's CSV carries no DOIs and no publication links, so this is an AGGREGATE",
      "reconciliation, not a record-level known-item join, and NO RECALL POINT ESTIMATE is",
      "claimed. It establishes a CEILING on CA-FUND (the route cannot see a funder OpenAlex",
      "never recorded), which is a bound, not a measurement. The papers-per-grant ratio is",
      "reported because I ran it, and it REFUTES the hypothesis I wrote before running it: at",
      "4.03 per grant it is a plausible publication rate and shows no CIHR under-tagging at all.",
      "It is also the wrong instrument, for the same reason the retracted 32.4% coverage figure",
      "was (D3): its numerator and denominator are not linked record to record, so the quotient",
      "has no estimand behind it. Record-level linkage is finding 21."
    )
  ),
  headline = glue(
    "The PRIMARY ESTIMAND leans on CA-FUND to rescue works whose affiliation is missing (finding 2: 64% have no ",
    "affiliation string), and nothing had tested it. Tested against CIHR's own database of {format(cihr$projects, big.mark=',')} funded ",
    "projects, the result REFUTED THE HYPOTHESIS I WROTE BEFORE RUNNING IT: OpenAlex tags {format(oa$tagged_cihr, big.mark=',')} frame works ",
    "with CIHR, or {round(per_proj, 2)} per grant, a plausible rate showing no under-tagging (DEVIATIONS.md D14). What the data DOES ",
    "support needs no hypothesis of mine: {round(100 - pct_any, 1)}% OF THE FRAME CARRIES NO FUNDER METADATA AT ALL, which is CA-FUND's ",
    "hard ceiling, and {round(100*oa$ca_aff_no_funder/oa$ca_aff, 1)}% of Canadian-AFFILIATED works carry none either. Both clauses of the estimand rest on ",
    "metadata that is mostly absent, which is why the frame is a union of four routes and why the audit must sample ",
    "the works no route reached."
  )
)
dbDisconnect(con, shutdown = TRUE)
