#!/usr/bin/env Rscript
# Finding 24: the locked instrument contradicts itself, and nothing caught it.
#
# ------------------------------------------------------------------------------
# WHAT HAPPENED
# ------------------------------------------------------------------------------
# A screening agent, three chunks into an unrelated task, reported in passing that
# it could not code `genre`, because the two documents it had been handed name two
# different controlled vocabularies for that field:
#
#   docs/protocol/rubric.md          empirical . conceptual . editorial/commentary .
#                               policy . infrastructure/announcement . other
#
#   docs/protocol/screening-schema.json
#                               empirical . review . methods . commentary .
#                               editorial . protocol . dataset . software . other
#
# They overlap on TWO values: `empirical` and `other`. Four of the rubric's terms
# do not exist in the schema. Seven of the schema's terms do not exist in the
# rubric. Every screener was handed two incompatible codebooks and told to obey
# both, and each one silently invented its own reconciliation.
#
# ------------------------------------------------------------------------------
# WHY IT SURVIVED SIX THOUSAND LABELS
# ------------------------------------------------------------------------------
# validate_frame1k_labels.R checks that the id set reconciles and that `tier` is
# one of T1/T2/T3/OUT. IT NEVER CHECKED `genre`. So the field was free to be
# anything, and it was: the arms do not even disagree in the same direction.
#
# That is the shape of the error this whole project exists to talk about. It is
# not a hard failure; nothing crashed, no file was malformed, every arm passed
# every check that ran. The variable simply meant a different thing in each arm,
# and the pipeline reported success. An instrument that contradicts itself does
# not announce itself: it produces variance, and the variance gets attributed to
# the models.
#
# ------------------------------------------------------------------------------
# WHAT IS NOT DONE HERE
# ------------------------------------------------------------------------------
# The labels are NOT repaired, remapped, or re-run. Coercing the three arms into a
# common genre vocabulary after the fact would be a researcher-degrees-of-freedom
# move performed on data whose disagreement is the finding. The genre variable
# from this screen is REPORTED AS UNUSABLE and is used for nothing downstream.
#
# The fix belongs in the INSTRUMENT (one vocabulary, in one place, machine-checked
# against the schema before any model runs), and the instrument may only change at
# a version boundary. See docs/protocol/rubric-v2-proposal.md, seam 11.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(cli); library(glue)
})
source("R/findings.R")

DIR <- "pilot/screening/frame1k"

# The two vocabularies, read FROM THE ARTIFACTS rather than retyped here. If the
# rubric or the schema is fixed, this finding must change with it, and hardcoding
# the lists would let the finding go on being true about a document that no longer
# says it.
rubric_line <- grep("^`empirical`", readLines("docs/protocol/rubric.md", warn = FALSE), value = TRUE)[1]
if (is.na(rubric_line)) cli_abort("cannot find the genre vocabulary line in docs/protocol/rubric.md")
RUBRIC_VOCAB <- rubric_line |>
  strsplit("·", fixed = TRUE) |> unlist() |> trimws() |> gsub("`", "", x = _) |> (\(x) x[nzchar(x)])()

SCHEMA_VOCAB <- fromJSON("docs/protocol/screening-schema.json")$items$properties$genre$enum
if (is.null(SCHEMA_VOCAB)) cli_abort("cannot find the genre enum in docs/protocol/screening-schema.json")

only_rubric <- setdiff(RUBRIC_VOCAB, SCHEMA_VOCAB)
only_schema <- setdiff(SCHEMA_VOCAB, RUBRIC_VOCAB)
in_both     <- intersect(RUBRIC_VOCAB, SCHEMA_VOCAB)

