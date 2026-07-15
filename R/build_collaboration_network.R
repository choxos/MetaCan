suppressPackageStartupMessages({
  library(DBI)
  library(duckdb)
  library(glue)
  library(jsonlite)
  library(cli)
})

FRAME <- "data/db/works_full.parquet"
AUTHORSHIP_FRAME <- "data/collaboration/canadian_authorships.parquet"
AUTHORSHIP_COMPLETION <- "data/collaboration/canadian_authorships.complete.json"
TEAM_CAP <- 25L
EDGE_LIMIT <- 160L
OUT <- "data/frame/collaboration_network.json"
SITE_OUT <- "site/src/data/collaboration-network.json"

if (!file.exists(FRAME)) {
  cli_abort("{FRAME} is required. Run R/export_for_db.R after building the frame.")
}

dir.create(dirname(OUT), recursive = TRUE, showWarnings = FALSE)
dir.create(dirname(SITE_OUT), recursive = TRUE, showWarnings = FALSE)

con <- dbConnect(duckdb())
on.exit(dbDisconnect(con, shutdown = TRUE), add = TRUE)
dbExecute(con, "SET preserve_insertion_order = false")

cli_alert_info("expanding Canadian institution memberships from the full frame")
dbExecute(con, glue("
  CREATE OR REPLACE TEMP TABLE institution_work AS
  SELECT DISTINCT
    id AS work_id,
    year,
    'I' || substr(md5(trim(institution_name)), 1, 16) AS institution_id,
    trim(institution_name) AS institution_name
  FROM read_parquet('{FRAME}'),
       UNNEST(string_split(coalesce(ca_institutions, ''), '; ')) AS u(institution_name)
  WHERE trim(institution_name) <> ''
"))

cli_alert_info("aggregating strongest institution collaborations")
institution_edges <- dbGetQuery(con, glue("
  WITH team AS (
    SELECT work_id, count(*) AS n
    FROM institution_work
    GROUP BY work_id
  )
  SELECT
    a.institution_id AS source,
    b.institution_id AS target,
    count(*)::INTEGER AS works
  FROM institution_work a
  JOIN institution_work b
    ON a.work_id = b.work_id
   AND a.institution_id < b.institution_id
  JOIN team t ON t.work_id = a.work_id
  WHERE t.n <= {TEAM_CAP}
  GROUP BY a.institution_id, b.institution_id
  ORDER BY works DESC, source, target
  LIMIT {EDGE_LIMIT}
"))

quoted_ids <- paste(
  dbQuoteString(
    con,
    unique(c(institution_edges$source, institution_edges$target))
  ),
  collapse = ", "
)

institution_nodes <- dbGetQuery(con, glue("
  SELECT
    institution_id AS id,
    arg_max(institution_name, year) AS name,
    count(DISTINCT work_id)::INTEGER AS works
  FROM institution_work
  WHERE institution_id IN ({quoted_ids})
  GROUP BY institution_id
  ORDER BY works DESC, name
"))

summary <- dbGetQuery(con, glue("
  SELECT
    count(DISTINCT work_id)::INTEGER AS works,
    count(DISTINCT institution_id)::INTEGER AS institutions,
    (
      SELECT count(*) FROM (
        SELECT work_id
        FROM institution_work
        GROUP BY work_id
        HAVING count(*) > {TEAM_CAP}
      )
    )::INTEGER AS cap_exclusions
  FROM institution_work
"))

institution_edge_rows <- lapply(seq_len(nrow(institution_edges)), function(i) {
  list(
    source = institution_edges$source[[i]],
    target = institution_edges$target[[i]],
    works = as.integer(institution_edges$works[[i]])
  )
})

institutions <- lapply(seq_len(nrow(institution_nodes)), function(i) {
  list(
    id = institution_nodes$id[[i]],
    name = institution_nodes$name[[i]],
    works = as.integer(institution_nodes$works[[i]])
  )
})

authors <- list()
author_edge_rows <- list()
author_status <- "requires_full_authorship_reharvest"
author_works <- 0L
author_count <- 0L
author_cap_exclusions <- 0L

authorship_ready <- FALSE
if (file.exists(AUTHORSHIP_FRAME) && file.exists(AUTHORSHIP_COMPLETION)) {
  completion <- fromJSON(AUTHORSHIP_COMPLETION)
  authorship_ready <-
    identical(completion$status, "complete") &&
    identical(as.integer(completion$source_files), as.integer(completion$completed_files)) &&
    identical(
      completion$output_md5,
      as.character(unname(tools::md5sum(AUTHORSHIP_FRAME)))
    )
}

if (authorship_ready) {
  cli_alert_info("aggregating strongest author collaborations")
  dbExecute(con, glue("
    CREATE OR REPLACE TEMP TABLE author_work AS
    SELECT DISTINCT work_id, year, author_id, author_name
    FROM read_parquet('{AUTHORSHIP_FRAME}')
  "))
  author_edges <- dbGetQuery(con, glue("
    WITH team AS (
      SELECT work_id, count(*) AS n
      FROM author_work
      GROUP BY work_id
    )
    SELECT
      a.author_id AS source,
      b.author_id AS target,
      count(*)::INTEGER AS works
    FROM author_work a
    JOIN author_work b
      ON a.work_id = b.work_id
     AND a.author_id < b.author_id
    JOIN team t ON t.work_id = a.work_id
    WHERE t.n <= {TEAM_CAP}
    GROUP BY a.author_id, b.author_id
    ORDER BY works DESC, source, target
    LIMIT {EDGE_LIMIT}
  "))
  author_ids <- paste(
    dbQuoteString(
      con,
      unique(c(author_edges$source, author_edges$target))
    ),
    collapse = ", "
  )
  author_nodes <- dbGetQuery(con, glue("
    SELECT
      author_id AS id,
      arg_max(author_name, year) AS name,
      count(DISTINCT work_id)::INTEGER AS works
    FROM author_work
    WHERE author_id IN ({author_ids})
    GROUP BY author_id
    ORDER BY works DESC, name
  "))
  author_affiliations <- dbGetQuery(con, glue("
    SELECT author_id, institution_id AS id, institution_name AS name, works
    FROM (
      SELECT
        author_id,
        institution_id,
        arg_max(institution_name, year) AS institution_name,
        count(DISTINCT work_id)::INTEGER AS works,
        row_number() OVER (
          PARTITION BY author_id
          ORDER BY count(DISTINCT work_id) DESC, institution_id
        ) AS rank
      FROM read_parquet('{AUTHORSHIP_FRAME}')
      WHERE author_id IN ({author_ids})
      GROUP BY author_id, institution_id
    )
    WHERE rank <= 4
    ORDER BY author_id, works DESC, name
  "))
  author_summary <- dbGetQuery(con, glue("
    SELECT
      count(DISTINCT work_id)::INTEGER AS works,
      count(DISTINCT author_id)::INTEGER AS authors,
      (
        SELECT count(*) FROM (
          SELECT work_id
          FROM author_work
          GROUP BY work_id
          HAVING count(*) > {TEAM_CAP}
        )
      )::INTEGER AS cap_exclusions
    FROM author_work
  "))
  affiliations_for <- function(author_id) {
    rows <- author_affiliations[
      author_affiliations$author_id == author_id,
      ,
      drop = FALSE
    ]
    lapply(seq_len(nrow(rows)), function(i) {
      list(
        id = rows$id[[i]],
        name = rows$name[[i]],
        works = as.integer(rows$works[[i]])
      )
    })
  }
  authors <- lapply(seq_len(nrow(author_nodes)), function(i) {
    list(
      id = author_nodes$id[[i]],
      name = author_nodes$name[[i]],
      works = as.integer(author_nodes$works[[i]]),
      affiliations = affiliations_for(author_nodes$id[[i]])
    )
  })
  author_edge_rows <- lapply(seq_len(nrow(author_edges)), function(i) {
    list(
      source = author_edges$source[[i]],
      target = author_edges$target[[i]],
      works = as.integer(author_edges$works[[i]])
    )
  })
  author_status <- "complete"
  author_works <- as.integer(author_summary$works[[1]])
  author_count <- as.integer(author_summary$authors[[1]])
  author_cap_exclusions <- as.integer(author_summary$cap_exclusions[[1]])
}

payload <- list(
  metadata = list(
    frame_works = 4299418L,
    year_from = 2000L,
    year_to = 2025L,
    works_with_named_canadian_institutions = as.integer(summary$works[[1]]),
    institutions = as.integer(summary$institutions[[1]]),
    institution_team_cap = TEAM_CAP,
    institution_cap_exclusions = as.integer(summary$cap_exclusions[[1]]),
    author_works = author_works,
    authors = author_count,
    author_team_cap = TEAM_CAP,
    author_cap_exclusions = author_cap_exclusions,
    edge_limit = EDGE_LIMIT,
    author_network_status = author_status
  ),
  authors = authors,
  author_edges = author_edge_rows,
  institutions = institutions,
  institution_edges = institution_edge_rows
)

write_json(payload, OUT, auto_unbox = TRUE, pretty = TRUE, na = "null")
write_json(payload, SITE_OUT, auto_unbox = TRUE, pretty = TRUE, na = "null")

cli_alert_success(glue(
  "wrote {format(summary$works[[1]], big.mark = ',')} works and ",
  "{format(summary$institutions[[1]], big.mark = ',')} institutions"
))
