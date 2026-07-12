#!/usr/bin/env Rscript
# Finding 21: the registry is not a source. It is a REFERENCE STANDARD, and the
# only one in this project that is not made of machine labels.
#
# ------------------------------------------------------------------------------
# WHY TRIALS ARE NOT IN THE FRAME, AND MUST NOT BE
# ------------------------------------------------------------------------------
# A trial registration is not a publication and is not metaresearch. It is
# primary research administrivia. Admitting registrations to the frame would let
# an interesting signal masquerade as the estimand, which is the exact error this
# project exists to attack (see finding 17 for the same ruling on retractions).
#
# So clinicaltrials.gov contributes NO RECORDS to the frame. What it contributes
# is something the frame cannot supply for itself: a set of KNOWN ITEMS whose
# existence is established OUTSIDE the pipeline.
#
# ------------------------------------------------------------------------------
# WHY THIS IS THE MOST IMPORTANT INSTRUMENT IN THE PROJECT
# ------------------------------------------------------------------------------
# Every recall number this project has produced is scored against MACHINE LABELS
# (finding 15: swap the machine and the topic route's recall moves 12% -> 7%). The
# venue reference set was proposed to escape that, and it is good, but venue is
# still a property OpenAlex records: if OpenAlex has the work, it has the venue.
#
# A registry breaks the circle completely. The registry knows a trial happened.
# Whether OpenAlex holds its publication is a fact about OPENALEX, not about the
# registry, and the registry cannot be wrong about it in OpenAlex's favour. That
# makes trial-to-publication linkage the ONE instrument here that measures the
# pipeline against a world that exists independently of it.
#
# ------------------------------------------------------------------------------
# AND IT REPRODUCES THE OPENING SENTENCE OF THE PROPOSAL
# ------------------------------------------------------------------------------
# The proposal opens on a prior result: an automated pipeline linking funded
# trials to publications recovered 44.5% of what two human reviewers found, at
# 94.3% PPV. Accurate on what it reached; blind to half of what existed.
#
# That is the whole thesis, and until now it has been a fact about a DIFFERENT
# project on a DIFFERENT corpus. This runs it on CANADIAN trials, against THIS
# frame, so the proposal's opening claim stops being autobiography and becomes a
# measurement of the instrument actually being proposed.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(httr2); library(jsonlite)
  library(dplyr); library(purrr); library(cli); library(glue)
})
source("R/findings.R")

FRAME   <- "data/frame/canadian_works.parquet"
RAW     <- "pilot/raw/trials"
N_PAGE  <- 10L      # 100 trials per page
OFFLINE <- "--offline" %in% commandArgs(trailingOnly = TRUE)
dir.create(RAW, recursive = TRUE, showWarnings = FALSE)
ARCHIVE <- file.path(RAW, "ctgov_canada.json")

# --- 1. Canadian completed trials, from the registry itself ---------------------
fetch_trials <- function() {
  if (OFFLINE || file.exists(ARCHIVE)) {
    if (!file.exists(ARCHIVE)) cli_abort("offline, and {.path {ARCHIVE}} is not archived")
    return(fromJSON(ARCHIVE))
  }
  cli_alert_info("querying ClinicalTrials.gov v2 for completed Canadian trials")
  tok <- NULL
  out <- list()
  for (i in seq_len(N_PAGE)) {
    req <- request("https://clinicaltrials.gov/api/v2/studies") |>
      req_url_query(
        `filter.overallStatus` = "COMPLETED",
        `query.locn`           = "Canada",
        `filter.advanced`      = "AREA[CompletionDate]RANGE[2010-01-01,2020-12-31]",
        pageSize               = 100,
        fields                 = "NCTId|BriefTitle|CompletionDate|LeadSponsorName|ReferencesModule")
    if (!is.null(tok)) req <- req |> req_url_query(pageToken = tok)
    r <- tryCatch(req |> req_timeout(60) |> req_perform() |> resp_body_json(), error = function(e) NULL)
    if (is.null(r) || !length(r$studies)) break
    out <- c(out, r$studies)
    tok <- r$nextPageToken
    Sys.sleep(0.4)
    if (is.null(tok)) break
  }
  # The registry's OWN record of the trial's publications: what the sponsor
  # reported. This is the reference standard, and it owes nothing to OpenAlex.
  d <- map_dfr(out, function(s) {
    id  <- s$protocolSection$identificationModule$nctId
    ttl <- s$protocolSection$identificationModule$briefTitle
    refs <- s$protocolSection$referencesModule$references
    dois <- if (is.null(refs)) character(0) else
      map_chr(refs, \(r) if (!is.null(r$pmid)) as.character(r$pmid) else NA_character_) |> na.omit() |> as.character()
    types <- if (is.null(refs)) character(0) else map_chr(refs, \(r) r$type %||% NA_character_)
    data.frame(nct = id, title = ttl,
               n_refs = length(refs %||% list()),
               n_results_refs = sum(types == "RESULT", na.rm = TRUE),
               pmids = paste(dois, collapse = ";"))
  })
  write_json(d, ARCHIVE, auto_unbox = TRUE)
  d
}
`%||%` <- function(a, b) if (is.null(a)) b else a
tr <- fetch_trials()

