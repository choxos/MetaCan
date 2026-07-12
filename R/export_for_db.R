#!/usr/bin/env Rscript
# Export the frame to CSVs that Postgres can COPY straight in.
#
# WHY NOT ABSTRACTS. Measured, not guessed: the abstract inverted indexes are
# 8.6 GB of the frame's 9.3 GB of text. The VPS has 13 GB free. Loading them
# would leave no headroom on a box already at 96%, so the works table ships with
# every field EXCEPT the abstract, and the detail page fetches the abstract live
# from OpenAlex (free, cached). Abstracts ARE stored for the 1,000 screened
# works, where they are part of the evidence rather than a convenience.
#
# Everything here is a projection of data/frame/canadian_works.parquet, which is
# itself a projection of the pinned OpenAlex snapshot. Nothing is invented.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(jsonlite); library(dplyr); library(cli); library(glue)
})

OUT <- "data/db"
dir.create(OUT, recursive = TRUE, showWarnings = FALSE)
con <- dbConnect(duckdb())
dbExecute(con, "SET preserve_insertion_order = false;")

# --- works: every one of the 4.3M, minus the abstract ---------------------------
cli_alert_info("exporting works")
dbExecute(con, glue("
COPY (
  SELECT
    replace(id, 'https://openalex.org/', '')                    AS id,
    replace(coalesce(doi, ''), 'https://doi.org/', '')          AS doi,
    title,
    publication_year                                            AS year,
    coalesce(language, '')                                      AS lang,
    coalesce(type, '')                                          AS type,
    coalesce(venue, '')                                         AS venue,
    coalesce(topic, '')                                         AS topic,
    coalesce(field, '')                                         AS field,
    coalesce(cited_by_count, 0)                                 AS cited_by,
    is_retracted,
    (abstract_idx IS NOT NULL)                                  AS has_abstract,
    route_ca_aff, route_ca_fund, route_ca_venue, route_about_ca,
    array_to_string(coalesce(ca_institutions, []), '; ')        AS ca_institutions,
    array_to_string(coalesce(funder_names, []), '; ')           AS funders,
    array_to_string(coalesce(keyword_names, []), '; ')          AS keywords
  FROM read_parquet('data/frame/canadian_works.parquet')
) TO '{OUT}/works.csv' (FORMAT csv, HEADER, DELIMITER ',');"))

# --- retraction attributes (finding 17) -----------------------------------------
if (file.exists("data/frame/frame_retractions.parquet")) {
  cli_alert_info("exporting retraction attributes")
  dbExecute(con, glue("
  COPY (
    SELECT replace(id, 'https://openalex.org/', '') AS work_id,
           rw_nature AS nature, coalesce(rw_reason, '') AS reason,
           coalesce(rw_date, '') AS retraction_date, openalex_flagged
    FROM read_parquet('data/frame/frame_retractions.parquet')
  ) TO '{OUT}/retractions.csv' (FORMAT csv, HEADER);"))
}

# --- the screened 1,000: three models, with abstracts ---------------------------
cli_alert_info("exporting the three-model screen")
DIR <- "pilot/screening/frame1k"
design <- readRDS(file.path(DIR, "sample_design.rds")) |> mutate(id = sub(".*/", "", id))
read_arm <- function(d) {
  list.files(file.path(DIR, d), "^labels_\\d+\\.json$", full.names = TRUE) |>
    lapply(fromJSON) |> bind_rows() |> distinct(id, .keep_all = TRUE)
}
arms <- c(opus = "opus_r1", gpt = "codex_r1", grok = "grok_r1")
lab <- Reduce(function(a, b) full_join(a, b, by = "id"), lapply(names(arms), function(m) {
  read_arm(arms[[m]]) |>
    select(id, tier, genre, about_ca, confidence, reason) |>
    rename_with(~ paste0(m, "_", .x), -id)
}))

# the payload the models actually saw, so a reader can check the label against it
chunks <- list.files(file.path(DIR, "chunks"), "\\.json$", full.names = TRUE) |>
  lapply(fromJSON) |> bind_rows()

screened <- design |>
  inner_join(lab, by = "id") |>
  inner_join(chunks |> select(id, title, abstract, year, lang, type, venue, topic, field), by = "id") |>
  mutate(n_in = (opus_tier %in% c("T1","T2")) + (gpt_tier %in% c("T1","T2")) + (grok_tier %in% c("T1","T2")))
write.csv(screened, file.path(OUT, "screened.csv"), row.names = FALSE, na = "")

# --- findings -------------------------------------------------------------------
file.copy("pilot/results/findings.json", file.path(OUT, "findings.json"), overwrite = TRUE)

for (f in list.files(OUT, full.names = TRUE))
  cli_li("{basename(f)}: {format(round(file.size(f)/1e6), big.mark=',')} MB")
n <- dbGetQuery(con, glue("SELECT count(*) n FROM read_csv_auto('{OUT}/works.csv')"))$n
cli_alert_success("works.csv holds {format(n, big.mark=',')} works; screened.csv holds {nrow(screened)}")
dbDisconnect(con, shutdown = TRUE)
