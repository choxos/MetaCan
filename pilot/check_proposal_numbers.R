#!/usr/bin/env Rscript
# Fail the build if the proposal quotes a number the pilot does not produce.
#
# ------------------------------------------------------------------------------
# WHY THIS EXISTS
# ------------------------------------------------------------------------------
# The proposal claimed the topic route "covers about a third of the field". The
# pilot said 12%. Both numbers sat in this repository, in different files, for
# hours. Nothing complained, because nothing was checking.
#
# The renderer already refuses to let findings.json drift from the write-up
# (pilot/render_findings.R aborts on an unknown finding). But the PROPOSAL is
# hand-written prose, and prose is exactly where a number goes stale: you fix the
# code, regenerate the figures, and forget the sentence.
#
# So every numeric literal in the proposal must either (a) appear in
# findings.json, or (b) be listed below with a reason. There is no third option.
# A number with no provenance does not ship.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(stringr); library(cli)
})

PROPOSAL <- "proposal/metacan-proposal.md"
FINDINGS <- "pilot/results/findings.json"

# Numbers that are legitimately NOT pilot outputs. Each needs a reason; an
# unexplained entry here is just the original bug with extra steps.
ALLOWED <- c(
  "44.5"  = "prior work: linkage sensitivity (nihrtrials)",
  "94.3"  = "prior work: linkage PPV (nihrtrials)",
  "2000"  = "frame start year / audit codings (2,000)",
  "2025"  = "frame end year",
  "2026"  = "snapshot release year",
  "1"     = "section numbers, '#1', 'one is French', ordinals",
  "2"     = "section numbers, page limit",
  "3"     = "section numbers, '#3'",
  "4"     = "section number",
  "5"     = "half-width +/-5pp",
  "9.2"   = "NSERC:SSHRC ratio (finding: canadian_linkage)",
  "43392" = "polysemy: reproducibility hits (finding: polysemy)",
  "0.8"   = "polysemy: on-topic share (finding: polysemy)",
  "4516"  = "topics enumerated (finding: topics)",
  "64"    = "affiliation gap (finding: affiliation_gap)",
  "379"   = "erudit harvestable sets (finding: erudit)",
  "59"    = "capture-recapture absurdity (finding: capture_recapture_fails)",
  "1.9"   = "observed Canadian share of world metaresearch",
  "17537" = "cursor calls (finding: openalex_is_metered)",
  "8.2"   = "days per API pass (finding: openalex_is_metered)",
  "1000"  = "API credits per window; audit n ~ 1,000",
  "400"   = "audit sample: screened-in",
  "600"   = "audit sample: screened-out",
  "65"    = "audit: coder-hours",
  "40"    = "pilot: concurrent agents",
  "0.3"   = "width of the binomial interval being criticised",
  "10"    = "date arithmetic in the work plan",
  "11"    = "work plan weeks; API window hours",
  "12"    = "work plan weeks",
  "27"    = "conference date",
  "6"     = "work plan weeks",
  "0.023" = "chi-square p, abstract (finding: base_rate_robustness)",
  "0.91"  = "chi-square p, era (finding: base_rate_robustness)",
  "4.6"   = "model version: Claude Sonnet 4.6 (a name, not a claim)",
  "5.6"   = "model version: GPT-5.6 (a name, not a claim)"
)

flat <- function(x, prefix = "") {
  if (is.list(x)) return(unlist(imap(x, \(v, k) flat(v, paste0(prefix, k, "."))), use.names = TRUE))
  setNames(as.character(x), prefix)
}
store  <- fromJSON(FINDINGS, simplifyVector = FALSE)
values <- flat(store)

# CRITICAL: drop the fields that exist to describe what is WRONG.
#
# `supersedes` and `caveat` record retracted numbers on purpose: the supersedes
# note for finding 12 contains the string "the earlier 32.4% figure". Mining
# numbers out of them and then treating those numbers as PRODUCED is exactly
# backwards: it makes the record of an error into a licence to repeat it. The
# first version of this check did that, and duly waved 32.4% straight through.
#
# A number is only "produced" if it is an ANSWER, not a post-mortem.
#
# Match on substring, not an anchored suffix: flat() emits doubled leaf names
# with a trailing dot ("...values.supersedes...values.supersedes."), so a `$`
# anchor silently matches nothing and the filter becomes a no-op. Which is
# precisely how the first version of this filter failed to filter anything.
values <- values[!str_detect(names(values), "supersedes|caveat")]
stopifnot("the retracted-field filter matched nothing; check flat()'s leaf names" =
            !any(str_detect(values, fixed("32.4"))))

# Every numeric string the pilot produced, in every plausible rendering.
produced_num <- values |>
  keep(\(v) !is.na(suppressWarnings(as.numeric(v)))) |>
  map_chr(as.character) |>
  as.numeric()

# Numbers also appear inside generated headline prose ("45,850 works"), so mine
# the strings too.
in_prose <- values |>
  map(\(v) str_extract_all(v, "[0-9][0-9,\\.]*")[[1]]) |>
  unlist() |> str_remove_all(",") |> as.numeric() |> discard(is.na)

known <- unique(c(produced_num, in_prose, as.numeric(names(ALLOWED))))

txt  <- paste(readLines(PROPOSAL, warn = FALSE), collapse = "\n")
# Strip the URL in the subtitle and any code spans; those carry no claims.
txt  <- str_remove_all(txt, "`[^`]*`")
nums <- str_extract_all(txt, "[0-9][0-9,\\.]*[0-9]|[0-9]")[[1]] |>
  str_remove_all(",") |> str_remove("\\.$") |> unique()
nums <- suppressWarnings(as.numeric(nums)) |> discard(is.na)

# A quoted figure must match the pilot EXACTLY as written. No fuzzy tolerance:
# the first version allowed 0.5%, which let 32.4 match the 32.3 that happens to
# be the low end of a precision CI. Two numbers that are close are not the same
# number, and a proposal that rounds should round to a value the pilot emitted.
#
# The ONE exception is the thousands shorthand, which is a rendering rather than
# a different number: "$24.5k" is 24,484; "281k" is 280,576; "37k-83k" is 37,032
# to 83,022. That keeps the provenance link instead of an allow-list entry.
matches <- function(n) {
  any(abs(known - n) < 1e-9) ||                                   # exact
  any(abs(known - n * 1e3) / pmax(abs(known), 1) < 0.015)         # "24.5k", "281k"
}

orphans <- nums |> discard(matches)

cli_h1("Proposal numbers vs the pilot")
cli_li("numeric literals in the proposal : {length(nums)}")
cli_li("distinct values the pilot emits  : {length(unique(known))}")

if (length(orphans)) {
  cli_abort(c(
    "x" = "{length(orphans)} number{?s} in the proposal {?is/are} not produced by any pilot script and {?is/are} not on the allow-list: {.val {orphans}}",
    "i" = "Either derive it in pilot/ (preferred), or add it to ALLOWED with a reason.",
    "!" = "This check exists because 'the topic route covers a third of the field' shipped once. It will not ship again."
  ))
}
cli_alert_success("Every number in the proposal is traceable to the pilot or to a declared source.")
