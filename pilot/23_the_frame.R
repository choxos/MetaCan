#!/usr/bin/env Rscript
# Finding 23: the frame, built rather than estimated.
#
# ------------------------------------------------------------------------------
# WHAT CHANGED, AND WHY IT IS THE MOST IMPORTANT THING IN THE PROJECT
# ------------------------------------------------------------------------------
# For most of this project's life, "the frame" was a number: 3,507,205 Canadian
# works. That number was an EXTRAPOLATION from a single OpenAlex partition, and it
# sat hardcoded in six scripts. Every cost, every audit-power calculation, and
# every implied field size was computed against it.
#
# The frame now EXISTS. All 482 partitions of the pinned snapshot were streamed
# and filtered; each work appears exactly once; the count is a COUNT.
#
#     estimated : 3,507,205
#     actual    : 4,299,418        the estimate was 18% low
#
# Nothing about this project's method changes. Every NUMBER does. That is what it
# means for a frame to be enumerable rather than hypothesised, and it is why the
# proposal can now say "the frame is 4,299,418 works" instead of "about 3.5M".
#
# ------------------------------------------------------------------------------
# THE ROUTE THAT MATTERS
# ------------------------------------------------------------------------------
# A frame built on Canadian AFFILIATION alone would hold 2,734,192 works. The
# union of four routes holds 4,299,418. The difference, 1,565,226 works, is not a
# rounding error and it is not noise: it is 36% of the frame, and an
# affiliation-only design NEVER SEES IT.
#
# That is finding 2 (64% of the topic space carries no raw affiliation string)
# made concrete at frame scale, and it is the empirical justification for the
# whole union-of-routes design. It is also why every record carries PROVENANCE:
# a frame that cannot say why it admitted a work cannot be audited.

suppressPackageStartupMessages({
  library(jsonlite); library(cli); library(glue)
})
source("R/findings.R")
source("R/frame_size.R")

SUMMARY <- "data/frame/frame_summary.json"
if (!file.exists(SUMMARY)) cli_abort("run R/harvest_frame.R first: {.path {SUMMARY}} is missing")
f <- fromJSON(SUMMARY)

ESTIMATE <- 3507205L   # the number this project used before the frame existed

pct <- function(x) round(100 * x / f$works, 1)
no_aff <- f$invisible_to_affiliation

cli_h1("The frame, enumerated")
cli_li("works            : {format(f$works, big.mark=',')}  (from all {f$partitions} partitions, each work exactly once)")
cli_li("prior ESTIMATE   : {format(ESTIMATE, big.mark=',')}  -> the estimate was {abs(round(100*(ESTIMATE/f$works - 1)))}% LOW")

cli_h2("Routes (a work may enter by several)")
cli_li("CA-AFF   Canadian affiliation : {format(f$route_ca_aff, big.mark=',')} ({pct(f$route_ca_aff)}%)")
cli_li("ABOUT-CA Canada in the text   : {format(f$route_about_ca, big.mark=',')} ({pct(f$route_about_ca)}%)")
cli_li("CA-FUND  Canadian funder      : {format(f$route_ca_fund, big.mark=',')} ({pct(f$route_ca_fund)}%)")
cli_li("CA-VENUE Canadian venue       : {format(f$route_ca_venue, big.mark=',')} ({pct(f$route_ca_venue)}%)")

cli_alert_danger(
  "INVISIBLE TO AFFILIATION ALONE: {format(no_aff, big.mark=',')} works ({pct(no_aff)}% of the frame). \\
   A frame built on Canadian affiliation alone would hold {format(f$route_ca_aff, big.mark=',')} works and would NEVER SEE \\
   these. That is finding 2 made concrete at frame scale, and it is the empirical justification \\
   for the union-of-routes design and for recording provenance on every record."
)

cli_h2("What the screen will actually be reading")
cli_li("carry a venue    : {format(f$with_venue, big.mark=',')} ({pct(f$with_venue)}%)   <- the field the pilot harness withheld (D1)")
cli_li("carry an abstract: {format(f$with_abstract, big.mark=',')} ({pct(f$with_abstract)}%)")
cli_li("French           : {format(f$french, big.mark=',')} ({pct(f$french)}%)")
cli_alert_warning(
  "{round(100 - pct(f$with_abstract), 1)}% of the frame has NO ABSTRACT. In finding 11, one historical model assigned \\
   positive labels at roughly half the rate observed among works with abstracts. Finding 19 shows that abstract recovery \\
   varies substantially by work type and language. The effect on human-validated outcomes remains unknown."
)

record_finding(
  "the_frame",
  list(
    built_from            = "all 482 partitions of a pinned OpenAlex snapshot, streamed and filtered; each work appears exactly once",
    partitions            = f$partitions,
    works                 = f$works,
    prior_estimate        = ESTIMATE,
    estimate_was_low_by_pct = abs(round(100 * (ESTIMATE / f$works - 1))),
    estimate_was_an_extrapolation_from_one_partition = TRUE,
    route_ca_aff          = f$route_ca_aff,
    route_about_ca        = f$route_about_ca,
    route_ca_fund         = f$route_ca_fund,
    route_ca_venue        = f$route_ca_venue,
    invisible_to_affiliation = no_aff,
    pct_invisible_to_affiliation = pct(no_aff),
    with_venue            = f$with_venue,
    pct_with_venue        = pct(f$with_venue),
    with_abstract         = f$with_abstract,
    pct_with_abstract     = pct(f$with_abstract),
    pct_no_abstract       = round(100 - pct(f$with_abstract), 1),
    french                = f$french,
    pct_french            = pct(f$french),
    built_utc             = f$built_utc,
    caveat = paste(
      "The frame is bounded by OpenAlex. A work whose Canadian link is invisible to the metadata",
      "(no affiliation, no funder, no textual mention, no Canadian venue) cannot enter ANY frame by",
      "any method, and scholarship indexed by neither OpenAlex nor Erudit is not estimated here.",
      "That is a hard boundary of the data, not of this design, and it is stated rather than",
      "hidden. Erudit matches ZERO OpenAlex sources (finding 3), so the francophone share reported",
      "here (5.5%) measures the pipeline, NOT Canadian scholarship."
    )
  ),
  headline = glue(
    "The frame is BUILT, not estimated. All {f$partitions} partitions of a pinned OpenAlex snapshot were streamed and filtered, ",
    "and the Canadian frame holds {format(f$works, big.mark=',')} works, each exactly once. For most of this project's life 'the frame' was ",
    "{format(ESTIMATE, big.mark=',')}, an EXTRAPOLATION from a single partition, hardcoded in six scripts; the estimate was {abs(round(100*(ESTIMATE/f$works - 1)))}% LOW, and every cost, ",
    "audit-power and field-size figure computed against it has moved. The route that matters: {format(no_aff, big.mark=',')} works ",
    "({pct(no_aff)}% of the frame) are INVISIBLE TO AFFILIATION ALONE. A frame built on Canadian affiliation would hold ",
    "{format(f$route_ca_aff, big.mark=',')} works and would never see them. That is finding 2 at frame scale, and it is why the frame is a union of ",
    "four routes and why every record carries the provenance of the route that admitted it."
  )
)
