#!/usr/bin/env Rscript
# Finding 8: the OpenAlex API is metered, so an API-based pipeline is neither
# free nor reproducible at this scale.
#
# We discovered this the way you always discover it: by hitting it. Building
# the pilot exhausted the free tier and OpenAlex returned 429 with a credit
# ledger in the headers:
#
#   retry-after: 40268                     (11.2 hours)
#   x-ratelimit-limit: 1000                (credits per window)
#   x-ratelimit-remaining: 0
#   x-ratelimit-limit-usd: 0.1             (the free tier is ten cents)
#   x-ratelimit-cost-required-usd: 0.0001  (per call)
#
# The consequence is arithmetic. The Canadian frame is ~3.5M works. Cursor
# paging at 200 records per call needs ~17,500 calls just to enumerate it once.
# At 1,000 calls per 11-hour window, that is over two weeks of wall-clock for a
# single pass, before any re-run, any correction, any reviewer wanting to
# check the work.
#
# This is the argument for the pinned snapshot, and it is now an empirical one
# rather than an aesthetic one. The snapshot is free, unmetered, and frozen: the
# same bytes produce the same corpus in 2026 and in 2036. The API is metered and
# mutable, and a study that depends on it cannot be re-run by a stranger.
#
# We record the ledger rather than paraphrase it.

suppressPackageStartupMessages({ library(cli); library(glue); library(httr2) })
source("R/findings.R")

# The frame is READ, not typed. `FRAME_SIZE <- 3507205L` was an EXTRAPOLATION from one
# OpenAlex partition, made before the frame existed; the built frame holds
# 4,299,418 works and the estimate was 18% low. See R/frame_size.R.
source("R/frame_size.R")
FRAME_SIZE <- frame_size()
PER_PAGE     <- 200L       # OpenAlex cursor-paging maximum
FREE_CREDITS <- 1000L      # per window, observed
WINDOW_HOURS <- 40268 / 3600

calls_needed <- ceiling(FRAME_SIZE / PER_PAGE)
windows      <- calls_needed / FREE_CREDITS
days_free    <- windows * WINDOW_HOURS / 24
cost_usd     <- calls_needed * 0.0001

cli_h1("Enumerating the Canadian frame through the OpenAlex API")
cli_li("frame size (works)              : {format(FRAME_SIZE, big.mark = ',')}")
cli_li("records per cursor page         : {PER_PAGE}")
cli_li("calls needed for ONE pass       : {format(calls_needed, big.mark = ',')}")
cli_li("free credits per window         : {format(FREE_CREDITS, big.mark = ',')} (~{round(WINDOW_HOURS, 1)} h)")
cli_li("=> wall-clock on the free tier  : {round(days_free, 1)} days per pass")
cli_li("=> or prepaid                   : ${format(round(cost_usd, 2), nsmall = 2)} per pass")

cli_h2("Why this settles the snapshot question")
cli_text(
  "A pipeline that must be re-runnable by a reviewer cannot sit behind a meter \\
   that resets every 11 hours. The pinned snapshot is free, unmetered, and \\
   frozen. We use it, and we say why."
)

record_finding(
  "openalex_is_metered",
  list(
    observed_retry_after_s          = 40268L,
    observed_ratelimit_limit        = FREE_CREDITS,
    observed_free_tier_usd          = 0.1,
    observed_cost_per_call_usd      = 1e-4,
    frame_size_works                = FRAME_SIZE,
    per_page_max                    = PER_PAGE,
    calls_for_one_pass              = calls_needed,
    days_on_free_tier_per_pass      = round(days_free, 1),
    prepaid_cost_per_pass_usd       = round(cost_usd, 2)
  ),
  headline = glue(
    "The OpenAlex API is metered (1,000 credits per ~11h; $0.10 free tier). Enumerating ",
    "the {format(FRAME_SIZE, big.mark = ',')}-work Canadian frame needs ",
    "{format(calls_needed, big.mark = ',')} cursor-paged calls: {round(days_free, 1)} days per ",
    "pass on the free tier. An API-based pipeline at this scale is neither free nor ",
    "reproducible; the pinned snapshot is both."
  )
)
