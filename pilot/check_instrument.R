#!/usr/bin/env Rscript
# Build guard: the instrument must not contradict itself.
#
# ------------------------------------------------------------------------------
# WHY THIS EXISTS
# ------------------------------------------------------------------------------
# `docs/protocol/rubric.md` tells a screener what the values of `genre` are.
# `docs/protocol/screening-schema.json` tells the same screener what the values of
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
# `docs/protocol/known-defects.json`, which names it, measures it, and says which
# version pays it off; and the next version. A quarantined defect is a DEBT, not a
# dismissal, and the entry is deleted when v2 locks. Anything NOT in that file
# fails the build.

suppressPackageStartupMessages({ library(jsonlite); library(cli); library(glue) })

# THE RUBRIC IS THE CURRENT ONE, NOT A HARDCODED PATH.
#
# This guard was written specifically to catch a codebook that contradicts its own
# schema. It then FAILED TO CATCH EXACTLY THAT IN v2, because the path was hardcoded
# to v1 and v2 is a new file. v2's "Records that cannot be screened" section mandates
# `insufficient_payload` as "a flag distinct from OUT", and the schema's tier enum is
# T1/T2/T3/OUT: v2 requires a value its own output contract cannot express. That is
# D20, committed by the document that fixes D20, in front of a guard aimed at the
# wrong file. See DEVIATIONS.md D25.
#
# WRITING A RULE DOES NOT ENFORCE A RULE. Only a check that runs, ON THE THING THAT
# SHIPPED, enforces a rule.
# THE CURRENT RUBRIC, resolved newest-first. It was hardcoded to v1 once and the guard
# passed while never looking at the instrument that shipped (D25). It then silently kept
# reading v2 after v3 was written, because a path-rewrite during the repo reorg made my
# patch a no-op and Python's .replace() does not complain when it matches nothing.
#
# So the resolution is a LOOP over the known versions, newest first: adding a v4 requires
# adding one string, and forgetting to update this line cannot silently point the guard at
# a document nobody is using.
RUBRIC <- Filter(file.exists, c("docs/protocol/rubric-v3.md",
                                "docs/protocol/rubric-v2.md",
                                "docs/protocol/rubric.md"))[1]
if (is.na(RUBRIC)) cli::cli_abort("no rubric found in docs/protocol/")
SCHEMA  <- "docs/protocol/screening-schema.json"
DEFECTS <- "docs/protocol/known-defects.json"

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

# --- categories: v3 is multi-label, and every value must be DEFINED in the rubric --
#
# The whole point of v3 is that no category is defined from memory. This check is what
# makes that a fact rather than a promise: a category the schema allows but the rubric
# never defines fails the build.
cats <- fromJSON(SCHEMA)$items$properties$categories$items$enum
if (length(cats)) {
  in_rubric <- vapply(cats, \(c) grepl(paste0("`", c, "`"), rubric_txt, fixed = TRUE), logical(1))
  if (!all(in_rubric)) {
    problems <- c(problems, paste0(
      "the schema allows categor(y/ies) '", paste(cats[!in_rubric], collapse = ", "),
      "' that the rubric never defines. Every category must be defined VERBATIM from its own literature."))
  } else {
    cli_alert_success("`categories`: all {length(cats)} the schema allows are defined in the rubric")
  }
}

# --- domain: new in rubric v2.2, checked on the day it was created ---------------
#
# `genre` got two vocabularies and nobody noticed for 16,800 labels (D20). `tier` got
# a value the schema could not express and the guard was looking at the wrong file
# (D25). `domain` is checked from the moment it exists, because the lesson of both is
# that a field is cheapest to police before anyone has screened against it.
dom <- fromJSON(SCHEMA)$items$properties$domain$enum
dom <- dom[!is.na(dom)]
if (length(dom)) {
  in_rubric <- vapply(dom, \(d) grepl(paste0("`", d, "`"), rubric_txt, fixed = TRUE), logical(1))
  if (!all(in_rubric)) {
    problems <- c(problems, paste0(
      "the schema allows domain value(s) '", paste(dom[!in_rubric], collapse = ", "),
      "' that the rubric never defines."))
  } else {
    cli_alert_success("`domain`: all {length(dom)} values the schema allows are defined in the rubric ({paste(dom, collapse=', ')})")
  }
}

