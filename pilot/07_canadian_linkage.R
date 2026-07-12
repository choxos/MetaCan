#!/usr/bin/env Rscript
# Finding 7: "Canadian" is several different questions wearing one word.
#
# A work can be Canadian because Canadians wrote it, because a Canadian agency
# paid for it, or because it is *about* the Canadian research system. These pick
# out overlapping but distinct sets, and a design that silently picks one is
# answering a question it never asked out loud.
#
# We size each of them, and show two ways the metadata misleads:
#
#   - Funder coverage is lopsided. SSHRC funds the social sciences and
#     humanities, where STS and much scholarly-communication research lives. It
#     has a fraction of NSERC's linked works, so any funder rule inherits that skew.
#
#   - Affiliation strings are noisy. Institutions that are not in Canada surface
#     inside a Canada-filtered query.
#
# Hence: the primary estimand is stated in advance, its two components are
# reported separately, and the alternatives are prespecified rather than chosen
# after seeing which flatters the map.

suppressPackageStartupMessages({
  library(cli); library(glue); library(purrr); library(dplyr)
})
source("R/openalex.R"); source("R/frame.R"); source("R/findings.R")

offline <- "--offline" %in% commandArgs(TRUE)

# Institutions spotted inside a Canada-filtered query that are not in Canada.
NOT_CANADIAN <- c("University of London", "Impact")

by_affiliation <- oa_count(glue("{TOPIC_FILTER},{CANADA_AFFILIATION}"), offline = offline)
by_funder      <- oa_count(glue("{TOPIC_FILTER},{FUNDER_FILTER}"), offline = offline)
about          <- oa_count(glue("{TOPIC_FILTER},title_and_abstract.search:{ABOUT_CANADA}"), offline = offline)
about_and_aff  <- oa_count(
  glue("{TOPIC_FILTER},title_and_abstract.search:{ABOUT_CANADA},{CANADA_AFFILIATION}"),
  offline = offline
)
about_not_aff <- about - about_and_aff

cli_h1("Three senses of 'Canadian', in the metaresearch topic space")
cli_li("Canadian AFFILIATION            : {format(by_affiliation, big.mark = ',')}")
cli_li("Canadian FUNDER (tri-agency+CFI): {format(by_funder, big.mark = ',')}")
cli_li("ABOUT Canada (title/abstract)   : {format(about, big.mark = ',')}")
cli_li("   ...of which NO Canadian affiliation: {format(about_not_aff, big.mark = ',')} \\
        (invisible to an affiliation-only rule)")

# Funder skew: the social sciences council against the natural sciences one.
funder_works <- imap_int(CANADIAN_FUNDERS, \(name, fid) {
  as.integer(oa_get("funders", list(filter = glue("ids.openalex:{fid}")), offline = offline)$results[[1]]$works_count)
}) |> set_names(unname(CANADIAN_FUNDERS))

cli_h2("Works linked to each Canadian funder in OpenAlex (all fields)")
walk2(names(sort(funder_works, decreasing = TRUE)), sort(funder_works, decreasing = TRUE),
      \(nm, n) cli_li("{format(n, big.mark = ',', width = 9)}  {nm}"))

sshrc <- funder_works[["Social Sciences and Humanities Research Council of Canada"]]
nserc <- funder_works[["Natural Sciences and Engineering Research Council of Canada"]]

# Affiliation noise: non-Canadian institutions inside a Canada-filtered query.
lineage <- oa_group_by(
  glue("{TOPIC_FILTER},{CANADA_AFFILIATION}"), "authorships.institutions.lineage",
  offline = offline
)
noise <- lineage |> filter(label %in% NOT_CANADIAN)

cli_h2("Non-Canadian institutions appearing INSIDE the Canada-filtered query")
pwalk(noise, \(key, label, n) cli_li("{format(n, big.mark = ',', width = 5)}  {label}"))

record_finding(
  "canadian_linkage",
  list(
    by_affiliation             = by_affiliation,
    by_funder                  = by_funder,
    about_canada               = about,
    about_canada_no_affiliation = about_not_aff,
    funder_works               = as.list(funder_works),
    sshrc_works                = sshrc,
    nserc_works                = nserc,
    nserc_to_sshrc_ratio       = round(nserc / sshrc, 1),
    affiliation_noise          = set_names(as.list(noise$n), noise$label)
  ),
  headline = glue(
    "Affiliation finds {format(by_affiliation, big.mark = ',')} works; a further ",
    "{format(about_not_aff, big.mark = ',')} are about Canada with no Canadian affiliation. ",
    "NSERC has {round(nserc / sshrc, 1)}x SSHRC's linked works, so funder-based rules ",
    "under-count the social sciences."
  )
)
