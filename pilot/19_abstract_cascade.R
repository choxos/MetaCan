#!/usr/bin/env Rscript
# Finding 19: how much of the screen's biggest blind spot can be closed, and what
# it would cost to simply DROP the part that cannot be.
#
# ------------------------------------------------------------------------------
# THE DEFECT THIS ATTACKS
# ------------------------------------------------------------------------------
# Finding 11 measured a difference in one historical model's outputs: where a work
# has NO ABSTRACT, the model assigned positive labels at 0.78% against 1.55% where
# an abstract exists (p = 0.023, robust to adjustment for year and language). This
# does not establish accuracy, bias, or field prevalence. On the real frame the
# exposure is 23.3%: 1,003,117 works read by TITLE ALONE.
#
# ------------------------------------------------------------------------------
# PART A: THE CASCADE. Ask four sources, not one.
# ------------------------------------------------------------------------------
# OpenAlex lacking an abstract does not mean no abstract EXISTS. So ask, in order:
#
#   1. PubMed      (Entrez)          biomedical, deep, and narrow
#   2. Europe PMC  (REST)            PubMed + PMC + preprints + agricultural,
#                                    biomedical-adjacent and broader than PubMed
#   3. Crossref    (REST)            publisher-deposited abstracts, DISCIPLINE-
#                                    AGNOSTIC, and therefore the only source in
#                                    the cascade that can reach the humanities
#
# Crossref was put in the cascade specifically because the first two are
# biomedical, on the reasoning that a cascade of biomedical indexes would close
# the gap unevenly and make the map's residual bias MORE discipline-shaped while
# APPEARING to improve coverage.
#
# THE REASONING WAS RIGHT AND THE REMEDY DOES NOT WORK. I wrote, before running
# it, that "Crossref is the load-bearing link". It recovered TWO abstracts out of
# 189. Europe PMC added SEVEN. PubMed did 180, which is 95% of the total.
#
#   pubmed 180   europepmc 7   crossref 2
#
# Publishers mostly do not deposit abstracts to Crossref, so the discipline-
# agnostic rescue I designed the cascade around DOES NOT EXIST. That is the
# second time in one session I wrote a conclusion before the evidence and the
# evidence refused (DEVIATIONS.md D14, D15).
#
# AND THE FINDING IS WORSE THAN THE ONE I WENT LOOKING FOR, which is becoming a
# pattern worth naming. Recovery is savagely uneven:
#
#   review 91.2%   article 40.5%   book-chapter 6.2%   letter 0.0%
#   English 38.8%   French 15.4%
#
# So the abstract gap is NOT a random metadata failure that a better index fixes.
# It is STRUCTURAL: the works without abstracts are disproportionately the ones no
# abstract service covers, and no source in the chain reaches them uniformly. The
# remaining records differ by work type and language. Human validation is required
# to learn whether those metadata differences correspond to outcome differences.
#
# ------------------------------------------------------------------------------
# PART B: WHAT "JUST SCREEN THE ONES WITH ABSTRACTS" ACTUALLY COSTS
# ------------------------------------------------------------------------------
# The pragmatic move is to restrict screening to works that have an abstract. It
# is defensible, and it is NOT free, and the difference between those two claims
# is the whole point of this project.
#
# Restricting to abstract-bearing works changes the observed frame composition.
# Finding 11 measured an association with historical model output, not with a
# human-validated outcome. Finding 5's D5 retraction established that the stratum
# is not what I had assumed. So this part
# measures, on the real frame, exactly which works such a rule would delete:
# which types, which languages, which venues. It is reported as a DECLARED
# EXCLUSION with measured composition differences, never as a silent frame
# restriction, and the validation design retains a sampling floor in the excluded stratum so the cost stays
# estimable rather than becoming invisible.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(httr2); library(xml2)
  library(dplyr); library(purrr); library(cli); library(glue); library(jsonlite)
})
source("R/findings.R")

FRAME   <- "data/frame/canadian_works.parquet"
RAW     <- "pilot/raw/abstracts"
N       <- 500L
SEED    <- 20260712L
OFFLINE <- "--offline" %in% commandArgs(trailingOnly = TRUE)
dir.create(RAW, recursive = TRUE, showWarnings = FALSE)