# --- confidence: the RULE, not just the enum ------------------------------------
#
# The enum matched all along. The RULE did not, and the rule is what a screener
# actually obeys. The rubric says `low` when the abstract is missing UNLESS THE
# TITLE IS UNAMBIGUOUS; the schema's own description says the rubric REQUIRES `low`
# WHENEVER the abstract is missing. The schema MISQUOTES the rubric.
#
# This is not cosmetic: `low` is what routes a record to human adjudication, and
# 33% of the frame has no abstract, so the disputed clause governs a third of
# everything. Two arms obeying two different rules are not measuring the same thing.
# See DEVIATIONS.md D24.
conf_desc <- fromJSON(SCHEMA)$items$properties$confidence$description
schema_says_always <- grepl("requires .*low.* whenever", conf_desc, ignore.case = TRUE)
rubric_says_unless <- grepl("unless the title is", rubric_txt, ignore.case = TRUE)

if (schema_says_always && rubric_says_unless) {
  if ("confidence-rule-split" %in% quarantined) {
    d <- known[[which(quarantined == "confidence-rule-split")]]
    cli_alert_warning(c(
      "QUARANTINED DEFECT {.strong confidence-rule-split}: the schema says the rubric requires `low` WHENEVER the \\
       abstract is missing; the rubric says `low` UNLESS the title is unambiguous. The schema misquotes the rubric.",
      "i" = "Known, recorded ({d$deviation}), and NOT fixed in place because v1 is locked. Paid off in: {d$paid_off_in}."
    ))
  } else {
    problems <- c(problems,
      "`confidence` has TWO RULES. rubric: `low` UNLESS the title is unambiguous. schema: `low` WHENEVER the abstract is missing. This field ROUTES RECORDS TO HUMAN ADJUDICATION, so the contradiction changes who gets reviewed.")
  }
} else {
  cli_alert_success("`confidence`: the rubric's rule and the schema's gloss of it agree")
}

# --- does the rubric demand a TIER the schema cannot express? --------------------
# The reverse direction of the tier check above, and the one that was missing. The
# old check asked "does the rubric define every tier the schema allows?" and never
# asked "can the schema express every tier the rubric demands?" v2 demands
# `insufficient_payload`; the schema cannot say it.
demanded <- regmatches(rubric_txt, gregexpr("`(insufficient_payload)`", rubric_txt))[[1]]
demanded <- unique(gsub("`", "", demanded))
undeliverable <- setdiff(demanded, schema_tiers)
if (length(undeliverable)) {
  if ("insufficient-payload-not-in-schema" %in% quarantined) {
    d <- known[[which(quarantined == "insufficient-payload-not-in-schema")]]
    cli_alert_warning(c(
      "QUARANTINED DEFECT {.strong insufficient-payload-not-in-schema}: the rubric demands tier value{?s} \\
       {.val {undeliverable}}, which the schema's enum cannot express.",
      "i" = "Known, recorded ({d$deviation}). Paid off in: {d$paid_off_in}."
    ))
  } else {
    # NO cli PLURALIZATION INSIDE glue(). `{?s}` is cli syntax; glue evaluates it as
    # R's `?s` help operator, which returns character(0), so `c(problems, glue(...))`
    # appends NOTHING and this guard reports "self-consistent" while holding an
    # unreported contradiction. That is exactly what it did, in the guard whose job is
    # to catch silent contradictions. See DEVIATIONS.md D25.
    problems <- c(problems, paste0(
      "the rubric DEMANDS the value '", paste(undeliverable, collapse = ", "),
      "' for `tier`, and the schema enum (", paste(schema_tiers, collapse = ", "),
      ") CANNOT EXPRESS it. A screener told to emit a value its output contract forbids ",
      "will emit something else, silently, and each screener will pick a different something."))
  }
} else {
  cli_alert_success("`tier`: the schema can express every value the rubric demands")
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
