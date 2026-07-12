# Pull works from the pinned OpenAlex snapshot on S3.
#
# The API is metered (pilot/08: 1,000 credits per ~11h; the free tier is ten
# cents), so enumerating a 3.5M-work frame through it is neither free nor
# reproducible. The snapshot is neither metered nor mutable: anonymous S3, and
# the same release produces the same bytes forever. That is the difference
# between a study a reviewer can re-run and one they have to take on trust.
#
# DuckDB reads the parquet directly over S3 with predicate pushdown, so we pay
# for the columns and row groups we touch, not for the 815 MB partition.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(glue); library(cli)
})

SNAPSHOT_RELEASE <- "2026-06-24"   # stamped into every release; never floats
SNAPSHOT_URI <- if (file.exists("data/snapshot/works_2026-06-24.parquet")) "data/snapshot/works_2026-06-24.parquet" else glue(
  "s3://openalex/data/parquet/works/updated_date={SNAPSHOT_RELEASE}/*.parquet"
)

#' Connect to the snapshot. Anonymous: the bucket is public.
snapshot_con <- function() {
  con <- dbConnect(duckdb())
  dbExecute(con, "INSTALL httpfs; LOAD httpfs;")
  # An empty credential pair is how DuckDB is told to sign nothing.
  dbExecute(con, "CREATE OR REPLACE SECRET (TYPE s3, PROVIDER config, KEY_ID '', SECRET '');")
  con
}

#' Reconstruct abstracts from OpenAlex's inverted index.
#'
#' OpenAlex ships abstracts as a JSON map {token -> [positions]}, which sidesteps
#' the copyright problem of redistributing running text. Inverting it loses only
#' punctuation, which does not matter for screening.
#'
#' The snapshot stores it as a JSON *string*, not a DuckDB MAP, so we invert it
#' here rather than in SQL.
deinvert_abstract <- function(json_str) {
  if (is.na(json_str) || !nzchar(json_str)) return(NA_character_)
  idx <- tryCatch(
    jsonlite::fromJSON(json_str, simplifyVector = FALSE),
    error = function(e) NULL
  )
  if (is.null(idx) || !length(idx)) return(NA_character_)

  positions <- unlist(idx, use.names = FALSE)
  tokens    <- rep(names(idx), lengths(idx))
  paste(tokens[order(positions)], collapse = " ")
}

#' Every work in the snapshot with at least one Canadian institutional affiliation.
#'
#' This is the frame: defined by an external, checkable criterion (a Canadian
#' author affiliation), not by our notion of what metaresearch looks like. The
#' field boundary is then a classification question over this frame rather than a
#' retrieval question over the literature, which is what makes "what did we
#' miss?" answerable at all.
#' NB: the snapshot's top-level `institutions` column is empty. Affiliations live
#' at authorships[].institutions[].country_code. This cost an hour to find, so it
#' is written down rather than left as folklore.
canadian_works <- function(con, limit = NULL, seed = 20260711L) {
  lim <- if (is.null(limit)) "" else glue("USING SAMPLE {limit} ROWS (reservoir, {seed})")

  glue("
    WITH ca AS (
      SELECT *,
        list_distinct(flatten(list_transform(
          authorships,
          a -> list_transform(
                 list_filter(a.institutions, i -> i.country_code = 'CA'),
                 i -> i.display_name)
        ))) AS ca_institutions
      FROM read_parquet('{SNAPSHOT_URI}')
      WHERE publication_year BETWEEN 2000 AND 2025
        AND title IS NOT NULL
    )
    SELECT * FROM (
      SELECT
        id, doi, title, publication_year, language, type,
        is_paratext, is_retracted,
        -- Pull the topic ID, not just its name. R/frame.R defines the topic
        -- route by ID; scoring it by display name means scoring a different
        -- route (names drift, are not unique, and a typo silently drops one).
        primary_topic.id                  AS topic_id,
        primary_topic.display_name        AS topic,
        primary_topic.field.display_name  AS field,
        ca_institutions,
        list_distinct(list_transform(funders, f -> f.display_name)) AS funder_names,
        abstract_inverted_index           AS abstract_idx
      FROM ca
      WHERE len(ca_institutions) > 0
    )
    {lim}
  ")   # NB: the sample MUST wrap the filtered set. DuckDB applies a bare
       # `USING SAMPLE` to the scan, not to the WHERE result, which silently
       # samples the whole partition and then throws away the non-Canadians.
}