cli_h1("Two codebooks for one field")
cli_li("rubric.md          : {paste(RUBRIC_VOCAB, collapse = ' | ')}")
cli_li("screening-schema   : {paste(SCHEMA_VOCAB, collapse = ' | ')}")
cli_alert_danger("they agree on {length(in_both)} value{?s} ({paste(in_both, collapse = ', ')}); \\
                  {length(only_rubric)} exist only in the rubric, {length(only_schema)} only in the schema")

# --- what each arm actually did with the contradiction --------------------------
arm_genres <- function(arm) {
  fs <- list.files(file.path(DIR, arm), "^labels_\\d+\\.json$", full.names = TRUE)
  if (!length(fs)) cli_abort("no labels in {.path {file.path(DIR, arm)}}")
  map_dfr(fs, \(f) fromJSON(f) |> select(any_of(c("id", "genre")))) |>
    mutate(genre = ifelse(is.na(genre) | !nzchar(genre), "<missing>", genre))
}

ARMS <- c(opus = "opus_r1", gpt = "codex_r1", grok = "grok_r1")
tab <- imap_dfr(ARMS, \(dir, nm) {
  g <- arm_genres(dir)
  # NEVER name a summarise() output after its input (DEVIATIONS.md D4, D19).
  tibble(
    arm            = nm,
    n_labels       = nrow(g),
    n_distinct_val = n_distinct(g$genre),
    pct_in_schema  = round(100 * mean(g$genre %in% SCHEMA_VOCAB), 1),
    pct_in_rubric  = round(100 * mean(g$genre %in% RUBRIC_VOCAB), 1)
  )
})

cli_h2("What each arm did when the two codebooks disagreed")
print(as.data.frame(tab), row.names = FALSE)

cli_alert_danger(c(
  "The arms did not resolve the contradiction the same way, and two of them are ILLEGAL against the \\
   schema they were told to conform to.",
  "*" = "GPT-5.6 and Grok followed the RUBRIC: 100% legal there, and {100 - tab$pct_in_schema[tab$arm=='gpt']}% / \\
         {100 - tab$pct_in_schema[tab$arm=='grok']}% of their labels are illegal against the SCHEMA.",
  "*" = "Opus followed BOTH AT ONCE, emitting {tab$n_distinct_val[tab$arm=='opus']} distinct values drawn from \\
         either list depending on the record.",
  "*" = "`tier` was validated. `genre` was NOT. Six thousand labels passed every check that ran."
))

cli_h2("What is done about it")
cli_li("The genre labels from this screen are UNUSABLE and are used for nothing downstream.")
cli_li("They are NOT remapped: coercing three arms into one vocabulary after seeing them is a degree of freedom, not a fix.")
cli_li("The fix is in the INSTRUMENT, at a version boundary: one vocabulary, machine-checked against the schema before any model runs.")

record_finding(
  "instrument_contradicts_itself",
  list(
    field                    = "genre",
    rubric_vocabulary        = RUBRIC_VOCAB,
    schema_vocabulary        = SCHEMA_VOCAB,
    shared_values            = in_both,
    n_shared                 = length(in_both),
    only_in_rubric           = only_rubric,
    only_in_schema           = only_schema,
    arms                     = tab$arm,
    n_labels                 = tab$n_labels,
    n_distinct_values_by_arm = tab$n_distinct_val,
    pct_legal_against_schema = tab$pct_in_schema,
    pct_legal_against_rubric = tab$pct_in_rubric,
    validator_checked_tier   = TRUE,
    validator_checked_genre  = FALSE,
    labels_repaired          = FALSE,
    found_by = paste(
      "An Opus screening agent mentioned it in one clause of a report about something else, while",
      "working chunks it had been given for an unrelated reason. It was not looking for this, no check",
      "was watching for it, and it had already survived 6,000 labels across three models."
    ),
    caveat = paste(
      "The genre variable from this screen is reported as UNUSABLE and is used for nothing. It is not",
      "remapped to a common vocabulary: the three arms resolved the contradiction differently, and",
      "harmonising them after the fact would destroy the only evidence that they did."
    )
  ),
  headline = glue(
    "THE LOCKED INSTRUMENT CONTRADICTS ITSELF, AND NOTHING CAUGHT IT. The rubric and the output schema name TWO ",
    "DIFFERENT controlled vocabularies for the same field, `genre`, overlapping on {length(in_both)} values ",
    "({paste(in_both, collapse = ' and ')}); {length(only_rubric)} terms exist only in the rubric and {length(only_schema)} only in the schema. Every screener was ",
    "handed both and told to obey both, and each invented its own reconciliation: GPT-5.6 and Grok followed the ",
    "rubric and are therefore {100 - tab$pct_in_schema[tab$arm=='gpt']}% and {100 - tab$pct_in_schema[tab$arm=='grok']}% ILLEGAL against the schema, while Opus drew from both lists at ",
    "once and emitted {tab$n_distinct_val[tab$arm=='opus']} distinct values. The validator checked `tier` and never checked `genre`, so ",
    "{format(sum(tab$n_labels), big.mark=',')} labels passed every check that ran. It was found by an agent mentioning it in one clause of a ",
    "report about something else. Nothing crashed; the variable simply meant a different thing in each arm, and the ",
    "variance would have been attributed to the models. The labels are NOT repaired, because harmonising the arms ",
    "after seeing them would destroy the only evidence that they diverged; the genre field is reported as unusable ",
    "and the fix belongs in the instrument, at a version boundary."
  )
)
