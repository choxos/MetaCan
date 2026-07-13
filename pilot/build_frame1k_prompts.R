#!/usr/bin/env Rscript
# Build one self-contained prompt file per chunk for the three-screener test.
#
# NEUTRAL by construction. The archived full_payload_prompt.txt editorializes
# ("VENUE IS THE ONE THAT MATTERS MOST"), and that editorial is what disqualified
# the p8_guided arm from the payload contrast (finding 16). Here the prompt is:
# the locked rubric, verbatim; the schema; the records. No commentary on which
# field matters. All three models receive byte-identical prompts.

suppressPackageStartupMessages({ library(glue); library(cli) })

DIR     <- "pilot/screening/frame1k"
PROMPTS <- file.path(DIR, "prompts")
dir.create(PROMPTS, showWarnings = FALSE)

rubric <- paste(readLines("docs/protocol/rubric.md", warn = FALSE), collapse = "\n")

instruction <- '
--------------------------------------------------------------------------------
You are screening works for MetaCan, a map of Canadian metaresearch.

Apply the rubric above to every record in the JSON array below. Return a JSON
array with one object per work, conforming to docs/protocol/screening-schema.json:

  {"id": "W...", "tier": "T1|T2|T3|OUT", "genre": "...", "about_ca": true|false,
   "confidence": "high|medium|low", "reason": "one sentence"}

Rules:
- Return the JSON array and NOTHING else. No prose, no preamble, no code fences.
- Every input id must appear exactly once in the output.
- Do not run commands, read files, or browse. Classify from the RECORDS alone.

RECORDS:
'

for (f in list.files(file.path(DIR, "chunks"), pattern = "^chunk_\\d+\\.json$", full.names = TRUE)) {
  ch <- sub(".*chunk_(\\d+)\\.json", "\\1", f)
  writeLines(paste0(rubric, instruction, paste(readLines(f, warn = FALSE), collapse = "\n")),
             file.path(PROMPTS, glue("prompt_{ch}.txt")))
}
cli_alert_success("{length(list.files(PROMPTS))} prompt files in {.path {PROMPTS}}")
cli_li("bytes per prompt: ~{format(round(mean(file.size(list.files(PROMPTS, full.names=TRUE)))), big.mark=',')}")
