#!/usr/bin/env Rscript
# Finding 3: Erudit is absent from OpenAlex, and harvestable outside it.
#
# Erudit is the principal platform for francophone Canadian scholarship. If it
# is not addressable as an OpenAlex source, an OpenAlex-only pipeline cannot even
# ask "how much of this corpus is francophone?" The question has no filter to
# express it.
#
# The gap is real, and it has a fix: Erudit runs a live OAI-PMH endpoint. We
# verify both halves here, because naming a gap without demonstrating the remedy
# is just a disclaimer.

suppressPackageStartupMessages({
  library(cli); library(glue); library(xml2); library(httr2); library(purrr)
})
source("R/openalex.R"); source("R/frame.R"); source("R/findings.R")

offline <- "--offline" %in% commandArgs(TRUE)

ERUDIT_OAI <- "https://oai.erudit.org/oai/request"
RAW        <- file.path(.repo_root(), "pilot", "raw", "erudit")

#' Call Erudit's OAI-PMH endpoint, archiving the raw XML.
erudit_fetch <- function(verb, ...) {
  params <- list(verb = verb, ...)
  dir.create(RAW, recursive = TRUE, showWarnings = FALSE)

  # Resumption tokens contain "/", which is not a filename.
  slug <- substr(openssl::sha256(paste0(names(params), "=", unlist(params), collapse = "&")), 1, 12)
  path <- file.path(RAW, glue("{verb}_{slug}.xml"))

  if (!file.exists(path)) {
    if (offline) stop("No archived Erudit response; re-run without --offline.", call. = FALSE)
    request(ERUDIT_OAI) |>
      req_url_query(!!!params) |>
      req_user_agent(USER_AGENT) |>
      req_retry(max_tries = 4L) |>
      req_perform(path = path)
  }
  read_xml(path)
}

ns <- c(oai = "http://www.openarchives.org/OAI/2.0/")

# Half 1: is Erudit addressable inside OpenAlex?
hits <- oa_get("sources", list(filter = "display_name.search:erudit"), offline = offline)$meta$count

# Half 2: is Erudit harvestable outside OpenAlex?
identify <- erudit_fetch("Identify")
repo_name <- xml_text(xml_find_first(identify, ".//oai:repositoryName", ns))
earliest  <- xml_text(xml_find_first(identify, ".//oai:earliestDatestamp", ns))

sets  <- character(0)
token <- NULL
repeat {
  root <- if (is.null(token)) erudit_fetch("ListSets") else erudit_fetch("ListSets", resumptionToken = token)
  sets <- c(sets, xml_text(xml_find_all(root, ".//oai:set/oai:setName", ns)))
  node <- xml_find_first(root, ".//oai:resumptionToken", ns)
  token <- if (!is.na(node) && nzchar(xml_text(node))) xml_text(node) else NULL
  if (is.null(token)) break
}

cli_h1("Erudit")
cli_li("OpenAlex sources matching 'erudit' : {hits}")
cli_li("OAI-PMH repository                 : {repo_name}")
cli_li("earliest datestamp                 : {earliest}")
cli_li("harvestable sets (journals/series) : {length(sets)}")
walk(head(sets, 4), \(s) cli_li("    {substr(s, 1, 72)}"))

record_finding(
  "erudit",
  list(
    openalex_sources_matching_erudit = hits,
    oai_endpoint                     = ERUDIT_OAI,
    oai_repository_name              = repo_name,
    oai_earliest_datestamp           = earliest,
    oai_harvestable_sets             = length(sets)
  ),
  headline = glue(
    "Erudit matches {hits} sources in OpenAlex, but its OAI-PMH endpoint is live ",
    "and exposes {length(sets)} harvestable sets."
  )
)