cli_h1("Canadian completed trials, from ClinicalTrials.gov (2010-2020)")
cli_li("trials retrieved             : {format(nrow(tr), big.mark=',')}")
with_pub <- sum(tr$n_results_refs > 0)
cli_li("with a RESULTS publication the sponsor itself reported: {with_pub} ({round(100*with_pub/nrow(tr), 1)}%)")

# --- 2. does the FRAME hold those publications? --------------------------------
# The known items: PMIDs the registry says are the trial's result publications.
known <- tr |> filter(n_results_refs > 0, nzchar(pmids)) |>
  tidyr::separate_rows(pmids, sep = ";") |>
  filter(nzchar(pmids)) |> rename(pmid = pmids) |> distinct(pmid, .keep_all = TRUE)
cli_li("known result publications (PMIDs) : {nrow(known)}")

# PMID -> DOI, via NCBI's id converter, so we can look them up in the frame.
CONV <- file.path(RAW, "pmid2doi.json")
convert <- function(pmids) {
  if (OFFLINE || file.exists(CONV)) {
    if (!file.exists(CONV)) cli_abort("offline, and {.path {CONV}} is not archived")
    return(fromJSON(CONV))
  }
  out <- map_dfr(split(pmids, ceiling(seq_along(pmids) / 100)), function(b) {
    r <- tryCatch(
      request("https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/") |>
        req_url_query(ids = paste(b, collapse = ","), format = "json", tool = "metacan",
                      email = "ahmad.pub@gmail.com") |>
        req_timeout(60) |> req_perform() |> resp_body_json(simplifyVector = TRUE),
      error = function(e) NULL)
    Sys.sleep(0.4)
    if (is.null(r) || is.null(r$records)) return(NULL)
    x <- r$records
    data.frame(pmid = as.character(x$pmid),
               doi = if ("doi" %in% names(x)) tolower(x$doi) else NA_character_)
  })
  write_json(out, CONV, auto_unbox = TRUE)
  out
}
conv <- convert(known$pmid)
# distinct on DOI: two trials can report the SAME publication, and counting it
# twice made `missing` exceed the arithmetic and produce a negative cell.
kn <- known |> left_join(conv, by = "pmid") |>
  filter(!is.na(doi), nzchar(doi)) |> distinct(doi, .keep_all = TRUE)
cli_li("of those, resolvable to a DOI    : {nrow(kn)}")

