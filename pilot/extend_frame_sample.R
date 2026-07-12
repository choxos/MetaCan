#!/usr/bin/env Rscript
# Extend the three-model screen from 1,000 works to 2,000.
#
# ------------------------------------------------------------------------------
# WHY EXTEND RATHER THAN REDRAW
# ------------------------------------------------------------------------------
# make_frame_sample.R draws each stratum by DETERMINISTIC HASH ORDER:
#
#     ORDER BY md5(id || SEED) LIMIT n
#
# That is a pseudo-random permutation of the stratum, fixed by the seed. So the
# first n rows are the original sample and rows n+1 .. 2n are a FRESH, DISJOINT
# draw from the same permutation, with the same selection mechanism. Doubling n
# is therefore a valid extension of a probability sample, not a new experiment
# glued onto an old one: the 2,000 works are exactly "the first 2n of each
# stratum", which is what the design would have drawn had it asked for 2,000 on
# day one.
#
# The 1,000 works already screened keep their labels. Only the 1,000 NEW works
# are sent to the models. Nothing is re-run, nothing is wasted, and the combined
# sample is a single stratified probability sample of size 2,000.
#
# SELECTION PROBABILITIES DOUBLE, SO DESIGN WEIGHTS HALVE. They are recomputed
# here and written to sample_design.rds; any analysis that reused the old weights
# on the new sample would over-count the frame by exactly 2x.
#
# ------------------------------------------------------------------------------
# ONE DIFFERENCE BETWEEN THE HALVES, RECORDED RATHER THAN HIDDEN
# ------------------------------------------------------------------------------
# The first 1,000 works were sent as MINIFIED JSON: one ~29,000-token line. Every
# Opus agent independently reported that its Read tool could not return a line
# that long and fell back to shelling out to a pager (DEVIATIONS.md D17). The
# chunks are now PRETTY-PRINTED, so the payload is reachable by an agent's normal
# tools.
#
# The JSON CONTENT is identical; only whitespace differs. But it is a difference
# between the two halves of one sample, so it is recorded, and the analysis tests
# whether the halves differ before pooling them.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(dplyr); library(jsonlite); library(glue); library(cli)
})

SEED    <- 20260712L
FRAME   <- "data/frame/canadian_works.parquet"
OUT     <- "pilot/screening/frame1k"     # same directory: it is ONE sample
CHUNKS  <- file.path(OUT, "chunks")
N_CHUNK <- 50L
MULT    <- 2L                            # 1,000 -> 2,000

# The strata, verbatim from make_frame_sample.R. Kept in sync by construction:
# if these drift, the extension is drawn from a different design than the original
# and the two halves cannot be pooled.
STRATA <- list(
  aff_core   = list(n = 400L, sql = "route_ca_aff AND language = 'en' AND NOT route_about_ca"),
  about_only = list(n = 200L, sql = "route_about_ca AND NOT route_ca_aff AND NOT route_ca_fund AND NOT route_ca_venue"),
  venue_new  = list(n = 150L, sql = "route_ca_venue AND NOT route_ca_aff"),
  fund_new   = list(n = 100L, sql = "route_ca_fund AND NOT route_ca_aff"),
  french     = list(n = 150L, sql = "language = 'fr'")
)
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

old_ids <- readRDS(file.path(OUT, "sample_design.rds"))$id |> sub(".*/", "", x = _)
cli_alert_info("already screened: {length(old_ids)} works")

cli_h1("Extending each stratum to {MULT}x")
draw <- lapply(PRECEDENCE, function(s) {
  st  <- STRATA[[s]]
  n2  <- st$n * MULT
  N   <- dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE {st$sql_excl}"))$n
  d   <- dbGetQuery(con, glue(
    "SELECT id, title, abstract_idx, publication_year AS year, language AS lang, type,
            venue, topic, field, ca_institutions, funder_names
     FROM f WHERE {st$sql_excl}
     ORDER BY md5(id || '{SEED}') LIMIT {n2}"))
  stopifnot("stratum came back short" = nrow(d) == n2)
  d$stratum <- s; d$stratum_N <- N; d$weight <- N / n2   # WEIGHTS HALVE
  cli_li("{s}: {st$n} -> {n2} of {format(N, big.mark=',')}  (weight {round(N/st$n, 1)} -> {round(N/n2, 1)})")
  d
}) |> bind_rows()

draw$short <- sub(".*/", "", draw$id)
stopifnot(nrow(draw) == 2000L, !anyDuplicated(draw$short))

# The original 1,000 must be a SUBSET of the new 2,000. If the hash order were not
# stable this would fail, and pooling the halves would be invalid.
missing_old <- setdiff(old_ids, draw$short)
if (length(missing_old))
  cli_abort("{length(missing_old)} previously screened works are NOT in the extended draw. \\
             The hash order is not stable, so the halves cannot be pooled.")
cli_alert_success("all {length(old_ids)} original works are in the extended sample: the halves pool")

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

# --- the design, for ALL 2,000 --------------------------------------------------
saveRDS(draw |> transmute(id = short, stratum, stratum_N, weight),
        file.path(OUT, "sample_design.rds"))
cli_alert_success("sample_design.rds rewritten for 2,000 works (weights halved)")

# --- chunks 21..40, randomized, manifest-logged ---------------------------------
set.seed(SEED + 1L)
new <- new[sample(nrow(new)), ]
payload <- new |>
  transmute(id = short, title, abstract, year, lang, type, venue, topic, field,
            ca_institutions = lapply(ca_institutions, \(x) if (is.null(x)) list() else x),
            funders = lapply(funder_names, \(x) if (is.null(x)) list() else x))

start <- 21L
chunk_of <- start + (seq_len(nrow(payload)) - 1L) %/% N_CHUNK
manifest_new <- data.frame(chunk = sprintf("%02d", chunk_of), id = payload$id)

old_manifest <- fromJSON(file.path(OUT, "chunk_manifest.json"))
write_json(bind_rows(old_manifest, manifest_new),
           file.path(OUT, "chunk_manifest.json"), auto_unbox = TRUE, pretty = TRUE)

# PRETTY-PRINTED. See the header: a payload an agent cannot read without breaking
# its tool constraints is a harness bug (D17).
for (ch in unique(manifest_new$chunk)) {
  write_json(payload[manifest_new$chunk == ch, ],
             file.path(CHUNKS, glue("chunk_{ch}.json")), auto_unbox = TRUE, pretty = TRUE)
}
cli_alert_success("wrote chunks {min(chunk_of)}..{max(chunk_of)} ({length(unique(manifest_new$chunk))} chunks); manifest now covers 2,000 works")
dbDisconnect(con, shutdown = TRUE)
