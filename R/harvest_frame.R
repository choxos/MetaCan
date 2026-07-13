#!/usr/bin/env Rscript
# Build the REAL frame: every Canadian work in OpenAlex, from every partition.
#
# ------------------------------------------------------------------------------
# WHY THIS EXISTS, AND WHAT IT REPAIRS
# ------------------------------------------------------------------------------
# Every "hypothesis with a denominator" caveat in this project traces to one
# shortcut: the pilot sampled a SINGLE `updated_date` partition (2026-06-24)
# instead of the frame. OpenAlex partitions works by the date the record was last
# TOUCHED, so one partition is not a sample of the corpus. It is a sample of
# whatever OpenAlex happened to re-process that day. That shortcut caused, at
# minimum:
#
#   - the base rate being a hypothesis rather than a count (finding 9);
#   - the "does the partition skew?" anxiety that produced a decoy robustness
#     check and then a real one (finding 11, DEVIATIONS.md D4);
#   - a reconciliation failure I could not explain: the sample implies ~9,170
#     works on the topic route where the API returned 14,873 (finding 12);
#   - and, worst, D1. I pulled a handful of columns from one partition, and VENUE
#     was not among them. The locked rubric mandates venue. The screen never saw
#     it. The proposal then invented a "venue reference set" as a NEW instrument,
#     which was really a proposal to do what the rubric always said.
#
# The union of all 483 partitions IS the corpus: each work appears once, in the
# partition of its last update. So scanning all of them yields the frame itself,
# enumerated, not estimated. There is nothing clever here. It is the thing I
# should have done first, and the only reason I did not is that one partition was
# 815 MB and the whole tree is 725 GB.
#
# ------------------------------------------------------------------------------
# WHY WE DO NOT DOWNLOAD 725 GB
# ------------------------------------------------------------------------------
# We do not need OpenAlex. We need the Canadian slice of it, which is ~1.3% of
# works. So: stream one partition at a time, keep only the Canadian rows and only
# the columns the rubric names, drop the raw file, move on. The output is a few GB
# rather than 725.
#
# The transfer is anonymous and free (AWS Open Data covers egress). At the
# measured ~30 MB/s this is a several-hour job, run once, and the result is a
# pinned artifact that never has to be fetched again.
#
# ------------------------------------------------------------------------------
# PEAK DISK IS ONE PARTITION, AND ONE PARTITION IS NOT SMALL
# ------------------------------------------------------------------------------
# An earlier version of this comment said "peak disk is one partition (~2 GB)".
# That was measured on the partitions I had actually seen, which were the OLD ones,
# and it was false about the ones coming. The partitions are wildly unequal:
#
#     updated_date=2026-05-21   102.9 GB     <- ONE partition
#     updated_date=2026-06-26    79.4 GB
#     updated_date=2026-02-09    44.2 GB
#     ...the median partition      0.1 GB
#
# Two partitions are 44% of the remaining bytes. The internal disk had 102 GB free
# and the next big partition is 102.9 GB, so the job was one partition away from
# filling the boot volume to zero.
#
# THE GENERALISABLE ERROR, WHICH IS THIS PROJECT'S OWN THESIS AGAIN: I sized a
# population from the part of it I had already looked at. That is exactly what the
# single-partition pilot did (finding 9), what the topic route does (finding 12),
# and what the four-funder list did (frame_lexicon.R). Extrapolating from the
# convenient sample is the failure mode this entire project is ABOUT, and it turns
# out I was still doing it to my own disk budget.
#
# Two repairs, because a comment is not a guard:
#   1. Stage to a volume chosen for CAPACITY, not to tempdir() (see STAGE below).
#   2. CHECK, per partition, that the free space exceeds the partition's REMOTE
#      size before downloading it, and abort loudly if not. A job that fills a disk
#      and dies is worse than a job that refuses to start.
#
# ------------------------------------------------------------------------------
# WHAT IT EXTRACTS: THE RUBRIC'S FULL EIGHT-FIELD PAYLOAD
# ------------------------------------------------------------------------------
# docs/protocol/rubric.md says the screener sees: "title, abstract, publication year,
# language, VENUE, OpenAlex TOPIC AND FIELD, Canadian institutional AFFILIATIONS,
# FUNDERS." The pilot harness sent six of those eight. All eight are extracted
# here, so the full screen can obey the instrument. That is D1's root cause, and
# this is its repair.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(glue); library(cli)
})
source("R/frame_lexicon.R")   # CA_AFF_SQL, CA_FUND_SQL, about_ca_sql(), lexicon

OUT_DIR  <- "data/frame"
OUT_FILE <- file.path(OUT_DIR, "canadian_works.parquet")
MANIFEST <- file.path(OUT_DIR, "partitions_done.txt")

STAGE <- Sys.getenv("OA_STAGE_DIR", unset = file.path(tempdir(), "oa_stage"))

