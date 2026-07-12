#!/usr/bin/env Rscript
# Finding 17: the canonical bibliographic database cannot represent the
# retraction record, and undercounts it.
#
# ------------------------------------------------------------------------------
# WHY THIS IS AN ATTRIBUTE AND NOT A FRAME ROUTE
# ------------------------------------------------------------------------------
# A retracted cardiology paper is retracted CARDIOLOGY. It is not metaresearch,
# and admitting it to the frame on the strength of its retraction would repeat
# the exact error this project exists to attack: letting an interesting signal
# masquerade as the estimand. Retraction is a PROPERTY of a work in the frame.
#
# It is, however, the property a metaresearch dataset most obviously owes its
# users, and OpenAlex's version of it is a single boolean. So: join Retraction
# Watch by DOI, carry its richer state onto every frame record, and report what
# the boolean was hiding.
#
# ------------------------------------------------------------------------------
# WHAT THE JOIN SHOWS
# ------------------------------------------------------------------------------
# 1. OpenAlex MISSES retractions that Retraction Watch records.
# 2. Worse, and structurally: OpenAlex has NO FIELD for an EXPRESSION OF CONCERN.
#    `is_retracted` is a BOOLEAN over a state space that is not binary. The
#    post-publication record has at least: retraction, expression of concern,
#    correction, and reinstatement (a retraction that was itself withdrawn).
#    A boolean can represent exactly one of those four, and it silently collapses
#    the rest into FALSE, which reads as "fine".
#
# That is the same failure as `primary_topic` (finding 1): a schema that cannot
# express the distinction the field turns on. It is not a data-quality problem
# to be patched; it is a modelling problem, and the fix is to carry the external
# criterion (Retraction Watch's own state) rather than the internal flag.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(cli); library(glue); library(dplyr)
})
source("R/findings.R")

FRAME <- "data/frame/canadian_works.parquet"
RW    <- path.expand("~/Documents/GitHub/XeraRetractionTracker/data/retraction_watch.csv")
OUT   <- "data/frame/frame_retractions.parquet"

if (!file.exists(FRAME)) cli_abort("run R/harvest_frame.R first")
if (!file.exists(RW))    cli_abort("Retraction Watch CSV not found at {.path {RW}}")

con <- dbConnect(duckdb())

