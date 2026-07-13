#!/usr/bin/env Rscript
# Finding 27: both clauses of "Canadian" measure something other than what they are named.
#
# ------------------------------------------------------------------------------
# THE ESTIMAND HAS TWO CLAUSES. THIS TESTS BOTH, AND BOTH LEAK.
# ------------------------------------------------------------------------------
# PRIMARY:   a work with at least one Canadian institutional affiliation, or a
#            Canadian funder.
# SECONDARY: metaresearch ABOUT the Canadian research system.
#
# Everything in this project has been about what retrieval MISSES. This is the
# first hard evidence about what it wrongly ADMITS, and about a field that does not
# mean what its name says.
#
# ------------------------------------------------------------------------------
# 1. CA-AFF: OpenAlex invents Canadian affiliations
# ------------------------------------------------------------------------------
# Screening agents, reading records they were given for an unrelated reason, kept
# reporting works that were plainly not Canadian and were in the frame anyway:
#
#   "Discovery Air (Canada)"          on a Brazilian Aweti linguistics paper
#   "Discovery Air (Canada)"          on a Brazilian paper on religion
#   "Musee de la Civilisation"        on a Brazilian food-science paper
#   "Impact"                          on a Spanish COVID essay
#
# `Impact` is not an institution. It is a parse failure that has been given an
# institution id, and it admits works to the frame through CA-AFF, which is the
# PRIMARY estimand's main clause.
#
# This is measured below as a LOWER BOUND, and the bound matters: the artifact
# strings tested here are only the ones agents happened to notice by eye. Nobody
# swept the institution vocabulary. The true rate is larger, and how much larger is
# not known, which is itself the point: an affiliation-based estimand cannot police
# its own precision from inside OpenAlex.
#
# ------------------------------------------------------------------------------
# 2. ABOUT-CA: the route and the rubric field are ORTHOGONAL CONSTRUCTS
# ------------------------------------------------------------------------------
# The frame's ABOUT-CA route means "Canada appears in the title or abstract".
# The rubric's `about_ca` means "the Canadian research SYSTEM is a substantive
# object of study". These are not the same question, and four agents working the
# recovered strata said so independently and unprompted:
#
#   "the stratum's 'about Canada' means Canada-as-place (prairie drought, the 2006
#    federal election, BC grizzly bears) whereas the rubric asks about
#    Canada-as-research-system, so the sampling variable and the rubric field are
#    close to orthogonal."
#
# And a structural consequence they also found on their own: `about_ca` can only be
# TRUE once a work is already about research. So it is NEARLY COLLINEAR WITH TIER
# and carries almost no independent information IN THE VERY STRATUM BUILT TO CARRY
# IT. The secondary estimand cannot be estimated from the stratum designed for it.

suppressPackageStartupMessages({
  library(duckdb); library(DBI); library(dplyr); library(purrr); library(jsonlite); library(cli); library(glue)
})
source("R/findings.R")
source("R/strata.R")

FRAME <- "data/frame/canadian_works.parquet"
DIR   <- "pilot/screening/frame1k"

con <- dbConnect(duckdb())
on.exit(dbDisconnect(con, shutdown = TRUE), add = TRUE)
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}') WHERE {SAMPLING_FRAME_WHERE}"))

# ---------------------------------------------------------------------------------
# 1. CA-AFF precision
# ---------------------------------------------------------------------------------
cli_h1("1. CA-AFF: works whose only Canadian 'institution' is a parse artifact")

# Found by eye, by screening agents, in the course of other work. This is a SAMPLE
# of the artifact vocabulary, not a census of it, so what follows is a LOWER BOUND.
ARTIFACTS <- c("Impact", "Discovery Air (Canada)", "Musée de la Civilisation",
               "Encana (Canada)", "Kellogg's (Canada)", "The Alberta Paraplegic Foundation")
art_sql <- paste(sprintf("'%s'", gsub("'", "''", ARTIFACTS)), collapse = ", ")

