#!/usr/bin/env Rscript
# Re-derive primary_topic.id for the screened sample, from the pinned snapshot.
#
# WHY THIS EXISTS. `R/frame.R` defines the topic route by ID
# (primary_topic.id:T10102|T13607|...), which is what produced the 14,873-work
# figure from the API. But `canadian_works()` only ever SELECTed
# primary_topic.display_name, so finding 12 originally scored the route by
# string-matching eleven hand-typed topic NAMES. That is not the same route:
# display names drift, they are not unique, and a typo silently drops a topic.
#
# So: pull the real IDs for the sampled works and score the route on the same
# key the frame defines it with. No re-screening, no re-sampling: just the
# column that should have been in the SELECT from the start.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(dplyr); library(glue); library(cli)
})
source("R/snapshot.R")

d <- readRDS("pilot/screening/canadian_sample.rds")
ids <- unique(d$id)                                   # full OpenAlex URLs
cli_alert_info("resolving primary_topic.id for {length(ids)} sampled works")

con <- snapshot_con(); on.exit(dbDisconnect(con, shutdown = TRUE))

# Only two columns and an id filter: no `authorships` scan, so DuckDB skips
# almost every row group on the parquet's min/max statistics.
in_list <- paste0("'", ids, "'", collapse = ",")
sql <- glue("
  SELECT id, primary_topic.id AS topic_id, primary_topic.display_name AS topic
  FROM read_parquet('{SNAPSHOT_URI}')
  WHERE id IN ({in_list})
")

t <- dbGetQuery(con, sql) |> mutate(topic_id = sub(".*/", "", topic_id))
cli_alert_success("resolved {nrow(t)} / {length(ids)}")

out <- d |> select(-any_of("topic_id")) |> left_join(t |> select(id, topic_id), by = "id")
saveRDS(out, "pilot/screening/canadian_sample.rds")
cli_alert_success("canadian_sample.rds now carries topic_id")

# What the hand-typed display names actually cost us.
source("R/frame.R")
short <- out |> mutate(id = sub(".*/", "", id))
cli_h2("Route membership, by ID (the definition in R/frame.R)")
hit <- short |> filter(!is.na(topic_id), topic_id %in% CANDIDATE_TOPICS)
cli_li("works on the route : {nrow(hit)} / {nrow(short)} ({round(100*nrow(hit)/nrow(short), 2)}%)")
print(hit |> count(topic_id, topic, sort = TRUE))

missing <- setdiff(CANDIDATE_TOPICS, unique(hit$topic_id))
if (length(missing)) cli_alert_warning("topics with no hits in the sample: {.val {missing}}")
