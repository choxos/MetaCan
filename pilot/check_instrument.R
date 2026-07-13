#!/usr/bin/env Rscript
# Build guard: the instrument must not contradict itself.
#
# ------------------------------------------------------------------------------
# WHY THIS EXISTS
# ------------------------------------------------------------------------------
# `protocol/rubric.md` tells a screener what the values of `genre` are.
# `protocol/screening-schema.json` tells the same screener what the values of
# `genre` are. They named DIFFERENT SETS, overlapping on two values out of eleven,
# and both documents went into every prompt.
#
# Every screener resolved the contradiction privately and none of them resolved it
# the same way: two models followed the rubric and are therefore a quarter illegal
# against the schema, and one followed both at once and emitted thirteen distinct
# values. Six thousand labels passed every check that ran, because the validator
# checked `tier` and had never been asked to look at `genre`.
#
# Nothing crashed. That is the whole problem. An instrument that contradicts itself
# does not fail; it produces variance, and the variance gets attributed to the
# models, which is the exact quantity this project exists to measure.
#
# It was caught by an agent mentioning it in a subordinate clause of a report about
# something else. That is not a control. THIS is the control:
#
#     A CODEBOOK IS CODE. IT GETS A TEST.
#
# ------------------------------------------------------------------------------
# WHY IT HAS A QUARANTINE INSTEAD OF JUST FAILING
# ------------------------------------------------------------------------------
# The defect is real and the instrument is LOCKED. Editing rubric v1 now would
# silently re-describe 5,000 works already screened against the old text, which is
# the failure mode this project is built to refuse.
#
# So a defect found after the lock has two honest destinations and no others:
# `protocol/known-defects.json`, which names it, measures it, and says which
# version pays it off; and the next version. A quarantined defect is a DEBT, not a
# dismissal, and the entry is deleted when v2 locks. Anything NOT in that file
# fails the build.

suppressPackageStartupMessages({ library(jsonlite); library(cli); library(glue) })

RUBRIC  <- "protocol/rubric.md"
SCHEMA  <- "protocol/screening-schema.json"
DEFECTS <- "protocol/known-defects.json"

known <- if (file.exists(DEFECTS)) fromJSON(DEFECTS, simplifyVector = FALSE)$defects else list()
quarantined <- vapply(known, \(d) d$id, character(1))

problems <- character(0)

# --- genre: the vocabulary the rubric names vs the enum the schema allows --------
rubric_line <- grep("^`empirical`", readLines(RUBRIC, warn = FALSE), value = TRUE)[1]
if (is.na(rubric_line)) {
  problems <- c(problems, "cannot find the genre vocabulary line in the rubric (it began with `empirical`)")
} else {
  rubric_vocab <- rubric_line |>
    strsplit("·", fixed = TRUE) |> unlist() |> trimws() |> gsub("`", "", x = _) |> (\(x) x[nzchar(x)])()
  schema_vocab <- fromJSON(SCHEMA)$items$properties$genre$enum

  if (!setequal(rubric_vocab, schema_vocab)) {
    if ("genre-vocabulary-split" %in% quarantined) {
      d <- known[[which(quarantined == "genre-vocabulary-split")]]
      cli_alert_warning(c(
        "QUARANTINED DEFECT {.strong genre-vocabulary-split}: the rubric and the schema still name different \\
         `genre` vocabularies, overlapping on {length(intersect(rubric_vocab, schema_vocab))} of \\
         {length(union(rubric_vocab, schema_vocab))} values.",
        "i" = "Known, recorded ({d$deviation}, finding {d$finding}), and NOT fixed in place because v1 is locked. \\
               Paid off in: {d$paid_off_in}."
      ))
    } else {
      problems <- c(problems, glue(
        "`genre` has TWO vocabularies. rubric: {paste(rubric_vocab, collapse=', ')} | ",
        "schema: {paste(schema_vocab, collapse=', ')} | shared: {paste(intersect(rubric_vocab, schema_vocab), collapse=', ')}"
      ))
    }
  } else {
    cli_alert_success("`genre`: the rubric and the schema name the same {length(rubric_vocab)} values")
  }
}

# --- tier: the one field that WAS validated, checked anyway ----------------------
# It has always agreed. That is exactly why it gets a test: the fields nobody
# worries about are the ones that drift without anybody noticing.
schema_tiers <- fromJSON(SCHEMA)$items$properties$tier$enum
rubric_txt   <- paste(readLines(RUBRIC, warn = FALSE), collapse = "\n")
missing_tier <- schema_tiers[!vapply(schema_tiers, \(t) grepl(t, rubric_txt, fixed = TRUE), logical(1))]
if (length(missing_tier)) {
  problems <- c(problems, glue("the schema allows tier{?s} {paste(missing_tier, collapse=', ')}, which the rubric never defines"))
} else {
  cli_alert_success("`tier`: every value the schema allows is defined in the rubric ({paste(schema_tiers, collapse=', ')})")
}

# --- confidence -----------------------------------------------------------------
schema_conf <- fromJSON(SCHEMA)$items$properties$confidence$enum
missing_conf <- schema_conf[!vapply(schema_conf, \(t) grepl(paste0("`", t, "`"), rubric_txt, fixed = TRUE), logical(1))]
if (length(missing_conf)) {
  problems <- c(problems, glue("the schema allows confidence {paste(missing_conf, collapse=', ')}, which the rubric never defines"))
} else {
  cli_alert_success("`confidence`: every value the schema allows is defined in the rubric ({paste(schema_conf, collapse=', ')})")
}

if (length(problems)) {
  cli_h1("THE INSTRUMENT CONTRADICTS ITSELF")
  for (p in problems) cli_li(p)
  cli_abort(c(
    "{length(problems)} unquarantined contradiction{?s} between {.path {RUBRIC}} and {.path {SCHEMA}}.",
    "x" = "A screener handed both documents must obey both. When they disagree it obeys ONE, silently, and its choice \\
           becomes variance that looks like model disagreement.",
    "i" = "Fix the instrument, or, if it is locked and the data are already screened, record the defect in \\
           {.path {DEFECTS}} with the finding that measures it and the version that pays it off. See D20."
  ))
}
cli_alert_success("the instrument is self-consistent ({length(quarantined)} quarantined defect{?s} on record)")
