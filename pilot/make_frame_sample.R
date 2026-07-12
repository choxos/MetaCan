#!/usr/bin/env Rscript
# Draw the three-screener test sample from the REAL frame.
#
# 1,000 works from data/frame/canadian_works.parquet (all 482 partitions; the
# pilot's single-partition shortcut is dead), stratified with KNOWN selection
# probabilities, so every design-weight tool downstream applies unchanged.
#
# WHAT THIS ENCODES FROM THE PILOT'S FAILURES:
#   - D1  : the payload is the rubric's full eight fields. Venue included.
#   - D11 : chunks are built HERE, agents never author files this script trusts;
#           a separate validator checks every returned label against these chunks.
#   - 16  : chunk order is randomized with a seed and written to a MANIFEST, so
#           "which agent saw what" is recorded at build time, not asserted later.
#   - The models NEVER see stratum, weight, or route flags. Blinding: the design
#           lives in sample_design.rds; the chunks carry only the rubric's fields.
#
# STRATA. The point of the test is the frame's NEW territory: the 1.57M works an
# affiliation-only frame would have missed. Affiliation-only gets 400; each other
# route gets a floor; French is oversampled because the pilot could not see it.
#   aff_core   400  CA-AFF, English, not also about-CA
#   about_only 200  in frame ONLY because Canada appears in the text
#   venue_new  150  Canadian venue, no Canadian affiliation
#   fund_new   100  Canadian funder, no Canadian affiliation
#   french     150  language = fr, any route
# Selection probability = n_stratum / N_stratum; weight = 1/probability.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(dplyr); library(jsonlite); library(glue); library(cli)
})

SEED   <- 20260712L
FRAME  <- "data/frame/canadian_works.parquet"
OUT    <- "pilot/screening/frame1k"
CHUNKS <- file.path(OUT, "chunks")
N_CHUNK <- 50L
dir.create(CHUNKS, recursive = TRUE, showWarnings = FALSE)

con <- dbConnect(duckdb())
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}')
                     WHERE NOT is_paratext AND length(title) > 10"))

# One stratum definition, used both to COUNT (for the weights) and to DRAW.
STRATA <- list(
  aff_core   = list(n = 400L, sql = "route_ca_aff AND language = 'en' AND NOT route_about_ca"),
  about_only = list(n = 200L, sql = "route_about_ca AND NOT route_ca_aff AND NOT route_ca_fund AND NOT route_ca_venue"),
  venue_new  = list(n = 150L, sql = "route_ca_venue AND NOT route_ca_aff"),
  fund_new   = list(n = 100L, sql = "route_ca_fund AND NOT route_ca_aff"),
  french     = list(n = 150L, sql = "language = 'fr'")
)
# Strata as written OVERLAP (a French CA-AFF work matches aff_core's complement
# and french). Make them exclusive by precedence, french first, so each work has
# exactly one selection probability: the first stratum it matches owns it.
PRECEDENCE <- c("french", "about_only", "venue_new", "fund_new", "aff_core")
excl <- character(0)
for (s in PRECEDENCE) {
  STRATA[[s]]$sql_excl <- if (length(excl))
    glue("({STRATA[[s]]$sql}) AND NOT ({paste(excl, collapse = ') AND NOT (')})") else
    glue("({STRATA[[s]]$sql})")
  excl <- c(excl, STRATA[[s]]$sql)
}

