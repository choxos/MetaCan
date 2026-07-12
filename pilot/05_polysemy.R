#!/usr/bin/env Rscript
# Finding 5: polysemy destroys keyword retrieval, so screening must be semantic.
#
# "Reproducibility" in a metaresearch paper means the reproducibility crisis. In
# a biochemistry paper it means whether an assay gives the same reading twice.
# Same token, unrelated senses, and the second sense is vastly more common.
#
# The same holds for "peer review" (a metaresearch object; also a sentence in the
# methods of any paper) and "open access" (a metaresearch object; also a licence
# note). No lexicon distinguishes them, because the distinction is not lexical.
#
# This is the argument for a semantic classifier over a keyword list, and it is
# why these terms are excluded from our lexicon rather than included in it.

suppressPackageStartupMessages({ library(cli); library(glue); library(purrr); library(dplyr) })
source("R/openalex.R"); source("R/frame.R"); source("R/findings.R")

offline <- "--offline" %in% commandArgs(TRUE)

# How many Canadian works does each promiscuous term drag in on its own, and
# how many of those are even in the metaresearch topic space?
hits <- map(set_names(POLYSEMOUS), \(term) {
  list(
    alone    = oa_count(glue("title_and_abstract.search:{term},{CANADA_AFFILIATION}"), offline = offline),
    on_topic = oa_count(glue("title_and_abstract.search:{term},{CANADA_AFFILIATION},{TOPIC_FILTER}"), offline = offline)
  )
})

disciplined <- oa_count(
  glue("title_and_abstract.search:{lexicon(LEXICON_EN)},{CANADA_AFFILIATION}"), offline = offline
)

tbl <- tibble(
  term      = names(hits),
  alone     = map_int(hits, \(h) as.integer(h$alone)),
  on_topic  = map_int(hits, \(h) as.integer(h$on_topic))
) |>
  mutate(precision = round(100 * on_topic / alone, 1)) |>
  arrange(desc(alone))

cli_h1("Canadian works retrieved by each promiscuous term, ALONE")
pwalk(tbl, \(term, alone, on_topic, precision) {
  cli_li("{format(term, width = 20)} {format(alone, big.mark = ',', width = 8)} hits \\
          | {format(on_topic, big.mark = ',', width = 6)} on-topic | {precision}% precision")
})
cli_alert_info("disciplined lexicon (polysemous terms excluded): {format(disciplined, big.mark = ',')}")

worst <- tbl |> slice_max(alone, n = 1)

record_finding(
  "polysemy",
  list(
    hits_alone               = set_names(as.list(tbl$alone), tbl$term),
    hits_alone_and_on_topic  = set_names(as.list(tbl$on_topic), tbl$term),
    topic_space_precision_pct = set_names(as.list(tbl$precision), tbl$term),
    disciplined_lexicon_hits = disciplined,
    worst_term               = worst$term
  ),
  headline = glue(
    "The single term {worst$term} retrieves {format(worst$alone, big.mark = ',')} Canadian works, ",
    "of which only {worst$precision}% fall in the metaresearch topic space. Keyword retrieval ",
    "cannot separate the metaresearch sense from the everyday one."
  )
)
