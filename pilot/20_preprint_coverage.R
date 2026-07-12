#!/usr/bin/env Rscript
# Finding 20: the preprint coverage claim, measured instead of assumed.
#
# ------------------------------------------------------------------------------
# WHY THIS IS NOT A ONE-LINE VICTORY LAP
# ------------------------------------------------------------------------------
# The frame carries 156,086 preprints, and the obvious move is to write "OpenAlex
# covers the preprint servers, so no separate ingest is needed" and move on.
#
# That sentence is a COVERAGE CLAIM. This project's entire thesis is that coverage
# claims must be measured against an external criterion, because the pipeline
# cannot see what it never retrieved. Asserting preprint coverage from inside
# OpenAlex is exactly the circularity finding 12 exists to attack: it is the topic
# route certifying its own recall.
#
# So the external criterion is the SERVERS THEMSELVES. bioRxiv and medRxiv publish
# a public details API that enumerates their own corpus, owing nothing to OpenAlex.
# Sample from it, look each DOI up in the frame, and measure what OpenAlex missed.
#
# ------------------------------------------------------------------------------
# WHAT THIS CAN AND CANNOT ESTABLISH
# ------------------------------------------------------------------------------
# The bioRxiv API does not expose author country, so a random sample of the server
# is mostly non-Canadian, and a Canadian preprint absent from the frame could be
# absent because OpenAlex missed it OR because it is not Canadian. The clean
# quantity is therefore NOT "Canadian preprint recall" but:
#
#   Of preprints the server says exist, what share does OpenAlex INDEX AT ALL?
#
# A preprint OpenAlex does not index cannot enter any frame by any route, so this
# is an upper bound on preprint coverage, and it is the number the claim needs.
# Canadian-ness is then checked on the ones OpenAlex DOES have.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(httr2); library(jsonlite)
  library(dplyr); library(purrr); library(cli); library(glue)
})
source("R/findings.R")

FRAME  <- "data/frame/canadian_works.parquet"
RAW    <- "pilot/raw/preprints"
N_PAGE <- 12L      # 100 preprints per page
OFFLINE <- "--offline" %in% commandArgs(trailingOnly = TRUE)
dir.create(RAW, recursive = TRUE, showWarnings = FALSE)

# --- 1. enumerate from the SERVERS, not from OpenAlex ---------------------------
fetch_server <- function(server) {
  f <- file.path(RAW, glue("{server}.json"))
  if (OFFLINE || file.exists(f)) {
    if (!file.exists(f)) cli_abort("offline, and {.path {f}} is not archived")
    return(fromJSON(f))
  }
  # The details endpoint pages by cursor, 100 records per call.
  out <- map_dfr(seq_len(N_PAGE), function(i) {
    cur <- (i - 1L) * 100L
    r <- tryCatch(
      request(glue("https://api.biorxiv.org/details/{server}/2023-01-01/2025-12-31/{cur}")) |>
        req_timeout(60) |> req_perform() |> resp_body_json(simplifyVector = TRUE),
      error = function(e) NULL)
    Sys.sleep(1)
    if (is.null(r) || is.null(r$collection) || !length(r$collection)) return(NULL)
    as.data.frame(r$collection)[, c("doi", "title", "date", "category")]
  })
  write_json(out, f, auto_unbox = TRUE)
  out
}

servers <- c("biorxiv", "medrxiv")
pp <- map_dfr(servers, \(s) fetch_server(s) |> mutate(server = s)) |>
  distinct(doi, .keep_all = TRUE) |>
  mutate(doi = tolower(doi))
cli_h1("Preprint coverage, measured against the servers' own API")
cli_li("preprints enumerated from bioRxiv/medRxiv: {format(nrow(pp), big.mark=',')}")

# --- 2. ask OpenAlex (the WHOLE index, not the frame) whether it has them --------
# The frame is Canada-only, so a preprint absent from the FRAME may simply be
# non-Canadian. The coverage question is about the INDEX, so it goes to the API.
lookup <- function(dois) {
  f <- file.path(RAW, "openalex_lookup.json")
  if (OFFLINE || file.exists(f)) {
    if (!file.exists(f)) cli_abort("offline, and {.path {f}} is not archived")
    return(fromJSON(f))
  }
  found <- map_dfr(split(dois, ceiling(seq_along(dois) / 40)), function(batch) {
    filt <- paste0("doi:", paste(batch, collapse = "|"))
    r <- tryCatch(
      request("https://api.openalex.org/works") |>
        req_url_query(filter = filt, per_page = 100, mailto = "ahmad.pub@gmail.com") |>
        req_timeout(60) |> req_perform() |> resp_body_json(simplifyVector = TRUE),
      error = function(e) NULL)
    Sys.sleep(0.2)
    if (is.null(r) || !length(r$results)) return(NULL)
    data.frame(
      doi = tolower(sub("https://doi.org/", "", r$results$doi)),
      oa_id = r$results$id,
      # authorships[].countries is the inclusive country signal (see frame_lexicon.R)
      is_ca = map_lgl(r$results$authorships, \(a)
        if (is.null(a) || !length(a)) FALSE else any(unlist(a$countries) == "CA", na.rm = TRUE))
    )
  })
  write_json(found, f, auto_unbox = TRUE)
  found
}
found <- lookup(pp$doi)

