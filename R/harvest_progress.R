#!/usr/bin/env Rscript
# One-shot harvest status: `make harvest-status`.
#
# Reads only artifacts the harvester already writes (the manifest, the shard
# files, the log), so it never touches the running job. Progress is reported in
# BYTES, not partitions: the partitions are wildly unequal (102.9 GB to under a
# megabyte), so "260 of 482 partitions" once read as 54% done when 57% of the
# bytes were still to come. Partition count is a lie; bytes are the truth.

suppressPackageStartupMessages({ library(cli); library(glue) })

MANIFEST <- "data/frame/partitions_done.txt"
SHARDS   <- "data/frame/shards"
LISTING  <- "data/frame/s3_listing.txt"

# --- the S3 listing, cached ----------------------------------------------------
# The snapshot is static (that is the whole point of pinning it), so the listing
# is fetched once and reused; delete the cache file to force a refresh.
if (!file.exists(LISTING)) {
  cli_alert_info("fetching the S3 listing (one-time, ~10s)")
  ls_out <- system2("aws", c("s3", "ls", "s3://openalex/data/parquet/works/",
                             "--recursive", "--no-sign-request"), stdout = TRUE)
  writeLines(ls_out, LISTING)
}
x <- grep("updated_date=.*\\.parquet$", readLines(LISTING), value = TRUE)
files <- data.frame(
  part  = sub(".*(updated_date=[0-9-]+)/.*", "\\1", x),
  key   = sub(".*/(part_[^/ ]+\\.parquet)$", "\\1", x),
  bytes = as.numeric(sub("^\\s*\\S+\\s+\\S+\\s+(\\d+)\\s+.*$", "\\1", x))
)
part_bytes <- tapply(files$bytes, files$part, sum)

done <- if (file.exists(MANIFEST)) readLines(MANIFEST) else character()
all_parts <- names(part_bytes)
todo <- setdiff(all_parts, done)

gb <- function(b) sprintf("%.1f GB", b / 1e9)
done_b  <- sum(part_bytes[done], na.rm = TRUE)
total_b <- sum(part_bytes)

cli_h1("OpenAlex frame harvest")
cli_li("partitions : {length(done)} / {length(all_parts)}")
cli_li("bytes      : {gb(done_b)} / {gb(total_b)}  ({sprintf('%.1f', 100 * done_b / total_b)}%)")

# --- the partition in flight, from its shards ----------------------------------
# New-format shards are named `<partition>__<file>.parquet`, one per input file,
# so the shard directory shows file-level progress inside a partition the log
# has not mentioned yet.
sh <- list.files(SHARDS, pattern = "__.*\\.parquet$")
if (length(sh)) {
  sp <- sub("__.*$", "", sh)
  inflight <- setdiff(unique(sp), done)
  for (p in inflight) {
    exp_f <- files[files$part == p, ]
    got   <- sub("^.*__", "", sh[sp == p])
    done_f <- sum(exp_f$key %in% got)
    cli_li("in flight  : {p}: file {done_f} / {nrow(exp_f)} ({gb(sum(exp_f$bytes[exp_f$key %in% got]))} of {gb(sum(exp_f$bytes))})")
  }
}

# --- works kept, from the log's running total ----------------------------------
lg <- tryCatch(readLines("logs/harvest.log", warn = FALSE), error = function(e) character())
tot <- regmatches(lg, regexpr("total [0-9,]+", lg))
if (length(tot)) cli_li("works kept : {sub('total ', '', tail(tot, 1))} Canadian (this run; earlier runs add to it)")

# --- throughput and ETA, from shard mtimes -------------------------------------
# Each new-format shard corresponds to one S3 input file of known size, and its
# mtime says when that file finished. Bytes over the last half hour give the
# real current rate, network weather included.
if (length(sh)) {
  info <- file.info(file.path(SHARDS, sh))
  key_of <- sub("^.*__", "", sh)
  sz <- files$bytes[match(paste(sp, key_of), paste(files$part, files$key))]
  recent <- difftime(Sys.time(), info$mtime, units = "secs") < 1800
  if (sum(recent, na.rm = TRUE) >= 2) {
    span <- as.numeric(difftime(max(info$mtime[recent]), min(info$mtime[recent]), units = "secs"))
    if (span > 60) {
      rate <- sum(sz[recent], na.rm = TRUE) / span
      left <- total_b - done_b
      cli_li("rate       : {sprintf('%.0f', rate / 1e6)} MB/s (last 30 min)")
      cli_li("ETA        : ~{sprintf('%.1f', left / rate / 3600)} h for the remaining {gb(left)}")
    }
  }
}

alive <- length(suppressWarnings(system2("pgrep", c("-f", "harvest_frame"), stdout = TRUE))) > 0
if (alive) cli_alert_success("harvester is running") else
  cli_alert_danger("harvester is NOT running; resume with: nohup Rscript R/harvest_frame.R >> logs/harvest.log 2>&1 &")