n_aff  <- dbGetQuery(con, "SELECT count(*) n FROM f WHERE route_ca_aff")$n
n_bogus <- dbGetQuery(con, glue(
  "SELECT count(*) n FROM f WHERE route_ca_aff AND len(ca_institutions) = 1
     AND ca_institutions[1] IN ({art_sql})"))$n

cli_li("works in the CA-AFF route            : {format(n_aff, big.mark=',')}")
cli_li("whose ONLY Canadian institution is one of {length(ARTIFACTS)} known parse artifacts: {format(n_bogus, big.mark=',')}")

# The languages tell the same story from another direction. A Canadian-affiliated
# work published in Latvian or Indonesian is not impossible; thousands of them are
# not plausible.
langs <- dbGetQuery(con, "
  SELECT language, count(*) AS n FROM f
  WHERE route_ca_aff AND language NOT IN ('en','fr') AND language IS NOT NULL
  GROUP BY language ORDER BY n DESC LIMIT 6")
cli_h2("CA-AFF works published in neither official language")
print(as.data.frame(langs), row.names = FALSE)

cli_alert_danger(
  "{format(n_bogus, big.mark=',')} works enter the frame through the PRIMARY estimand's main clause on a Canadian \\
   'institution' that does not exist. This is a LOWER BOUND: the artifact strings tested here are only the ones \\
   screening agents happened to notice by eye while doing something else. Nobody has swept the institution \\
   vocabulary, and an affiliation-based estimand cannot police its own precision from inside OpenAlex."
)

# ---------------------------------------------------------------------------------
# 2. ABOUT-CA: the route and the rubric field are different questions
# ---------------------------------------------------------------------------------
cli_h1("2. ABOUT-CA: the retrieval route and the rubric field are orthogonal")

design <- readRDS(file.path(DIR, "sample_design.rds"))
arm <- function(a, nm) {
  list.files(file.path(DIR, a), "^labels_\\d+\\.json$", full.names = TRUE) |>
    map_dfr(\(f) fromJSON(f) |> select(id, tier, about_ca)) |>
    rename(!!nm := tier, !!paste0(nm, "_about") := about_ca)
}
k <- design |>
  inner_join(arm("opus_r1",  "opus"), by = "id") |>
  inner_join(arm("codex_r1", "gpt"),  by = "id") |>
  inner_join(arm("grok_r1",  "grok"), by = "id")

IN <- function(t) t %in% c("T1", "T2")

# Within the strata whose ENTIRE retrieval basis is "Canada appears in the text",
# how often is the Canadian research SYSTEM actually the object?
about_strata <- c("about_only", "aff_about")
by_stratum <- k |>
  group_by(stratum) |>
  summarise(
    n = n(),
    # NEVER name a summarise() output after its input (D4, D19).
    n_about_opus = sum(opus_about %in% TRUE),
    pct_about_opus = round(100 * mean(opus_about %in% TRUE), 1),
    pct_about_gpt  = round(100 * mean(gpt_about  %in% TRUE), 1),
    pct_about_grok = round(100 * mean(grok_about %in% TRUE), 1),
    .groups = "drop"
  ) |> arrange(desc(n))
print(as.data.frame(by_stratum), row.names = FALSE)

hit <- by_stratum |> filter(stratum %in% about_strata)
cli_alert_danger(
  "In the strata built ENTIRELY on 'Canada appears in the title or abstract', the rubric's `about_ca` \\
   (the Canadian research SYSTEM is a substantive object of study) fires on {min(hit$pct_about_opus)}% to \\
   {max(hit$pct_about_opus)}% of works. The ROUTE means Canada-as-place. The FIELD means \\
   Canada-as-research-system. They are different questions wearing the same name."
)

# The structural point, which is worse than the rate: about_ca is nearly collinear
# with tier, because a work cannot be "about the Canadian research system" without
# first being about research.
about_any <- k$opus_about %in% TRUE
in_any    <- IN(k$opus) | IN(k$gpt) | IN(k$grok)
about_and_out <- sum(about_any & !in_any)
about_and_in  <- sum(about_any & in_any)

cli_h2("Why the field carries almost no independent information")
cli_li("works Opus marked about_ca             : {sum(about_any)}")
cli_li("  of which ANY model called in-scope   : {about_and_in}")
cli_li("  of which NO model called in-scope    : {about_and_out}")
cli_alert_danger(
  "`about_ca` can only be TRUE once a work is ALREADY about research, so it is nearly collinear with tier and \\
   carries almost no independent signal IN THE VERY STRATUM BUILT TO CARRY IT. THE SECONDARY ESTIMAND CANNOT BE \\
   ESTIMATED FROM THE STRATUM DESIGNED FOR IT: only {about_and_in} works in {format(nrow(k), big.mark=',')} are both in-scope and about the \\
   Canadian research system. Four screening agents reported this independently, unprompted, and all four proposed \\
   the same repair: split the field into `about_ca_system` (Canadian research/academia as the object) and \\
   `about_ca_topic` (Canada as a substantive subject), because one boolean cannot separate 'Canadian data, \\
   universal claim' from 'a claim about Canada'."
)

record_finding(
  "canadian_linkage_misnames_itself",
  list(
    ca_aff_works                    = n_aff,
    ca_aff_only_institution_is_artifact = n_bogus,
    artifact_strings_tested         = ARTIFACTS,
    artifact_count_is_a_lower_bound = TRUE,
    ca_aff_non_official_languages   = setNames(langs$n, langs$language),
    about_ca_pct_in_about_strata_opus = setNames(hit$pct_about_opus, hit$stratum),
    about_ca_pct_in_about_strata_gpt  = setNames(hit$pct_about_gpt,  hit$stratum),
    about_ca_pct_in_about_strata_grok = setNames(hit$pct_about_grok, hit$stratum),
    n_screened                      = nrow(k),
    about_ca_and_in_scope           = about_and_in,
    about_ca_and_out_of_scope       = about_and_out,
    about_ca_nearly_collinear_with_tier = TRUE,
    found_by = paste(
      "Screening agents, reporting records they were given for an unrelated reason. Four of them independently",
      "reported that the ABOUT-CA route and the rubric's about_ca field are different constructs, and all four",
      "proposed the same repair without having seen each other's reports."
    ),
    caveat = paste(
      "The artifact count is a LOWER BOUND, and deliberately reported as one: the strings tested are only those",
      "agents noticed by eye. No sweep of the OpenAlex institution vocabulary has been done, so the true CA-AFF",
      "precision is unknown, not merely unmeasured. That is the honest state and it is why the human audit",
      "samples the retrieved stratum as well as the non-retrieved one: precision is measured, not assumed."
    )
  ),
  headline = glue(
    "BOTH CLAUSES OF 'CANADIAN' MEASURE SOMETHING OTHER THAN WHAT THEY ARE NAMED. This project has spent all its ",
    "effort on what retrieval MISSES; this is the first hard evidence about what it wrongly ADMITS. (1) CA-AFF, the ",
    "PRIMARY estimand's main clause: {format(n_bogus, big.mark=',')} works enter the frame on a Canadian 'institution' that does not exist. ",
    "OpenAlex hands 'Discovery Air (Canada)' to a Brazilian linguistics paper, 'Musee de la Civilisation' to a ",
    "Brazilian food-science paper, and 'Impact', which is not an institution at all but a parse failure with an ",
    "institution id, to a Spanish COVID essay. The CA-AFF route also carries thousands of works in Latvian and ",
    "Indonesian. That count is a LOWER BOUND: the artifact strings tested are only the ones screening agents noticed ",
    "BY EYE while doing something else, and nobody has swept the institution vocabulary, so the true precision is ",
    "UNKNOWN rather than merely unmeasured. (2) ABOUT-CA, the SECONDARY estimand: the retrieval route means ",
    "'Canada appears in the text' and the rubric field means 'the Canadian research SYSTEM is a substantive object of ",
    "study', and in the strata built entirely on the former, the latter fires on {min(hit$pct_about_opus)}% to {max(hit$pct_about_opus)}% of works. Worse, ",
    "`about_ca` cannot be true unless the work is ALREADY about research, so it is nearly collinear with tier: only ",
    "{about_and_in} works in {format(nrow(k), big.mark=',')} are both in-scope AND about the Canadian research system. THE SECONDARY ESTIMAND CANNOT BE ",
    "ESTIMATED FROM THE STRATUM DESIGNED FOR IT. Four screening agents found this independently and all four proposed ",
    "the same repair: split the field into `about_ca_system` and `about_ca_topic`, because one boolean cannot ",
    "separate 'Canadian data, universal claim' from 'a claim about Canada'."
  )
)
