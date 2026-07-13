#!/usr/bin/env Rscript
# Build TWO payloads for the same 1,290 works, to separate two effects that the
# pilot confounded.
#
#   PAYLOAD-6  id, title, abstract, year, lang, type
#              = exactly what the pilot harness sent (DEVIATIONS.md D1).
#
#   PAYLOAD-8  + venue, topic, field, ca_institutions, funders
#              = what docs/protocol/rubric.md ACTUALLY MANDATES and never got.
#
# These 1,290 works already carry labels from Claude Sonnet 4.6 (screener A) and
# GPT-5.6 (screener B), both on payload-6. Screening them with Haiku on BOTH
# payloads gives a clean 2x2:
#
#   MODEL effect   : Haiku-6 vs Sonnet-6 vs GPT-6   (same payload, different model)
#   PAYLOAD effect : Haiku-6 vs Haiku-8             (same model, different payload)
#
# The first tells us whether the cheap model finding 13 budgets for can actually do
# the rubric. The second is the finding the proposal already promises: what the
# metadata the harness withheld was actually worth.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(dplyr); library(jsonlite); library(glue); library(cli)
})
source("R/snapshot.R")

j <- fromJSON("pilot/screening/labels_joined.json") |> distinct(id, .keep_all = TRUE)
cli_alert_info("double-screened works with BOTH Sonnet and GPT labels: {nrow(j)}")

ids <- paste0("'https://openalex.org/", j$id, "'", collapse = ",")
con <- snapshot_con(); on.exit(dbDisconnect(con, shutdown = TRUE))

# VENUE. The field the rubric mandates and the pilot never extracted.
full <- dbGetQuery(con, glue("
  SELECT
    regexp_replace(id, '.*/', '')          AS id,
    title, publication_year AS year, language AS lang, type,
    abstract_inverted_index                AS abstract_idx,
    primary_location.source.display_name   AS venue,
    primary_topic.display_name             AS topic,
    primary_topic.field.display_name       AS field,
    list_distinct(flatten(list_transform(authorships,
      a -> list_transform(list_filter(a.institutions, i -> i.country_code='CA'),
                          i -> i.display_name)))) AS ca_institutions,
    list_distinct(list_transform(funders, f -> f.display_name)) AS funders
  FROM read_parquet('{SNAPSHOT_URI}')
  WHERE id IN ({ids})"))

full$abstract <- vapply(full$abstract_idx, deinvert_abstract, character(1))
full$abstract[is.na(full$abstract)] <- ""
full$abstract_idx <- NULL
cli_alert_success("pulled {nrow(full)} works with the FULL payload (venue present on {sum(!is.na(full$venue))})")

trim <- function(x, n = 1200) ifelse(nchar(x) > n, paste0(substr(x, 1, n), "..."), x)
full$abstract <- trim(full$abstract)

p6 <- full |> select(id, title, abstract, year, lang, type)
p8 <- full |> select(id, title, abstract, year, lang, type,
                     venue, topic, field, ca_institutions, funders)

dir.create("pilot/screening/haiku/p6", recursive = TRUE, showWarnings = FALSE)
dir.create("pilot/screening/haiku/p8", recursive = TRUE, showWarnings = FALSE)
CH <- 100L
for (nm in c("p6", "p8")) {
  d <- get(nm)
  idx <- split(seq_len(nrow(d)), ceiling(seq_len(nrow(d)) / CH))
  for (i in seq_along(idx)) {
    write_json(d[idx[[i]], ], glue("pilot/screening/haiku/{nm}/chunk_{sprintf('%02d', i)}.json"),
               auto_unbox = TRUE, na = "string")
  }
  cli_alert_success("{nm}: {length(idx)} chunks of <= {CH}")
}
saveRDS(j, "pilot/screening/haiku/ab_labels.rds")
