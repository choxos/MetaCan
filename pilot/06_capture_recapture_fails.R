#!/usr/bin/env Rscript
# Finding 6: capture-recapture cannot estimate coverage here. We ran it to find out.
#
# The tempting design is to treat each retrieval route as a "capture" of the same
# population and estimate, from their overlap, how many works both routes missed.
# It is a standard epidemiological move and it reads well in a proposal.
#
# It does not work here, and this script is why we know.
#
# Run naively on two routes, Lincoln-Petersen implies Canada produces the
# majority of the world's metaresearch. The reason is not a bug: the two routes
# are not sampling the same population. The lexical route is dominated by works
# that merely mention a term in passing, so the overlap between a high-precision
# route and a low-precision one measures the routes' disagreement about what
# counts, not the size of a hidden stratum.
#
# Screening first does not rescue it. The routes remain endogenous: citation
# snowballing depends on the seed set, and the author route depends on authors
# found by the other routes. Log-linear models cannot identify the all-zero cell
# without an untestable restriction on the highest-order interaction, and with
# endogenous lists that restriction is not credible. Nor is the estimate a safe
# "lower bound": depending on the dependence structure it can overstate the
# unseen population as easily as understate it.
#
# So we cut it, and replaced it with a two-phase stratified probability audit
# that samples the non-retrieved stratum directly. The only unconditional lower
# bound on the population is the number of eligible works actually observed.

suppressPackageStartupMessages({ library(cli); library(glue) })
source("R/openalex.R"); source("R/frame.R"); source("R/findings.R")

offline <- "--offline" %in% commandArgs(TRUE)

# A deliberately naive two-route setup: the topic route, and a broad lexical
# route including the promiscuous terms a first-pass design would reach for.
naive_lexicon <- lexicon(c(LEXICON_EN, POLYSEMOUS))

r1 <- oa_count(glue("{TOPIC_FILTER},{CANADA_AFFILIATION}"), offline = offline)
r2 <- oa_count(glue("title_and_abstract.search:{naive_lexicon},{CANADA_AFFILIATION}"), offline = offline)
both <- oa_count(
  glue("{TOPIC_FILTER},title_and_abstract.search:{naive_lexicon},{CANADA_AFFILIATION}"),
  offline = offline
)
topic_space <- oa_count(TOPIC_FILTER, offline = offline)

union_obs        <- r1 + r2 - both
lincoln_petersen <- r1 * r2 / both   # the estimator we are about to discredit

# The tell: what share of WORLD metaresearch would Canada have to produce for
# this estimate to be true? Canada is a mid-sized producer; by the topic route it
# accounts for under 2% of the topic space. An estimator implying it makes most
# of the world's metaresearch is not reporting a hidden stratum. It is reporting
# that its two lists disagree about what counts.
observed_share <- 100 * r1 / topic_space
implied_share  <- 100 * lincoln_petersen / topic_space

cli_h1("Naive two-route capture-recapture")
cli_li("R1  topic route             : {format(r1, big.mark = ',')}")
cli_li("R2  naive lexical route     : {format(r2, big.mark = ',')}")
cli_li("R1 n R2                     : {format(both, big.mark = ',')}")
cli_li("observed union              : {format(union_obs, big.mark = ',')}")
cli_h2("The estimate, and the tell")
cli_li("Lincoln-Petersen N-hat      : {format(round(lincoln_petersen), big.mark = ',')} Canadian works")
cli_li("entire topic space, world   : {format(topic_space, big.mark = ',')}")
cli_li("Canada's OBSERVED share     : {round(observed_share, 1)}%")
cli_li("Canada's share IMPLIED      : {round(implied_share, 1)}%")

void <- implied_share > 10   # no plausible world in which Canada exceeds this
if (void) {
  cli_alert_danger(
    "For the estimate to hold, Canada would produce most of the world's metaresearch. \\
     The two routes are not sampling the same population. The estimator is void here."
  )
}

record_finding(
  "capture_recapture_fails",
  list(
    route1_topic                     = r1,
    route2_naive_lexical             = r2,
    overlap                          = both,
    observed_union                   = union_obs,
    lincoln_petersen_estimate        = round(lincoln_petersen),
    entire_topic_space_all_countries = topic_space,
    canada_observed_share_pct        = round(observed_share, 1),
    canada_implied_share_pct         = round(implied_share, 1),
    estimator_void                   = void
  ),
  headline = glue(
    "Naive two-route capture-recapture estimates {format(round(lincoln_petersen), big.mark = ',')} ",
    "Canadian metaresearch works, implying Canada produces {round(implied_share)}% of the world's ",
    "metaresearch against an observed {round(observed_share, 1)}%. The estimator is void here; ",
    "we cut it rather than dress it up as a lower bound."
  )
)
