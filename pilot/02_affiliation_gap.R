#!/usr/bin/env Rscript
# Finding 2: affiliation-only "Canadian" linkage is structurally broken.
#
# Most bibliometric country assignment works by reading institutional
# affiliations off authorships. In the metaresearch search space, most records
# have no affiliation string to read. Whatever share of Canadian metaresearch
# lives in those records is invisible to an affiliation-only rule, and no amount
# of careful querying recovers it.
#
# This is why the primary estimand carries a funder clause, and why the
# validation audit samples the *non-retrieved* stratum.

suppressPackageStartupMessages({ library(cli); library(glue) })
source("R/openalex.R"); source("R/frame.R"); source("R/findings.R")

offline <- "--offline" %in% commandArgs(TRUE)

total       <- oa_count(TOPIC_FILTER, offline = offline)
with_aff    <- oa_count(glue("{TOPIC_FILTER},has_raw_affiliation_strings:true"),  offline = offline)
without_aff <- oa_count(glue("{TOPIC_FILTER},has_raw_affiliation_strings:false"), offline = offline)

stopifnot(with_aff + without_aff == total)  # the partition must close
pct <- 100 * without_aff / total

cli_h1("Affiliation coverage in the metaresearch topic space")
cli_li("works in topic space          : {format(total, big.mark = ',')}")
cli_li("... WITH raw affiliation      : {format(with_aff, big.mark = ',')}")
cli_li("... WITHOUT                   : {format(without_aff, big.mark = ',')} ({round(pct, 1)}%)")

record_finding(
  "affiliation_gap",
  list(
    topic_space_total       = total,
    with_raw_affiliation    = with_aff,
    without_raw_affiliation = without_aff,
    pct_without             = round(pct, 1)
  ),
  headline = glue(
    "{format(without_aff, big.mark = ',')} of {format(total, big.mark = ',')} works ",
    "({round(pct)}%) in the metaresearch topic space have no raw affiliation strings in OpenAlex."
  )
)
