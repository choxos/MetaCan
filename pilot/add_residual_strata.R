#!/usr/bin/env Rscript
# Close the zero-probability hole: draw and screen the two strata the design could not reach.
#
# ------------------------------------------------------------------------------
# WHAT THIS REPAIRS
# ------------------------------------------------------------------------------
# The five original strata left 549,370 works (12.9% of the sampling frame) with an
# inclusion probability of exactly ZERO. See R/strata.R for the two defects that
# produced it, DEVIATIONS.md D22 for the record, and finding 26 for the measurement.
#
# A zero-probability work is not underweighted. It is UNREACHABLE. No reweighting
# recovers it, and no estimator is defined over it. The only repair is to give it a
# nonzero probability of selection, which means DRAWING IT AND SCREENING IT. So that
# is what this does.
#
# ------------------------------------------------------------------------------
# WHY THIS ADDS STRATA INSTEAD OF FIXING THE OLD ONES
# ------------------------------------------------------------------------------
# 5,000 works were already drawn from the five original strata by hash order, and a
# hash-order draw is a probability sample OF THE SET IT WAS DRAWN FROM. Widen a
# stratum's definition and "the first n by hash order" becomes a DIFFERENT n works:
# the 5,000 labels already in hand would no longer correspond to the design that
# selected them, and the extension property that lets the tranches pool would break.
#
# So the five predicates are kept byte-for-byte and the hole is closed from OUTSIDE,
# with strata defined as their exact NULL-safe complement (`IS NOT TRUE`). Nothing
# already screened is invalidated, re-drawn, or wasted, and the seven strata now
# partition the frame by CONSTRUCTION rather than by luck.
#
# ------------------------------------------------------------------------------
# WHAT THIS DOES NOT DO
# ------------------------------------------------------------------------------
# It does not retro-fix the numbers already published under the broken design. Those
# were estimates of a 3.7M subpopulation reported under the frame's name, and saying
# so is the finding. Once these 600 works are screened, every design-weighted number
# is RE-DERIVED against the seven-stratum design, and the difference between the two
# is reported rather than quietly absorbed.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(dplyr); library(jsonlite); library(glue); library(cli)
})
source("R/strata.R")

SEED    <- 20260712L
FRAME   <- "data/frame/canadian_works.parquet"
OUT     <- "pilot/screening/frame1k"
CHUNKS  <- file.path(OUT, "chunks")
N_CHUNK <- 50L

con <- dbConnect(duckdb())
on.exit(dbDisconnect(con, shutdown = TRUE), add = TRUE)
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}') WHERE {SAMPLING_FRAME_WHERE}"))

old_design <- readRDS(file.path(OUT, "sample_design.rds"))
N_OLD <- nrow(old_design)
if (any(names(STRATA_V2_RESIDUAL) %in% old_design$stratum))
  cli_abort("the residual strata are already in sample_design.rds; this script is not idempotent by design, \\
             because drawing them twice would double their weight")
cli_alert_info("existing sample: {N_OLD} works across {n_distinct(old_design$stratum)} strata")

cli_h1("Drawing the strata the design could not reach")
draw <- lapply(names(STRATA_V2_RESIDUAL), function(s) {
  st <- STRATA_V2_RESIDUAL[[s]]
  N  <- dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE {st$sql}"))$n
  if (st$n > N) cli_abort("stratum {s} holds {N} works; cannot draw {st$n}")
  d <- dbGetQuery(con, glue(
    "SELECT id, title, abstract_idx, publication_year AS year, language AS lang, type,
            venue, topic, field, ca_institutions, funder_names
     FROM f WHERE {st$sql}
     ORDER BY md5(id || '{SEED}') LIMIT {st$n}"))
  stopifnot("stratum came back short" = nrow(d) == st$n)
  d$stratum <- s; d$stratum_N <- N; d$weight <- N / st$n
  cli_li("{s}: {st$n} of {format(N, big.mark=',')}  (weight {round(N/st$n, 1)})")
  d
}) |> bind_rows()

draw$short <- sub(".*/", "", draw$id)
stopifnot(!anyDuplicated(draw$short))

# These works must be NEW. If any of them is already in the sample, the residual
# strata are not the complement of the originals and the partition is a lie.
clash <- intersect(draw$short, old_design$id)
if (length(clash))
  cli_abort(c("{length(clash)} of the residual works are ALREADY in the sample.",
              "x" = "The residual strata are not disjoint from the original five, so the seven do not partition \\
                     the frame and these works would carry two different weights."))
cli_alert_success("all {nrow(draw)} residual works are new: the seven strata are disjoint in the DATA, not just in the SQL")

# --- abstracts ------------------------------------------------------------------
deinvert <- function(j) {
  if (is.na(j) || !nzchar(j)) return("")
  ix <- tryCatch(fromJSON(j), error = function(e) NULL)
  if (is.null(ix) || !length(ix)) return("")
  w <- rep(names(ix), lengths(ix)); paste(w[order(unlist(ix, use.names = FALSE))], collapse = " ")
}
draw$abstract <- vapply(draw$abstract_idx, deinvert, character(1))

# --- design ---------------------------------------------------------------------
saveRDS(old_design, file.path(OUT, glue("sample_design_{N_OLD}_prepartition_backup.rds")))
new_design <- bind_rows(old_design,
                        draw |> transmute(id = short, stratum, stratum_N, weight))
saveRDS(new_design, file.path(OUT, "sample_design.rds"))
cli_alert_success("sample_design.rds now covers {nrow(new_design)} works across {n_distinct(new_design$stratum)} strata \\
                   (the {N_OLD}-work design is backed up, not overwritten)")

# --- chunks ---------------------------------------------------------------------
old_manifest <- fromJSON(file.path(OUT, "chunk_manifest.json"))
start <- max(as.integer(old_manifest$chunk)) + 1L

set.seed(SEED + 2L)
draw <- draw[sample(nrow(draw)), ]
payload <- draw |>
  transmute(id = short, title, abstract, year, lang, type, venue, topic, field,
            ca_institutions = lapply(ca_institutions, \(x) if (is.null(x)) list() else x),
            funders = lapply(funder_names, \(x) if (is.null(x)) list() else x))

chunk_of <- start + (seq_len(nrow(payload)) - 1L) %/% N_CHUNK
manifest_new <- data.frame(chunk = sprintf("%02d", chunk_of), id = payload$id)
write_json(bind_rows(old_manifest, manifest_new),
           file.path(OUT, "chunk_manifest.json"), auto_unbox = TRUE, pretty = TRUE)

for (ch in unique(manifest_new$chunk)) {
  write_json(payload[manifest_new$chunk == ch, ],
             file.path(CHUNKS, glue("chunk_{ch}.json")), auto_unbox = TRUE, pretty = TRUE)
}
cli_alert_success("wrote chunks {min(chunk_of)}..{max(chunk_of)}; the manifest now covers {nrow(new_design)} works")
cli_alert_info("next: Rscript pilot/build_frame1k_prompts.R, then screen the new chunks in all three arms")
