#!/usr/bin/env Rscript
# Extend the three-model screen to a larger sample.
#
#   Rscript pilot/extend_frame_sample.R <target_total>     # e.g. 5000
#
# ------------------------------------------------------------------------------
# WHY EXTEND RATHER THAN REDRAW
# ------------------------------------------------------------------------------
# make_frame_sample.R draws each stratum by DETERMINISTIC HASH ORDER:
#
#     ORDER BY md5(id || SEED) LIMIT n
#
# That is a pseudo-random permutation of the stratum, fixed by the seed. So the
# first n rows are the original sample and rows n+1 .. m are a FRESH, DISJOINT
# draw from the same permutation, with the same selection mechanism. Growing n is
# therefore a valid extension of a probability sample, not a new experiment glued
# onto an old one: the works are exactly "the first m of each stratum", which is
# what the design would have drawn had it asked for m on day one.
#
# Works already screened keep their labels. Only NEW works are sent to the models.
# Nothing is re-run, nothing is wasted, and the result is a single stratified
# probability sample of the target size.
#
# SELECTION PROBABILITIES RISE, SO DESIGN WEIGHTS FALL. They are recomputed here
# and rewritten to sample_design.rds. An analysis that reused the old weights on
# the new sample would over-count the frame by exactly the extension factor, and
# it would not look wrong: it would look like a bigger Canada. So the superseded
# design is backed up under its size, and every finding reads the CURRENT file.
#
# ------------------------------------------------------------------------------
# ONE DIFFERENCE BETWEEN THE TRANCHES, RECORDED RATHER THAN HIDDEN
# ------------------------------------------------------------------------------
# The first 1,000 works were sent as MINIFIED JSON: one ~29,000-token line. Every
# Opus agent independently reported that its Read tool could not return a line
# that long and fell back to shelling out to a pager (DEVIATIONS.md D17). Every
# chunk from 21 on is PRETTY-PRINTED, so the payload is reachable by an agent's
# normal tools.
#
# The JSON CONTENT is identical; only whitespace differs. But it is a difference
# between parts of one sample, so it is recorded, and finding 22 TESTS whether the
# tranches differ before pooling them (Mantel-Haenszel, conditioning on stratum).

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(dplyr); library(jsonlite); library(glue); library(cli)
})

args   <- commandArgs(trailingOnly = TRUE)
TARGET <- if (length(args)) as.integer(args[1]) else 2000L

SEED    <- 20260712L
FRAME   <- "data/frame/canadian_works.parquet"
OUT     <- "pilot/screening/frame1k"     # same directory: it is ONE sample
CHUNKS  <- file.path(OUT, "chunks")
N_CHUNK <- 50L
BASE_N  <- 1000L                         # the stratum sizes below sum to this

if (is.na(TARGET) || TARGET %% BASE_N != 0L)
  cli_abort("target must be a multiple of {BASE_N}; got {args[1]}. \\
             The strata are defined at {BASE_N} and scaled by an integer, so a \\
             non-multiple would silently change the stratum PROPORTIONS, which is a \\
             different design, not a bigger one.")
MULT <- TARGET %/% BASE_N

# The strata, verbatim from make_frame_sample.R. Kept in sync by construction: if
# these drift, the extension is drawn from a different design than the original
# and the tranches cannot be pooled.
STRATA <- list(
  aff_core   = list(n = 400L, sql = "route_ca_aff AND language = 'en' AND NOT route_about_ca"),
  about_only = list(n = 200L, sql = "route_about_ca AND NOT route_ca_aff AND NOT route_ca_fund AND NOT route_ca_venue"),
  venue_new  = list(n = 150L, sql = "route_ca_venue AND NOT route_ca_aff"),
  fund_new   = list(n = 100L, sql = "route_ca_fund AND NOT route_ca_aff"),
  french     = list(n = 150L, sql = "language = 'fr'")
)
stopifnot("strata must sum to BASE_N" = sum(vapply(STRATA, \(s) s$n, integer(1))) == BASE_N)

PRECEDENCE <- c("french", "about_only", "venue_new", "fund_new", "aff_core")

excl <- character(0)
for (s in PRECEDENCE) {
  STRATA[[s]]$sql_excl <- if (length(excl))
    glue("({STRATA[[s]]$sql}) AND NOT ({paste(excl, collapse = ') AND NOT (')})") else
    glue("({STRATA[[s]]$sql})")
  excl <- c(excl, STRATA[[s]]$sql)
}

con <- dbConnect(duckdb())
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}')
                     WHERE NOT is_paratext AND length(title) > 10"))