cli_h1("Drawing 1,000 works from the {format(dbGetQuery(con, 'SELECT count(*) n FROM f')$n, big.mark=',')}-work frame")
draw <- lapply(PRECEDENCE, function(s) {
  st <- STRATA[[s]]
  N  <- dbGetQuery(con, glue("SELECT count(*) n FROM f WHERE {st$sql_excl}"))$n
  # NOT `USING SAMPLE`: DuckDB pushes that down to the scan, BEFORE the WHERE,
  # so `WHERE language='fr' USING SAMPLE 150` returned 8 rows (150 sampled from
  # the whole frame, THEN filtered: 5.5% of 150). Order by a keyed hash instead:
  # deterministic, uniform within the stratum, and stable across DuckDB versions.
  d  <- dbGetQuery(con, glue(
    "SELECT id, title, abstract_idx, publication_year AS year, language AS lang, type,
            venue, topic, field, ca_institutions, funder_names
     FROM f WHERE {st$sql_excl}
     ORDER BY md5(id || '{SEED}') LIMIT {st$n}"))
  cli_li("{s}: requested {st$n}, returned {nrow(d)}, of {format(N, big.mark=',')} (weight {round(N / st$n, 1)})")
  if (nrow(d) != st$n) cli_abort("stratum {s} returned {nrow(d)} rows, wanted {st$n}")
  d$stratum <- s; d$stratum_N <- N; d$weight <- N / st$n
  d
}) |> bind_rows()
dbDisconnect(con, shutdown = TRUE)
stopifnot(nrow(draw) == 1000L, !anyDuplicated(draw$id))

# --- abstracts: de-invert the index into text ----------------------------------
deinvert <- function(idx_json) {
  if (is.na(idx_json) || !nzchar(idx_json)) return("")
  idx <- tryCatch(fromJSON(idx_json), error = function(e) NULL)
  if (is.null(idx) || !length(idx)) return("")
  pos <- unlist(idx, use.names = FALSE)
  words <- rep(names(idx), lengths(idx))
  paste(words[order(pos)], collapse = " ")
}
draw$abstract <- vapply(draw$abstract_idx, deinvert, character(1))
draw$abstract_idx <- NULL
# No trim. The rubric names fields, not lengths, and the finding-16 sampler's
# 1,200-character trim is exactly what made the cost model price the wrong
# payload. 1,000 works can afford their own abstracts.

# --- the DESIGN (weights, strata) stays out of the chunks -----------------------
saveRDS(draw |> select(id, stratum, stratum_N, weight),
        file.path(OUT, "sample_design.rds"))

# --- chunks: randomized order, seeded, manifest written at build time -----------
set.seed(SEED)
draw <- draw[sample(nrow(draw)), ]
payload <- draw |>
  transmute(id = sub(".*/", "", id), title, abstract, year, lang, type,
            venue, topic, field,
            ca_institutions = lapply(ca_institutions, \(x) if (is.null(x)) list() else x),
            funders = lapply(funder_names, \(x) if (is.null(x)) list() else x))
chunk_of <- rep(seq_len(ceiling(nrow(payload) / N_CHUNK)), each = N_CHUNK)[seq_len(nrow(payload))]
manifest <- data.frame(chunk = sprintf("%02d", chunk_of), id = payload$id)
write_json(manifest, file.path(OUT, "chunk_manifest.json"), auto_unbox = TRUE, pretty = TRUE)
# PRETTY-PRINTED, and that is not cosmetic.
#
# The first version wrote each chunk as ONE LINE of ~29,000 tokens. Every Opus
# agent independently reported that the Read tool could not return it (it exceeds
# the per-call token cap and pages by LINE, so no offset helps), and each fell
# back to shelling out to a pager just to see the records it was told to classify.
#
# Five agents, five identical unplanned deviations, all self-reported. A payload
# an agent cannot read without breaking its tool constraints is a HARNESS BUG, and
# had they not reported it I would have been comparing models on a task whose
# input was reachable only by side channel.
for (ch in unique(manifest$chunk)) {
  write_json(payload[manifest$chunk == ch, ],
             file.path(CHUNKS, glue("chunk_{ch}.json")), auto_unbox = TRUE, pretty = TRUE)
}
cli_alert_success("{length(unique(manifest$chunk))} chunks of {N_CHUNK} in {.path {CHUNKS}}; design in sample_design.rds; manifest written")
cli_li("payload bytes total: {format(sum(file.size(list.files(CHUNKS, full.names=TRUE))), big.mark=',')}")