indexed   <- sum(pp$doi %in% found$doi)
missing   <- nrow(pp) - indexed
pct_index <- 100 * indexed / nrow(pp)
ca_found  <- sum(found$is_ca, na.rm = TRUE)

cli_li("of those, OpenAlex INDEXES : {format(indexed, big.mark=',')} ({round(pct_index, 1)}%)")
cli_li("OpenAlex has never heard of : {format(missing, big.mark=',')} ({round(100 - pct_index, 1)}%)")

# --- 3. of the Canadian ones OpenAlex has, does the FRAME hold them? -------------
con <- dbConnect(duckdb())
ca <- found |> filter(is_ca)
in_frame <- if (nrow(ca)) dbGetQuery(con, glue("
  SELECT count(*) n FROM read_parquet('{FRAME}')
  WHERE lower(replace(doi, 'https://doi.org/', '')) IN ({paste0(\"'\", ca$doi, \"'\", collapse = ',')})"))$n else 0L
dbDisconnect(con, shutdown = TRUE)

cli_h2("The frame's own recall, on the preprints OpenAlex does have")
cli_li("sampled preprints with a Canadian author : {ca_found}")
cli_li("of those, present in the frame           : {in_frame}")

if (pct_index >= 95) {
  cli_alert_success(
    "OpenAlex indexes {round(pct_index, 1)}% of what the servers say they hold, so a separate preprint \\
     ingest would duplicate work already done. THE CLAIM IS NOW MEASURED RATHER THAN ASSERTED, \\
     which is the only reason it is allowed in the proposal."
  )
} else {
  cli_alert_danger(
    "OpenAlex is missing {round(100 - pct_index, 1)}% of what the servers themselves publish. A preprint the \\
     index does not hold cannot enter ANY frame by ANY route, so this is a hard coverage gap and \\
     the servers must be harvested directly."
  )
}

record_finding(
  "preprint_coverage",
  list(
    external_criterion   = "the bioRxiv/medRxiv details API, which enumerates the servers' own corpus and owes nothing to OpenAlex",
    window               = "2023-01-01 to 2025-12-31",
    preprints_enumerated = nrow(pp),
    indexed_by_openalex  = indexed,
    missing_from_openalex = missing,
    pct_indexed          = round(pct_index, 1),
    sampled_with_canadian_author = ca_found,
    of_those_present_in_frame    = in_frame,
    frame_preprints_total        = 156086L,
    separate_ingest_needed       = pct_index < 95,
    caveat = paste(
      "The bioRxiv API exposes no author country, so the sample is mostly non-Canadian and the",
      "clean quantity is INDEX coverage (does OpenAlex hold the preprint at all?), not Canadian",
      "recall: a preprint the index lacks cannot enter any frame by any route, so index coverage",
      "is the binding upper bound. The Canadian sub-count is small and is reported as a check,",
      "not as an estimate. arXiv is NOT tested here (its OAI endpoint pages differently); the",
      "frame carries 11,647 arXiv works and that claim remains untested against arXiv itself."
    )
  ),
  headline = glue(
    "The frame carries 156,086 preprints, and the tempting move was to assert that OpenAlex covers the preprint ",
    "servers and skip the ingest. That is a COVERAGE CLAIM, and this project does not get to make one from inside ",
    "the pipeline being claimed for: it is the topic route certifying its own recall (finding 12). Measured instead ",
    "against the servers' OWN API, OpenAlex indexes {round(pct_index, 1)}% of the {format(nrow(pp), big.mark=',')} bioRxiv and medRxiv preprints enumerated ",
    "({missing} missing). {ifelse(pct_index >= 95, 'The claim survives measurement, so no separate preprint ingest is built.', 'The claim FAILS: the servers must be harvested directly, because a preprint OpenAlex does not index cannot enter any frame by any route.')}"
  )
)
