#!/usr/bin/env Rscript
# Validate one arm of the three-screener test against the chunk manifest.
#
#   Rscript pilot/validate_frame1k_labels.R <labels-dir>
#
# The D11 rule, enforced: an agent's claim to have produced labels counts for
# nothing; only files on disk that reconcile EXACTLY against the manifest count.
# Checks, per chunk: the file exists, parses, carries every id in the chunk
# exactly once and no id from outside it, and every tier is a legal value.
# Exit is nonzero on ANY failure, so runners can gate on it.

suppressPackageStartupMessages({ library(jsonlite); library(cli) })

args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 1) cli_abort("usage: validate_frame1k_labels.R <labels-dir>")
dir <- args[1]

manifest <- fromJSON("pilot/screening/frame1k/chunk_manifest.json")
TIERS <- c("T1", "T2", "T3", "OUT")
bad <- 0L

for (ch in sort(unique(manifest$chunk))) {
  want <- manifest$id[manifest$chunk == ch]
  f <- file.path(dir, sprintf("labels_%s.json", ch))
  problem <- NULL
  if (!file.exists(f)) problem <- "MISSING"
  else {
    x <- tryCatch(fromJSON(f), error = function(e) NULL)
    if (is.null(x) || !is.data.frame(x)) problem <- "does not parse to a frame"
    else if (anyDuplicated(x$id)) problem <- sprintf("%d duplicate ids", sum(duplicated(x$id)))
    else if (!setequal(x$id, want)) problem <- sprintf("id set mismatch: %d missing, %d alien",
                                                       length(setdiff(want, x$id)), length(setdiff(x$id, want)))
    else if (!all(x$tier %in% TIERS)) problem <- sprintf("illegal tiers: %s",
                                                         paste(unique(setdiff(x$tier, TIERS)), collapse = ", "))
  }
  if (is.null(problem)) cli_alert_success("chunk {ch}: OK ({length(want)} labels)")
  else { cli_alert_danger("chunk {ch}: {problem}"); bad <- bad + 1L }
}

if (bad > 0) { cli_alert_danger("{bad} chunk{?s} failed in {.path {dir}}"); quit(status = 1) }
cli_alert_success("arm {.path {dir}} is COMPLETE and reconciles against the manifest")