old_design <- readRDS(file.path(OUT, "sample_design.rds"))
old_ids    <- old_design$id
N_OLD      <- length(old_ids)
if (TARGET <= N_OLD)
  cli_abort("the sample is already {N_OLD} works; target {TARGET} would SHRINK it. \\
             Dropping works from a probability sample after their labels are known \\
             does not give a smaller sample, it gives a selected one.")
cli_alert_info("already screened: {N_OLD} works; extending to {TARGET} ({MULT}x the base design)")

cli_h1("Extending each stratum to {MULT}x")
draw <- lapply(PRECEDENCE, function(s) {
  st  <- STRATA[[s]]
  n2  <- st$n * MULT
  N   <- dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE {st$sql_excl}"))$n
  if (n2 > N)
    cli_abort("stratum {s} holds only {N} works in the frame; cannot draw {n2}. \\
               The design cannot be scaled past the stratum it samples.")
  d <- dbGetQuery(con, glue(
    "SELECT id, title, abstract_idx, publication_year AS year, language AS lang, type,
            venue, topic, field, ca_institutions, funder_names
     FROM f WHERE {st$sql_excl}
     ORDER BY md5(id || '{SEED}') LIMIT {n2}"))
  stopifnot("stratum came back short" = nrow(d) == n2)
  d$stratum <- s; d$stratum_N <- N; d$weight <- N / n2   # WEIGHTS FALL
  cli_li("{s}: {st$n} -> {n2} of {format(N, big.mark=',')}  (weight {round(N/st$n, 1)} -> {round(N/n2, 1)})")
  d
}) |> bind_rows()

draw$short <- sub(".*/", "", draw$id)
stopifnot(nrow(draw) == TARGET, !anyDuplicated(draw$short))

# THE ALREADY-SCREENED WORKS MUST BE A SUBSET OF THE EXTENDED DRAW.
#
# This is the assumption the whole extension rests on: that md5(id || SEED) gives
# the same permutation today as it did on the first draw, so that "the first 2n"
# strictly contains "the first n". If DuckDB's md5, the seed, the frame file, or a
# stratum predicate had changed, the prefix property would break, the old labels
# would belong to works no longer in the sample, and pooling them would be
# silently invalid. So it is CHECKED, not assumed.
missing_old <- setdiff(old_ids, draw$short)
if (length(missing_old))
  cli_abort(c(
    "{length(missing_old)} previously screened work{?s} {?is/are} NOT in the extended draw.",
    "x" = "The hash order is not stable, so the tranches cannot be pooled and the old labels cannot be reused.",
    "i" = "First missing: {paste(head(missing_old, 3), collapse = ', ')}"
  ))
cli_alert_success("all {N_OLD} previously screened works are in the extended sample: the tranches pool")

new <- draw |> filter(!short %in% old_ids)
cli_alert_info("NEW works to screen: {nrow(new)}")

# --- abstracts ------------------------------------------------------------------
deinvert <- function(idx_json) {
  if (is.na(idx_json) || !nzchar(idx_json)) return("")
  idx <- tryCatch(fromJSON(idx_json), error = function(e) NULL)
  if (is.null(idx) || !length(idx)) return("")
  pos <- unlist(idx, use.names = FALSE)
  words <- rep(names(idx), lengths(idx))
  paste(words[order(pos)], collapse = " ")
}
new$abstract <- vapply(new$abstract_idx, deinvert, character(1))

# --- the design, for ALL of it; the superseded one is kept under its size --------
saveRDS(old_design, file.path(OUT, glue("sample_design_{N_OLD}_backup.rds")))
saveRDS(draw |> transmute(id = short, stratum, stratum_N, weight),
        file.path(OUT, "sample_design.rds"))
cli_alert_success("sample_design.rds rewritten for {TARGET} works (weights recomputed; \\
                   the {N_OLD}-work design is backed up, not overwritten)")

# --- new chunks, randomized, manifest-logged ------------------------------------
#
# Chunk numbers continue from the existing manifest rather than restarting, so a
# chunk id names one set of works FOREVER. Re-using chunk 07 for a different set
# would make every label file already on disk ambiguous about what it labelled.
old_manifest <- fromJSON(file.path(OUT, "chunk_manifest.json"))
start <- max(as.integer(old_manifest$chunk)) + 1L

set.seed(SEED + 1L)
new <- new[sample(nrow(new)), ]
payload <- new |>
  transmute(id = short, title, abstract, year, lang, type, venue, topic, field,
            ca_institutions = lapply(ca_institutions, \(x) if (is.null(x)) list() else x),
            funders = lapply(funder_names, \(x) if (is.null(x)) list() else x))

chunk_of <- start + (seq_len(nrow(payload)) - 1L) %/% N_CHUNK
manifest_new <- data.frame(chunk = sprintf("%02d", chunk_of), id = payload$id)

write_json(bind_rows(old_manifest, manifest_new),
           file.path(OUT, "chunk_manifest.json"), auto_unbox = TRUE, pretty = TRUE)

# PRETTY-PRINTED. See the header: a payload an agent cannot read without breaking
# its own tool constraints is a harness bug (D17).
for (ch in unique(manifest_new$chunk)) {
  write_json(payload[manifest_new$chunk == ch, ],
             file.path(CHUNKS, glue("chunk_{ch}.json")), auto_unbox = TRUE, pretty = TRUE)
}
cli_alert_success("wrote chunks {min(chunk_of)}..{max(chunk_of)} \\
                   ({length(unique(manifest_new$chunk))} chunks); manifest now covers {TARGET} works")
dbDisconnect(con, shutdown = TRUE)
