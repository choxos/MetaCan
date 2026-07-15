suppressPackageStartupMessages({
  library(DBI)
  library(duckdb)
  library(glue)
  library(cli)
  library(jsonlite)
})

SNAPSHOT_CUTOFF <- "2026-06-26"
OUT_DIR <- Sys.getenv(
  "METACAN_COLLABORATION_DIR",
  unset = "data/collaboration"
)
LISTING_SOURCE <- Sys.getenv("OA_LISTING_PATH", unset = "")
MAX_FILES <- as.integer(
  Sys.getenv("METACAN_AUTHORSHIP_MAX_FILES", unset = "0")
)
SHARD_DIR <- file.path(OUT_DIR, "authorship_shards")
OUT_FILE <- file.path(OUT_DIR, "canadian_authorships.parquet")
COMPLETION <- file.path(OUT_DIR, "canadian_authorships.complete.json")
MANIFEST <- file.path(OUT_DIR, "authorship_files_done.txt")
LISTING <- file.path(OUT_DIR, glue("s3_listing_{SNAPSHOT_CUTOFF}.txt"))
STAGE <- Sys.getenv(
  "OA_STAGE_DIR",
  unset = file.path(tempdir(), "metacan_authorship_stage")
)

dir.create(OUT_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(SHARD_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(STAGE, recursive = TRUE, showWarnings = FALSE)

free_bytes <- function(path) {
  output <- system2("df", c("-k", shQuote(path)), stdout = TRUE)
  fields <- strsplit(trimws(output[length(output)]), "\\s+")[[1]]
  as.numeric(fields[[4]]) * 1024
}

if (nzchar(LISTING_SOURCE) && file.exists(LISTING_SOURCE)) {
  listing <- readLines(LISTING_SOURCE)
} else if (!file.exists(LISTING)) {
  cli_alert_info("pinning the OpenAlex works listing through {SNAPSHOT_CUTOFF}")
  listing <- system2(
    "aws",
    c(
      "s3", "ls", "s3://openalex/data/parquet/works/",
      "--recursive", "--no-sign-request"
    ),
    stdout = TRUE
  )
  writeLines(listing, LISTING)
} else {
  listing <- readLines(LISTING)
}

listing <- grep("\\.parquet$", listing, value = TRUE)
parts <- strsplit(trimws(listing), "\\s+")
files <- data.frame(
  bytes = vapply(parts, function(fields) as.numeric(fields[[3]]), numeric(1)),
  key = vapply(parts, function(fields) fields[[4]], character(1)),
  stringsAsFactors = FALSE
)
partition_date <- sub(
  ".*updated_date=([0-9-]+)/.*",
  "\\1",
  files$key
)
files <- files[partition_date <= SNAPSHOT_CUTOFF, , drop = FALSE]
files <- files[order(files$key), , drop = FALSE]
expected_keys <- files$key

write_json(
  list(
    status = "incomplete",
    snapshot_cutoff = SNAPSHOT_CUTOFF,
    source_files = length(expected_keys)
  ),
  COMPLETION,
  auto_unbox = TRUE,
  pretty = TRUE
)

done <- if (file.exists(MANIFEST)) readLines(MANIFEST) else character()
files <- files[!files$key %in% done, , drop = FALSE]
if (MAX_FILES > 0) files <- head(files, MAX_FILES)
cli_alert_info("{nrow(files)} source files remain")

con <- dbConnect(duckdb())
on.exit(dbDisconnect(con, shutdown = TRUE), add = TRUE)
dbExecute(con, "SET preserve_insertion_order = false")
dbExecute(
  con,
  glue("SET temp_directory = '{file.path(STAGE, '.duckdb_tmp')}'")
)

extract_sql <- function(path) {
  glue("
    SELECT DISTINCT
      replace(w.id, 'https://openalex.org/', '') AS work_id,
      w.publication_year AS year,
      replace(a.author.id, 'https://openalex.org/', '') AS author_id,
      coalesce(
        nullif(a.author.display_name, ''),
        nullif(a.raw_author_name, ''),
        replace(a.author.id, 'https://openalex.org/', '')
      ) AS author_name,
      replace(a.author.orcid, 'https://orcid.org/', '') AS orcid,
      replace(i.id, 'https://openalex.org/', '') AS institution_id,
      i.display_name AS institution_name,
      replace(i.ror, 'https://ror.org/', '') AS ror
    FROM read_parquet('{path}') w,
         UNNEST(w.authorships) AS ua(a),
         UNNEST(list_filter(
           a.institutions,
           institution -> institution.country_code = 'CA'
         )) AS ui(i)
    WHERE w.publication_year BETWEEN 2000 AND 2025
      AND w.title IS NOT NULL
      AND a.author.id IS NOT NULL
      AND i.id IS NOT NULL
      AND i.display_name IS NOT NULL
  ")
}

for (index in seq_len(nrow(files))) {
  key <- files$key[[index]]
  bytes <- files$bytes[[index]]
  safe_name <- gsub("[^A-Za-z0-9._-]", "_", key)
  local <- file.path(STAGE, basename(key))
  shard <- file.path(SHARD_DIR, sub("\\.parquet$", "", safe_name))
  shard <- paste0(shard, ".parquet")

  if (free_bytes(STAGE) < bytes * 3) {
    cli_abort(
      "{key} needs {round(bytes * 3 / 1e9, 1)} GB of working room"
    )
  }

  status <- system2(
    "aws",
    c(
      "s3", "cp", shQuote(glue("s3://openalex/{key}")), shQuote(local),
      "--no-sign-request", "--quiet"
    ),
    stdout = FALSE,
    stderr = FALSE
  )
  if (status != 0 || !file.exists(local) || file.size(local) != bytes) {
    cli_abort("{key} did not download completely")
  }

  success <- tryCatch({
    dbExecute(
      con,
      glue(
        "COPY ({extract_sql(local)}) TO '{shard}' ",
        "(FORMAT parquet, COMPRESSION zstd)"
      )
    )
    TRUE
  }, error = function(error) {
    cli_alert_danger(conditionMessage(error))
    FALSE
  })
  unlink(local)
  if (!success) cli_abort("{key} failed and remains outside the manifest")

  cat(key, file = MANIFEST, sep = "\n", append = TRUE)
  if (index %% 25 == 0 || index == nrow(files)) {
    cli_alert_info("[{index}/{nrow(files)}] {key}")
  }
}

completed_keys <- if (file.exists(MANIFEST)) unique(readLines(MANIFEST)) else character()
if (!setequal(expected_keys, completed_keys)) {
  cli_alert_info(
    "authorship shards are preserved; {length(intersect(expected_keys, completed_keys))} of {length(expected_keys)} source files are complete"
  )
  quit(save = "no", status = 0)
}

cli_alert_info("consolidating authorship shards")
dbExecute(
  con,
  glue(
    "COPY (SELECT * FROM read_parquet('{SHARD_DIR}/*.parquet')) ",
    "TO '{OUT_FILE}' (FORMAT parquet, COMPRESSION zstd)"
  )
)

summary <- dbGetQuery(
  con,
  glue("
    SELECT
      count(DISTINCT work_id) AS works,
      count(DISTINCT author_id) AS authors,
      count(DISTINCT institution_id) AS institutions
    FROM read_parquet('{OUT_FILE}')
  ")
)

write_json(
  list(
    status = "complete",
    snapshot_cutoff = SNAPSHOT_CUTOFF,
    source_files = length(expected_keys),
    completed_files = length(completed_keys),
    output_bytes = file.size(OUT_FILE),
    output_md5 = as.character(unname(tools::md5sum(OUT_FILE)))
  ),
  COMPLETION,
  auto_unbox = TRUE,
  pretty = TRUE
)

cli_alert_success(glue(
  "wrote {format(summary$works[[1]], big.mark = ',')} works, ",
  "{format(summary$authors[[1]], big.mark = ',')} authors and ",
  "{format(summary$institutions[[1]], big.mark = ',')} institutions"
))