# DOIs are compared bare and lowercased: OpenAlex stores the resolver prefix,
# Retraction Watch does not, and a join that misses on `https://doi.org/` would
# quietly report that the two sources agree about nothing.
dbExecute(con, glue("CREATE VIEW frame AS
  SELECT id, title, publication_year, is_retracted,
         lower(replace(doi, 'https://doi.org/', '')) AS doi
  FROM read_parquet('{FRAME}') WHERE doi IS NOT NULL"))

dbExecute(con, glue("CREATE VIEW rw AS
  SELECT lower(\"OriginalPaperDOI\") AS doi,
         \"RetractionNature\"        AS nature,
         \"Reason\"                  AS reason,
         \"RetractionDate\"          AS retraction_date
  FROM read_csv_auto('{RW}', ignore_errors = true)
  WHERE \"OriginalPaperDOI\" IS NOT NULL AND \"OriginalPaperDOI\" != ''"))

j <- dbGetQuery(con, "
  SELECT f.id, f.title, f.publication_year, f.is_retracted, f.doi,
         rw.nature, rw.reason, rw.retraction_date
  FROM frame f JOIN rw ON f.doi = rw.doi")
# One work can carry several RW notices (an EoC that later became a retraction).
# Collapse to the most severe state, so each frame record has ONE attribute.
SEVERITY <- c("Retraction" = 4, "Expression of concern" = 3, "Correction" = 2, "Reinstatement" = 1)
j <- j |>
  mutate(sev = SEVERITY[nature] |> coalesce(0L)) |>
  arrange(id, desc(sev)) |>
  distinct(id, .keep_all = TRUE)

oa_flags   <- dbGetQuery(con, "SELECT count(*) n FROM frame WHERE is_retracted")$n
matched    <- nrow(j)
oa_misses  <- sum(!j$is_retracted)
missed_by_nature <- j |> filter(!is_retracted) |> count(nature, sort = TRUE)
n_retr_missed <- sum(j$nature == "Retraction" & !j$is_retracted)
n_eoc         <- sum(j$nature == "Expression of concern")

cli_h1("Retraction Watch against OpenAlex's own flag, on the Canadian frame")
cli_li("works OpenAlex flags is_retracted : {format(oa_flags, big.mark=',')}")
cli_li("frame works Retraction Watch knows: {format(matched, big.mark=',')}")
cli_alert_danger(
  "Retraction Watch records {oa_misses} frame works that OpenAlex does NOT flag, \\
   including {n_retr_missed} outright RETRACTIONS."
)
print(as.data.frame(missed_by_nature), row.names = FALSE)
cli_alert_danger(
  "And the structural failure: {n_eoc} of these carry an EXPRESSION OF CONCERN, a state \\
   OpenAlex HAS NO FIELD FOR. `is_retracted` is a BOOLEAN over a state space with at least \\
   four values. It can express one of them, and silently reports the other three as FALSE, \\
   which reads as 'fine'."
)

# --- ship the attribute --------------------------------------------------------
dbWriteTable(con, "rw_join", j |> select(id, rw_nature = nature, rw_reason = reason,
                                         rw_date = retraction_date, openalex_flagged = is_retracted))
dbExecute(con, glue("COPY (SELECT * FROM rw_join) TO '{OUT}' (FORMAT parquet, COMPRESSION zstd)"))
cli_alert_success("wrote {.path {OUT}}: the post-publication state of every frame work RW knows")

# The reasons, which are a research-integrity TAXONOMY and the reason this is
# worth carrying at all: OpenAlex's boolean cannot say WHY.
top_reasons <- j |>
  filter(!is.na(reason), reason != "") |>
  tidyr::separate_rows(reason, sep = ";") |>
  mutate(reason = trimws(gsub("^\\+", "", reason))) |>
  filter(reason != "") |>
  count(reason, sort = TRUE) |>
  head(8)
cli_h2("Why Canadian work is retracted (a taxonomy OpenAlex's boolean cannot carry)")
print(as.data.frame(top_reasons), row.names = FALSE)

record_finding(
  "retraction_record",
  list(
    source                       = "Retraction Watch (Crossref-licensed), joined by bare lowercased DOI",
    frame_works_with_doi         = dbGetQuery(con, "SELECT count(*) n FROM frame")$n,
    openalex_is_retracted_flags  = oa_flags,
    matched_in_retraction_watch  = matched,
    openalex_misses              = oa_misses,
    outright_retractions_missed  = n_retr_missed,
    expressions_of_concern       = n_eoc,
    missed_by_nature             = as.list(setNames(missed_by_nature$n, missed_by_nature$nature)),
    top_reasons                  = as.list(setNames(top_reasons$n, top_reasons$reason)),
    openalex_has_eoc_field       = FALSE,
    is_a_frame_route             = FALSE,
    caveat = paste(
      "This is an ATTRIBUTE, not a frame route. A retracted cardiology paper is retracted",
      "cardiology, not metaresearch, and admitting works on the strength of a retraction would",
      "let an interesting signal masquerade as the estimand. The DOI join can only see works",
      "that HAVE a DOI, and OpenAlex flags some works Retraction Watch does not match, which",
      "may be DOI drift rather than disagreement; the asymmetry reported here is one-directional",
      "on purpose (what RW adds), because that is the direction the join can support."
    )
  ),
  headline = glue(
    "Joined to the Canadian frame by DOI, Retraction Watch records {oa_misses} works that OpenAlex does NOT flag as ",
    "retracted, including {n_retr_missed} outright retractions. But the undercount is the smaller problem. {n_eoc} of these ",
    "carry an EXPRESSION OF CONCERN, and OpenAlex HAS NO FIELD FOR ONE: `is_retracted` is a boolean over a state ",
    "space with at least four values (retraction, expression of concern, correction, reinstatement), so it can ",
    "express one and silently reports the rest as FALSE, which reads as 'fine'. Nor can a boolean carry WHY. This is ",
    "finding 1's disease in a second schema: the canonical database cannot express the distinction the field turns on."
  )
)
dbDisconnect(con, shutdown = TRUE)