con <- dbConnect(duckdb())
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}')"))

# --- PART B first: what does the exclusion delete? (asked before any API) --------
gap <- dbGetQuery(con, "
  SELECT count(*) AS frame, sum((abstract_idx IS NULL)::int) AS no_abs,
         round(100.0*sum((abstract_idx IS NULL)::int)/count(*), 1) AS pct
  FROM f")
by_type <- dbGetQuery(con, "
  SELECT type, count(*) n, sum((abstract_idx IS NULL)::int) AS dropped,
         round(100.0*sum((abstract_idx IS NULL)::int)/count(*), 1) AS pct_dropped
  FROM f GROUP BY 1 HAVING count(*) > 20000 ORDER BY pct_dropped DESC")
by_lang <- dbGetQuery(con, "
  SELECT language, count(*) n, sum((abstract_idx IS NULL)::int) AS dropped,
         round(100.0*sum((abstract_idx IS NULL)::int)/count(*), 1) AS pct_dropped
  FROM f WHERE language IN ('en','fr') GROUP BY 1")

cli_h1("PART B. What 'only screen works with abstracts' would delete")
cli_li("works with NO abstract: {format(gap$no_abs, big.mark=',')} of {format(gap$frame, big.mark=',')} ({gap$pct}%)")
cli_h2("by type: the exclusion is NOT uniform")
print(as.data.frame(by_type), row.names = FALSE)
cli_h2("by language")
print(as.data.frame(by_lang), row.names = FALSE)
bc <- by_type$pct_dropped[by_type$type == "book-chapter"]
cli_alert_danger(
  "A rule that screens only abstract-bearing works deletes {bc}% of BOOK CHAPTERS, \\
   {by_type$pct_dropped[by_type$type=='letter']}% of LETTERS and {by_type$pct_dropped[by_type$type=='editorial']}% of EDITORIALS, against {by_type$pct_dropped[by_type$type=='article']}% of ARTICLES. \\
   The restriction changes the frame's work-type composition. Finding 11 also found a lower \\
   historical machine-positive rate in the no-abstract stratum, but did not measure accuracy. \\
   The effect on human-validated outcomes remains unknown."
)

# --- PART A: the cascade -------------------------------------------------------
samp <- dbGetQuery(con, glue("
  SELECT id, doi, title, publication_year AS year, language AS lang, type, field
  FROM f WHERE abstract_idx IS NULL AND doi IS NOT NULL
  ORDER BY md5(id || '{SEED}') LIMIT {N}")) |>
  mutate(doi = tolower(sub("https://doi.org/", "", doi)))
dbDisconnect(con, shutdown = TRUE)

ARCHIVE <- file.path(RAW, "cascade.json")
GET <- function(req) tryCatch(req |> req_timeout(30) |> req_perform(), error = function(e) NULL)

pubmed_abs <- function(d) {
  r <- GET(request("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi") |>
    req_url_query(db = "pubmed", term = paste0(d, "[DOI]"), retmode = "json",
                  tool = "metacan", email = "ahmad.pub@gmail.com"))
  Sys.sleep(0.35)
  if (is.null(r)) return(NA_character_)
  ids <- resp_body_json(r)$esearchresult$idlist
  if (!length(ids)) return(NA_character_)
  x <- GET(request("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi") |>
    req_url_query(db = "pubmed", id = ids[[1]], retmode = "xml",
                  tool = "metacan", email = "ahmad.pub@gmail.com"))
  Sys.sleep(0.35)
  if (is.null(x)) return(NA_character_)
  t <- xml_text(xml_find_all(resp_body_xml(x), "//AbstractText"))
  if (length(t)) paste(t, collapse = " ") else NA_character_
}

europepmc_abs <- function(d) {
  r <- GET(request("https://www.ebi.ac.uk/europepmc/webservices/rest/search") |>
    req_url_query(query = glue('DOI:"{d}"'), format = "json", resultType = "core", pageSize = 1))
  Sys.sleep(0.15)
  if (is.null(r)) return(NA_character_)
  res <- resp_body_json(r)$resultList$result
  if (!length(res)) return(NA_character_)
  a <- res[[1]]$abstractText
  if (is.null(a) || !nzchar(a)) NA_character_ else xml_text(read_html(paste0("<x>", a, "</x>")))
}

crossref_abs <- function(d) {
  r <- GET(request(glue("https://api.crossref.org/works/{d}")) |>
    req_url_query(mailto = "ahmad.pub@gmail.com"))
  Sys.sleep(0.1)
  if (is.null(r)) return(NA_character_)
  a <- resp_body_json(r)$message$abstract
  if (is.null(a) || !nzchar(a)) NA_character_ else xml_text(read_html(paste0("<x>", a, "</x>")))
}

run_cascade <- function(dois) {
  if (OFFLINE || file.exists(ARCHIVE)) {
    if (!file.exists(ARCHIVE)) cli_abort("offline, and {.path {ARCHIVE}} is not archived")
    return(fromJSON(ARCHIVE))
  }
  cli_alert_info("cascading {length(dois)} DOIs through PubMed -> Europe PMC -> Crossref")
  out <- map_dfr(seq_along(dois), function(i) {
    d <- dois[i]
    if (i %% 50 == 0) cli_li("{i}/{length(dois)}")
    pm <- pubmed_abs(d)
    ep <- if (is.na(pm)) europepmc_abs(d) else NA_character_
    cr <- if (is.na(pm) && is.na(ep)) crossref_abs(d) else NA_character_
    src <- if (!is.na(pm)) "pubmed" else if (!is.na(ep)) "europepmc" else if (!is.na(cr)) "crossref" else NA_character_
    data.frame(doi = d, source = src,
               nchar = nchar(coalesce(pm, ep, cr, "")),
               pubmed = !is.na(pm), europepmc = !is.na(ep), crossref = !is.na(cr))
  })
  write_json(out, ARCHIVE, auto_unbox = TRUE)
  out
}

cas <- run_cascade(samp$doi)
j <- samp |> left_join(cas, by = "doi")

rec  <- sum(!is.na(j$source))
pct  <- 100 * rec / nrow(j)
by_src <- j |> filter(!is.na(source)) |> count(source, sort = TRUE)

cli_h1("PART A. The cascade: how much of the gap closes")
cli_li("sampled works with no OpenAlex abstract : {nrow(j)}")
cli_li("abstract RECOVERED                      : {rec} ({round(pct, 1)}%)")
print(as.data.frame(by_src), row.names = FALSE)

grp <- function(g) j |> mutate(k = .data[[g]]) |> filter(!is.na(k)) |> group_by(k) |>
  summarise(n = n(), rec = sum(!is.na(source)), pct = round(100 * rec / n, 1), .groups = "drop") |>
  filter(n >= 12) |> arrange(desc(pct))
cli_h2("recovery BY TYPE (does the cascade close the gap EVENLY?)")
print(as.data.frame(grp("type")), row.names = FALSE)
cli_h2("recovery BY LANGUAGE")
print(as.data.frame(grp("lang")), row.names = FALSE)

lt <- grp("lang"); en <- lt$pct[lt$k == "en"]; fr <- lt$pct[lt$k == "fr"]
tt <- grp("type")
resid <- round(gap$pct * (1 - pct / 100), 1)

n_pm <- sum(j$pubmed, na.rm = TRUE); n_ep <- sum(j$europepmc, na.rm = TRUE); n_cr <- sum(j$crossref, na.rm = TRUE)
cli_alert_warning(
  "I BUILT THIS CASCADE AROUND CROSSREF, on the reasoning that PubMed and Europe PMC are \\
   biomedical and a discipline-agnostic source was needed to keep the fix from making the bias \\
   worse. THE REASONING WAS RIGHT AND THE REMEDY IS NOT THERE: Crossref recovered {n_cr}, Europe PMC \\
   {n_ep}, PubMed {n_pm}. Publishers largely do not deposit abstracts to Crossref. DEVIATIONS.md D15."
)
cli_alert_danger(
  "So the gap is NOT a random metadata failure a better index fixes. It is STRUCTURAL. Recovery \\
   runs {tt$pct[tt$k=='review']}% for reviews and {tt$pct[tt$k=='book-chapter']}% for book chapters; {round(en,1)}% for English and {round(fr,1)}% for French. \\
   The works with no abstract are disproportionately the works NO abstract service covers, and \\
   the residue is humanities-shaped, book-shaped and francophone-shaped: precisely the material \\
   an inclusive map of Canadian metaresearch exists to include."
)
cli_alert_info(
  "Residual title-only exposure: ~{resid}% of the frame, down from {gap$pct}%. Real, and it does not \\
   rescue the exclusion in PART B: the works a 'has-abstract' rule would delete are the SAME works \\
   the cascade cannot reach. The audit keeps a sampling floor in that stratum, because it is the \\
   only instrument that can still see into it."
)

record_finding(
  "abstract_cascade",
  list(
    # Part B: the exclusion's cost
    frame_works                = gap$frame,
    frame_works_no_abstract    = gap$no_abs,
    pct_frame_no_abstract      = gap$pct,
    pct_dropped_by_type        = as.list(setNames(by_type$pct_dropped, by_type$type)),
    pct_dropped_by_language    = as.list(setNames(by_lang$pct_dropped, by_lang$language)),
    abstracts_only_changes_observed_composition = TRUE,
    # Part A: the cascade
    sampled                    = nrow(j),
    sources                    = "PubMed (Entrez) -> Europe PMC (REST) -> Crossref (REST)",
    recovered                  = rec,
    pct_gap_recovered          = round(pct, 1),
    recovered_by_source        = as.list(setNames(by_src$n, by_src$source)),
    # The hypothesis I wrote before running this, and the data's answer. D15.
    hypothesis_crossref_would_be_load_bearing = FALSE,
    crossref_recovered         = n_cr,
    europepmc_recovered        = n_ep,
    pubmed_recovered           = n_pm,
    crossref_is_not_load_bearing_in_this_sample = TRUE,
    abstract_recovery_varies_by_type_and_language = TRUE,
    recovery_pct_by_type       = as.list(setNames(tt$pct, tt$k)),
    recovery_pct_english       = if (length(en)) en else NA_real_,
    recovery_pct_french        = if (length(fr)) fr else NA_real_,
    residual_pct_frame_title_only = resid,
    caveat = paste(
      "Run on a 500-work hash-ordered sample of the no-abstract stratum, not the frame: the",
      "cascade is rate-limited and a million lookups is days. The recovery rate is an estimate",
      "with sampling error, and it is an estimate of a CEILING (an abstract that EXISTS is",
      "recoverable; it does not follow the screen then classifies the work correctly). Only works",
      "with a DOI can be looked up, so the DOI-less part of the stratum is untouched and its size",
      "bounds what any cascade can do. PubMed and Europe PMC are biomedical; Crossref is not, and",
      "it is in the chain for exactly that reason: a cascade of biomedical indexes would close the",
      "gap unevenly and make the residual coverage more discipline-shaped while appearing to improve",
      "coverage. Crossref recovered 2 of",
      "189 and Europe PMC 7, because publishers largely do not deposit abstracts to Crossref, so no",
      "discipline-agnostic rescue was observed in this sample (D15). Restricting screening to",
      "abstract-bearing works changes the work-type and language composition. Its effect on human-valid",
      "outcomes is unknown, so validation keeps a sampling floor in the excluded stratum."
    )
  ),
  headline = glue(
    "Abstract availability is uneven: {gap$pct}% of the frame ({format(gap$no_abs, big.mark=',')} works) has no abstract, ",
    "and a historical pilot model assigned positive labels at roughly half the rate there. This is a machine-label association, not an accuracy estimate. Cascading PubMed, Europe PMC and ",
    "Crossref recovers {round(pct, 1)}% of a 500-work sample, cutting title-only exposure to ~{resid}% of the frame. But I BUILT THE ",
    "CASCADE AROUND CROSSREF as the discipline-agnostic rescue, and it recovered {n_cr} abstracts against PubMed's {n_pm}: ",
    "Crossref was not a meaningful rescue in this sample (D15). Recovery is {tt$pct[tt$k=='review']}% for reviews against ",
    "{tt$pct[tt$k=='book-chapter']}% for book chapters, {round(en,1)}% English against {round(fr,1)}% French. Restricting screening to works with abstracts ",
    "would remove {bc}% of book chapters against {by_type$pct_dropped[by_type$type=='article']}% of articles, changing the composition of the frame. ",
    "The effect on human-validated outcomes remains unknown, so validation retains a sampling floor among works without abstracts."
  )
)
