# Accumulator for pilot findings.
#
# Every number the proposal quotes is written here by the script that computed
# it, then rendered into a table. Nothing in the proposal is typed by hand, so
# the prose cannot drift away from the code.

library(jsonlite)

.results_path <- function() {
  root <- if (dir.exists("R") && dir.exists("pilot")) "." else ".."
  file.path(root, "pilot", "results", "findings.json")
}

.load_all <- function() {
  path <- .results_path()
  if (!file.exists(path)) return(list())
  jsonlite::fromJSON(path, simplifyVector = FALSE)
}

#' Store one finding, keyed by the script that produced it.
record_finding <- function(key, values, headline) {
  store <- .load_all()
  store[[key]] <- list(
    headline         = headline,
    values           = values,
    computed_at_utc  = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")
  )
  store <- store[order(names(store))]

  path <- .results_path()
  dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
  jsonlite::write_json(store, path, auto_unbox = TRUE, pretty = TRUE, digits = NA)

  cli::cli_alert_success(headline)
  invisible(store)
}

load_finding <- function(key) .load_all()[[key]]$values

all_findings <- function() .load_all()