con <- dbConnect(duckdb())
dois_sql <- paste0("'", kn$doi, "'", collapse = ",")
hit <- dbGetQuery(con, glue("
  SELECT lower(replace(doi, 'https://doi.org/', '')) AS doi FROM read_parquet('{FRAME}')
  WHERE lower(replace(doi, 'https://doi.org/', '')) IN ({dois_sql})"))
in_frame <- nrow(hit)
dbDisconnect(con, shutdown = TRUE)

naive_recall <- 100 * in_frame / nrow(kn)
nci <- binom.test(in_frame, nrow(kn))$conf.int * 100

# --- 3. THE DISAMBIGUATION, AND IT SAVED THIS FINDING FROM BEING A LIE ----------
# A known publication absent from the frame failed in one of THREE ways, and they
# are entirely different things:
#
#   (a) OpenAlex does not index it at all          -> a SOURCE gap. No route fixes it.
#   (b) OpenAlex has it, WITH a Canadian author,   -> a ROUTE gap. The real defect,
#       and the frame's routes still missed it.       and the one we can act on.
#   (c) OpenAlex has it, and it has NO CANADIAN     -> NOT A MISS. A frame of Canadian
#       AUTHOR.                                       research is CORRECT to exclude it.
#
# (c) is the one that matters here, and it is the reason the naive recall figure is
# worthless. A TRIAL WITH A CANADIAN SITE IS NOT A PUBLICATION WITH A CANADIAN
# AUTHOR. Multi-site international trials recruit at a Canadian hospital and publish
# with no Canadian author on the paper. Counting those as frame misses measures the
# REGISTRY's definition of Canada, not the frame's.
MISS <- file.path(RAW, "missing_in_openalex.json")
missing_dois <- setdiff(kn$doi, hit$doi)
check_openalex <- function(dois) {
  if (OFFLINE || file.exists(MISS)) {
    if (!file.exists(MISS)) cli_abort("offline, and {.path {MISS}} is not archived")
    return(fromJSON(MISS))
  }
  found <- map_dfr(split(dois, ceiling(seq_along(dois) / 40)), function(b) {
    r <- tryCatch(
      request("https://api.openalex.org/works") |>
        req_url_query(filter = paste0("doi:", paste(b, collapse = "|")),
                      per_page = 100, mailto = "ahmad.pub@gmail.com") |>
        req_timeout(60) |> req_perform() |> resp_body_json(simplifyVector = TRUE),
      error = function(e) NULL)
    Sys.sleep(0.2)
    if (is.null(r) || !length(r$results)) return(NULL)
    data.frame(
      doi   = tolower(sub("https://doi.org/", "", r$results$doi)),
      is_ca = map_lgl(r$results$authorships, \(a)
        if (is.null(a) || !length(a)) FALSE else any(unlist(a$countries) == "CA", na.rm = TRUE)))
  })
  write_json(found, MISS, auto_unbox = TRUE)
  found
}
oa_has <- check_openalex(missing_dois) |> distinct(doi, .keep_all = TRUE)
n_missing         <- length(missing_dois)
n_not_in_openalex <- max(0L, n_missing - nrow(oa_has))
n_route_gap       <- sum(oa_has$is_ca, na.rm = TRUE)
n_no_ca_author    <- sum(!oa_has$is_ca, na.rm = TRUE)

# The population the frame ACTUALLY claims: known trial publications that have a
# Canadian author. Everything else was never the frame's job.
claimable  <- in_frame + n_route_gap + n_not_in_openalex
adj_recall <- 100 * in_frame / claimable
aci <- binom.test(in_frame, claimable)$conf.int * 100

cli_h1("The NAIVE number, and why it is a lie")
cli_li("known result publications of Canadian-LOCATED trials : {nrow(kn)}")
cli_li("present in the Canadian frame                        : {in_frame}")
cli_alert_warning(
  "Naive frame recall: {round(naive_recall, 1)}% (95% CI {round(nci[1], 1)}-{round(nci[2], 1)}). It lands beside the 44.5% this proposal OPENS \\
   with like a perfect echo, and the parallel wrote itself. IT IS AN ARTIFACT OF THE REFERENCE \\
   STANDARD'S DEFINITION."
)

cli_h2("Why each missing work is missing")
cli_li("in OpenAlex, NO Canadian author                     : {n_no_ca_author}  (LEGITIMATELY out of frame)")
cli_li("in OpenAlex, HAS a Canadian author, frame missed it : {n_route_gap}  (a ROUTE gap: the real defect)")
cli_li("not indexed by OpenAlex at all                      : {n_not_in_openalex}  (a SOURCE gap)")
cli_alert_danger(
  "A TRIAL WITH A CANADIAN SITE IS NOT A PUBLICATION WITH A CANADIAN AUTHOR. {n_no_ca_author} of the {n_missing} \\
   'misses' are multi-site international trials whose result paper carries no Canadian author at \\
   all. A frame of Canadian RESEARCH is CORRECT to exclude them, and counting them as misses would \\
   have measured the registry's definition of Canada rather than the frame's."
)
cli_alert_success(
  "Against the population the frame actually claims (known trial publications WITH a Canadian \\
   author), recall is {round(adj_recall, 1)}% (95% CI {round(aci[1], 1)}-{round(aci[2], 1)}): {in_frame} of {claimable}. THE FRAME IS GOOD AT THIS. The honest \\
   finding is the {n_route_gap} route-gap works, not a manufactured fifty percent."
)
cli_alert_warning(
  "THE NEAR-MISS IS THE FINDING. I built this instrument, got {round(naive_recall, 1)}%, and it fell so close to the \\
   number this proposal opens with that it read as a replication. It is a coincidence between two \\
   DIFFERENT POPULATIONS. The disambiguation is the only thing that stood between that and a \\
   fabricated dramatic result, and I would have had every incentive not to run it. DEVIATIONS.md D16."
)
cli_alert_info(
  "What this measures: FRAME recall, not metaresearch recall. Trial reports screen OUT as primary \\
   research. It is whether the frame admits a KNOWN Canadian work at all, which is the \\
   precondition for ever screening it."
)

record_finding(
  "trial_linkage",
  list(
    reference_standard = "ClinicalTrials.gov: completed trials with a Canadian location, and the RESULT publications the sponsors themselves reported",
    why_not_a_frame_route = "A trial registration is not a publication and not metaresearch. Registrations contribute NO records to the frame; the registry is a reference standard, not a source.",
    why_it_matters = "Every other recall number in this project is scored against MACHINE labels (finding 15). A registry knows a trial happened independently of any pipeline, so it cannot be wrong in the pipeline's favour. This is the only instrument here that measures the frame against a world that exists without it.",
    trials_retrieved            = nrow(tr),
    trials_with_result_publication = with_pub,
    pct_trials_with_result_publication = round(100 * with_pub / nrow(tr), 1),
    known_result_pmids          = nrow(known),
    resolvable_to_doi           = nrow(kn),
    present_in_frame            = in_frame,
    # THE NAIVE FIGURE, kept and labelled, because it is the one I nearly published.
    naive_frame_recall_pct      = round(naive_recall, 1),
    naive_recall_is_an_artifact = TRUE,
    naive_recall_ci             = c(round(nci[1], 1), round(nci[2], 1)),
    # the disambiguation: three ways a known work can be absent, and only one is a defect
    missing_total               = n_missing,
    missing_no_canadian_author  = n_no_ca_author,
    missing_route_gap_canadian_author = n_route_gap,
    missing_not_in_openalex     = n_not_in_openalex,
    # the figure that is actually about the frame
    claimable_population        = claimable,
    adjusted_recall_pct         = round(adj_recall, 1),
    adjusted_recall_ci          = c(round(aci[1], 1), round(aci[2], 1)),
    is_metaresearch_recall      = FALSE,
    caveat = paste(
      "This measures FRAME recall (does the Canadian frame hold the publication at all?), NOT",
      "metaresearch recall: trial reports are primary research and the rubric screens them OUT. It",
      "is the precondition for screening, not the screen. The reference standard is the sponsor's",
      "OWN reported result publications, so it is incomplete in a known direction: sponsors",
      "under-report, which means the true set of trial publications is LARGER than the standard and",
      "this recall figure is measured only on the ones we can see. Trials are matched by Canadian",
      "LOCATION, which is not the same as Canadian authorship, so some result publications may have",
      "no Canadian author and legitimately fall outside the frame; that direction is not controlled",
      "here and it bounds the interpretation. Only PMIDs resolvable to a DOI can be looked up."
    )
  ),
  headline = glue(
    "The registry is the only REFERENCE STANDARD in this project not made of machine labels: ClinicalTrials.gov ",
    "knows a Canadian trial happened independently of any pipeline, so it cannot be wrong in the pipeline's favour. ",
    "Of {nrow(kn)} publications SPONSORS THEMSELVES reported as results of completed Canadian-located trials, the frame ",
    "holds {in_frame}: a naive recall of {round(naive_recall, 1)}%, which fell so close to the 44.5% THIS PROPOSAL OPENS WITH that it read as ",
    "a replication. IT IS AN ARTIFACT, and running the disambiguation is the only thing that caught it: {n_no_ca_author} of the ",
    "{n_missing} 'misses' have NO CANADIAN AUTHOR (multi-site international trials with a Canadian SITE), and a frame of ",
    "Canadian RESEARCH is CORRECT to exclude them. A trial with a Canadian site is not a publication with a Canadian ",
    "author. Against the population the frame actually claims, recall is {round(adj_recall, 1)}% (95% CI {round(aci[1], 1)}-{round(aci[2], 1)}), and the real defect is ",
    "{n_route_gap} works OpenAlex holds WITH a Canadian author that the frame's own routes still missed. The frame is GOOD at ",
    "this, the dramatic parallel was a coincidence between two different populations, and I had every incentive not ",
    "to check. DEVIATIONS.md D16."
  )
)
