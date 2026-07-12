#!/usr/bin/env Rscript
# Finding 1: OpenAlex has no topic for metaresearch.
#
# We enumerate the complete OpenAlex topic taxonomy (not a keyword spot-check)
# and look for a topic whose name denotes research-on-research: metaresearch,
# metascience, research integrity, reproducibility, science and technology
# studies. None exists. The work that constitutes the field is instead scattered
# across topics living in different OpenAlex *fields*, which is why no single
# retrieval route can enclose it.
#
# This is the empirical premise of the whole proposal, so it is worth proving
# exhaustively rather than by example.

suppressPackageStartupMessages({
  library(cli); library(purrr); library(dplyr); library(glue)
})
source("R/openalex.R"); source("R/frame.R"); source("R/findings.R")

offline <- "--offline" %in% commandArgs(TRUE)

# Terms that would name the field, if OpenAlex modelled it as a topic at all.
FIELD_NAMES <- c(
  "metaresearch", "meta-research", "metascience", "meta-science",
  "research on research", "science of science",
  "research integrity", "research misconduct", "questionable research practice",
  "reproducibility crisis", "replication crisis",
  "science and technology studies",
  "research assessment", "research evaluation",
  "research waste", "open science"
)

cli_h1("Enumerating the full OpenAlex topic taxonomy (cursor paging)")

topics <- oa_paginate(
  "topics",
  list(select = "id,display_name,description,field,works_count"),
  offline = offline
)
cli_alert_info("retrieved {length(topics)} topics")

# Does ANY topic name the field?
named <- keep(topics, \(t) {
  nm <- tolower(t$display_name)
  any(map_lgl(FIELD_NAMES, \(term) grepl(paste0("\\b", term, "\\b"), nm)))
})

cli_h2("Topics whose NAME denotes research-on-research: {length(named)}")
walk(named, \(t) cli_li("{sub('.*/', '', t$id)}  {t$display_name}"))

# Where do the candidate topics actually live?
by_id <- set_names(topics, map_chr(topics, \(t) sub(".*/", "", t$id)))
found <- by_id[CANDIDATE_TOPICS]

fields <- tibble(
  topic = CANDIDATE_TOPICS,
  name  = map_chr(found, \(t) t$display_name %||% NA_character_),
  field = map_chr(found, \(t) t$field$display_name %||% NA_character_)
)

cli_h2("The {nrow(fields)} candidate topics span {n_distinct(fields$field)} OpenAlex FIELDS")
fields |>
  arrange(field, topic) |>
  group_by(field) |>
  group_walk(\(rows, key) {
    cli_text("{.strong {key$field}}")
    walk2(rows$topic, rows$name, \(t, n) cli_li("{t}  {n}"))
  })

record_finding(
  "topics",
  list(
    n_topics_in_taxonomy    = length(topics),
    n_topics_naming_field   = length(named),
    topics_naming_field     = map_chr(named, \(t) t$display_name),
    n_candidate_topics      = nrow(fields),
    n_fields_spanned        = n_distinct(fields$field),
    fields_spanned          = sort(unique(fields$field)),
    candidate_topic_ids     = CANDIDATE_TOPICS
  ),
  headline = glue(
    "Of {format(length(topics), big.mark = ',')} OpenAlex topics, {length(named)} name ",
    "metaresearch as a field. The {nrow(fields)} topics that do carry metaresearch ",
    "content are scattered across {n_distinct(fields$field)} different OpenAlex fields."
  )
)
