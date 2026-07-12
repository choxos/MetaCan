# OpenAlex client for MetaCan.
#
# Every response is archived to disk before it is parsed. The pilot findings can
# therefore be re-derived offline, with no network, from the committed raw JSON.
# This matters because OpenAlex changes daily: the same query re-run next month
# will not return today's counts, so "we ran this query" is not a reproducible
# claim unless the response itself is kept.
#
# The cursor-paging, polite-pool and 429-handling design follows the client in
# RetractionPollution/R/openalex.R.

library(httr2)
library(jsonlite)

OPENALEX_API <- "https://api.openalex.org"
MAILTO       <- "ahmad.pub@gmail.com"
USER_AGENT   <- paste0(
  "metacan/0.1 (+https://github.com/choxos/CaRN-data-challenge; mailto:", MAILTO, ")"
)

MAX_PER_PAGE <- 200L

.repo_root <- function() {
  # Works whether sourced from the repo root or from pilot/.
  if (dir.exists("R") && dir.exists("pilot")) return(normalizePath("."))
  normalizePath("..")
}

.raw_dir <- function() file.path(.repo_root(), "pilot", "raw")

#' Canonical cache key for a request.
#'
#' Sorting the parameters means two spellings of the same query land on the same
#' archived file, rather than silently re-fetching.
.cache_key <- function(endpoint, params) {
  canonical <- paste0(
    endpoint, "?",
    paste0(sort(paste0(names(params), "=", unlist(params))), collapse = "&")
  )
  substr(openssl::sha256(canonical), 1, 16)
}

#' GET one page from OpenAlex, archiving the raw response.
#'
#' @param offline If TRUE, read only from the archive and never touch the
#'   network. This is the mode a reviewer uses to reproduce our numbers.
oa_get <- function(endpoint, params = list(), offline = FALSE) {
  params$mailto <- params$mailto %||% MAILTO
  params <- lapply(params, as.character)

  key  <- .cache_key(endpoint, params)
  path <- file.path(.raw_dir(), endpoint, paste0(key, ".json"))

  if (file.exists(path)) {
    envelope <- jsonlite::fromJSON(path, simplifyVector = FALSE)
    return(envelope$payload)
  }
  if (isTRUE(offline)) {
    stop(sprintf(
      "No archived response for %s. Re-run without --offline to fetch it.", endpoint
    ), call. = FALSE)
  }

  resp <- request(OPENALEX_API) |>
    req_url_path_append(endpoint) |>
    req_url_query(!!!params) |>
    req_user_agent(USER_AGENT) |>
    # OpenAlex answers 429 when the polite pool is exceeded. Back off and retry
    # rather than dropping the query on the floor.
    req_retry(
      max_tries = 6L,
      is_transient = \(r) resp_status(r) %in% c(429L, 500L, 502L, 503L, 504L),
      backoff = \(i) 5 * i
    ) |>
    req_throttle(capacity = 10, fill_time_s = 1) |>
    req_perform()

  payload <- resp_body_json(resp)

  dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
  jsonlite::write_json(
    list(
      request         = list(endpoint = endpoint, params = params),
      retrieved_at_utc = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
      payload         = payload
    ),
    path, auto_unbox = TRUE, pretty = TRUE, null = "null"
  )

  payload
}

`%||%` <- function(x, y) if (is.null(x)) y else x

#' Number of works matching a filter. The workhorse of the pilot.
oa_count <- function(filter, offline = FALSE) {
  oa_get("works", list(filter = filter, `per-page` = 1L), offline = offline)$meta$count
}

#' Grouped counts, e.g. works by language or by institution.
oa_group_by <- function(filter, dimension, offline = FALSE) {
  groups <- oa_get(
    "works", list(filter = filter, group_by = dimension), offline = offline
  )$group_by
  tibble::tibble(
    key   = vapply(groups, \(g) g$key %||% NA_character_, character(1)),
    label = vapply(groups, \(g) g$key_display_name %||% NA_character_, character(1)),
    n     = vapply(groups, \(g) as.integer(g$count), integer(1))
  )
}

#' Walk every record via cursor paging.
#'
#' Standard paging stops at 10,000 records; cursor paging is the only way past
#' that, and is how we enumerate the full topic taxonomy.
oa_paginate <- function(endpoint, params = list(), offline = FALSE) {
  params$`per-page` <- params$`per-page` %||% MAX_PER_PAGE
  cursor <- "*"
  out <- list()

  while (!is.null(cursor) && nzchar(cursor)) {
    page <- oa_get(endpoint, c(params, list(cursor = cursor)), offline = offline)
    out <- c(out, page$results)
    cursor <- page$meta$next_cursor
  }
  out
}