dir.create(OUT_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(STAGE,   recursive = TRUE, showWarnings = FALSE)

#' Free bytes on the volume holding `path`.
free_bytes <- function(path) {
  out <- system2("df", c("-k", shQuote(path)), stdout = TRUE)
  as.numeric(strsplit(trimws(out[length(out)]), "\\s+")[[1]][4]) * 1024
}

#' The parquet FILES in a partition, with their sizes, from the S3 listing.
#'
#' We iterate over FILES, not partitions, because a partition is not a unit of
#' anything except OpenAlex's release process, and it is not bounded: the largest
#' is 102.9 GB. A FILE is bounded (the largest in the snapshot is 1.31 GB), so
#' file-at-a-time is what makes peak disk a constant instead of a hostage to
#' whichever day OpenAlex decided to reprocess a hundred million records.
part_files <- function(p) {
  ls <- system2("aws", c("s3", "ls",
      shQuote(glue("s3://openalex/data/parquet/works/{p}/")), "--no-sign-request"),
    stdout = TRUE, stderr = FALSE)
  ls <- grep("\\.parquet$", ls, value = TRUE)
  if (!length(ls)) return(data.frame(key = character(), bytes = numeric()))
  data.frame(
    key   = sub("^.*\\s(\\S+\\.parquet)$", "\\1", ls),
    bytes = as.numeric(sub("^\\s*\\S+\\s+\\S+\\s+(\\d+)\\s+.*$", "\\1", ls))
  )
}

cli_alert_info("staging in {.path {STAGE}} ({round(free_bytes(STAGE)/1e9)} GB free)")

# --- enumerate the partitions --------------------------------------------------
# NB: the listing also contains a manifest.json line. Take only the PRE prefixes,
# or you end up trying to download a partition called "2026-06-26 23:04:38".
parts <- system2("aws",
  c("s3", "ls", "s3://openalex/data/parquet/works/", "--no-sign-request"),
  stdout = TRUE)
parts <- grep("PRE updated_date=", parts, value = TRUE)
parts <- sub(".*PRE (updated_date=[0-9-]+)/.*", "\\1", parts)
cli_alert_info("OpenAlex works partitions: {length(parts)}")

done <- if (file.exists(MANIFEST)) readLines(MANIFEST) else character()
todo <- setdiff(parts, done)
cli_alert_info("already harvested: {length(done)}   remaining: {length(todo)}")

con <- dbConnect(duckdb())
dbExecute(con, "INSTALL httpfs; LOAD httpfs;")
dbExecute(con, "SET preserve_insertion_order = false;")
# A 103 GB partition can push DuckDB to spill. Spill onto the staging volume, not
# onto the boot volume we just went to some trouble to protect.
dbExecute(con, glue("SET temp_directory = '{file.path(STAGE, '.duckdb_tmp')}';"))

# The Canada test, and the rubric's eight fields. `institutions` at the top level
# of the snapshot is EMPTY (a fact that cost an hour the first time); affiliations
# live at authorships[].institutions[].country_code.
extract_sql <- function(glob) glue("
  SELECT
    id, doi, title, publication_year, language, type, is_paratext, is_retracted,
    abstract_inverted_index                       AS abstract_idx,
    primary_location.source.display_name          AS venue,          -- rubric field 5
    primary_location.source.id                    AS venue_id,       -- CA-VENUE is
                                                                     -- flagged later,
                                                                     -- by joining sources
    primary_topic.id                              AS topic_id,       -- rubric field 6
    primary_topic.display_name                    AS topic,
    primary_topic.field.display_name              AS field,          -- rubric field 7
    list_distinct(flatten(list_transform(         -- rubric field 8
      authorships,
      a -> list_transform(
             list_filter(a.institutions, i -> i.country_code = 'CA'),
             i -> i.display_name)))) AS ca_institutions,
    list_transform(keywords, k -> k.display_name) AS keyword_names,
    list_distinct(list_transform(funders, f -> f.display_name)) AS funder_names,
    list_distinct(list_transform(funders, f -> f.id))           AS funder_ids,
    cited_by_count,

    -- PROVENANCE. Which route admitted this work? PROTOCOL s4 requires that every
    -- record state why it is in the frame, and the estimand is applied downstream
    -- rather than baked in here. A frame that forgets how it found something
    -- cannot be audited, which is the whole thesis.
    ({CA_AFF_SQL})     AS route_ca_aff,
    ({CA_FUND_SQL})    AS route_ca_fund,
    ({CA_VENUE_SQL})   AS route_ca_venue,
    ({about_ca_sql()}) AS route_about_ca
  FROM read_parquet('{glob}')
  WHERE publication_year BETWEEN 2000 AND 2025
    AND title IS NOT NULL
    AND (({CA_AFF_SQL}) OR ({CA_FUND_SQL}) OR ({CA_VENUE_SQL}) OR ({about_ca_sql()}))
")

# One SHARD per FILE, not one growing file.
#
# The obvious loop appends each partition to a single parquet by rewriting it
# through a UNION. That is O(n^2): by partition 400 every append rewrites a
# multi-gigabyte file, and a 7-hour job becomes a multi-day one. Parquet has no
# append. So write a small shard per input file and glob them at the end, which is
# what DuckDB wants anyway.
SHARDS <- file.path(OUT_DIR, "shards")
dir.create(SHARDS, recursive = TRUE, showWarnings = FALSE)
kept_total <- 0L

HEADROOM <- 3   # one file, plus room for DuckDB to decompress and write its shard

for (i in seq_along(todo)) {
  p  <- todo[i]
  fs <- part_files(p)
  if (!nrow(fs)) { cli_alert_warning("no parquet files listed for {p}; skipping"); next }

  # WILL THE BIGGEST FILE FIT? Ask before downloading, not after the disk is full.
  #
  # What this script used to do: `aws s3 cp --recursive` the WHOLE partition, then
  # read it. On updated_date=2026-05-21 that is a 102.9 GB download onto a volume
  # with 102 GB free. `aws s3 cp` does not check, and a full boot volume takes the
  # machine with it. Now the unit is a file (max 1.31 GB), so the check is cheap
  # and it actually passes.
  need <- max(fs$bytes) * HEADROOM
  have <- free_bytes(STAGE)
  if (need > have) {
    cli_abort(c(
      "{p}: biggest file needs {round(need/1e9, 1)} GB and {.path {STAGE}} has {round(have/1e9, 1)} GB free.",
      "i" = "Set OA_STAGE_DIR to a volume with room. NOT proceeding: a job that fills a disk is worse than one that refuses to start."
    ))
  }

  kept_p <- 0L; failed <- FALSE
  for (j in seq_len(nrow(fs))) {
    key   <- fs$key[j]
    local <- file.path(STAGE, key)
    shard <- file.path(SHARDS, glue("{p}__{key}"))

    # 1. pull ONE file
    system2("aws", c("s3", "cp",
        shQuote(glue("s3://openalex/data/parquet/works/{p}/{key}")), shQuote(local),
        "--no-sign-request", "--quiet"), stdout = FALSE, stderr = FALSE)

    # `aws s3 cp` EXITS 0 EVEN WHEN IT COPIES NOTHING (a bad key is not an error to
    # it). Checking the exit code is useless; check that the file actually landed.
    if (!file.exists(local)) {
      cli_alert_danger("{p}/{key} did not land"); failed <- TRUE; break
    }

    # 2. keep only Canada, only the rubric's fields
    n <- tryCatch({
      dbExecute(con, glue("COPY ({extract_sql(local)}) TO '{shard}' (FORMAT parquet, COMPRESSION zstd);"))
      dbGetQuery(con, glue("SELECT count(*) n FROM read_parquet('{shard}')"))$n
    }, error = function(e) {
      cli_alert_danger("extract failed on {p}/{key}: {conditionMessage(e)}"); NA_integer_
    })

    # 3. drop the raw file. THIS is what keeps peak disk at ~1.3 GB.
    unlink(local)

    if (is.na(n)) { failed <- TRUE; break }
    kept_p <- kept_p + n
  }

  # A partition enters the manifest only when EVERY file in it succeeded. A partly
  # harvested partition that claimed to be done would silently shrink the frame,
  # which is DEVIATIONS.md D2 (465 records lost with no error) exactly.
  if (failed) {
    cli_alert_danger("{p} INCOMPLETE; not recording it. It will be retried on the next run.")
    next
  }
  kept_total <- kept_total + kept_p
  cat(p, file = MANIFEST, sep = "\n", append = TRUE)
  cli_alert_success("[{i}/{length(todo)}] {p} ({nrow(fs)} files, {round(sum(fs$bytes)/1e9, 1)} GB): +{format(kept_p, big.mark=',')} Canadian (total {format(kept_total, big.mark=',')})")
}

# --- consolidate the shards into the frame ------------------------------------
cli_h1("Frame built")
all_shards <- file.path(SHARDS, "*.parquet")
dbExecute(con, glue("COPY (SELECT * FROM read_parquet('{all_shards}')) TO '{OUT_FILE}' (FORMAT parquet, COMPRESSION zstd);"))
tot <- dbGetQuery(con, glue("SELECT count(*) n, count(DISTINCT id) d FROM read_parquet('{OUT_FILE}')"))
cli_li("rows          : {format(tot$n, big.mark=',')}")
cli_li("distinct ids  : {format(tot$d, big.mark=',')}")
if (tot$n != tot$d) {
  cli_alert_danger("DUPLICATES: {tot$n - tot$d} works appear in more than one partition. Dedupe on latest.")
} else {
  cli_alert_success("Each work appears exactly once. The union of the partitions IS the corpus.")
}
cli_li("with a venue  : {dbGetQuery(con, glue(\"SELECT count(*) n FROM read_parquet('{OUT_FILE}') WHERE venue IS NOT NULL\"))$n}")
dbDisconnect(con, shutdown = TRUE)
