#!/usr/bin/env Rscript
# Pin the two Canadian entity lists the frame needs, from OpenAlex's OWN metadata.
#
# WHY THIS IS NOT A HAND-TYPED LIST, AND WHY THAT MATTERS
#
# An earlier version of R/frame_lexicon.R hardcoded six Canadian funder IDs from
# memory. THREE WERE WRONG (they pointed at other funders), and the route matched
# 12,844 works in a partition where affiliation matched 6,202. A funder route that
# outruns the affiliation route by 2x is a bug announcing itself.
#
# Then, with the IDs corrected, the list was still only FOUR funders: CIHR, NSERC,
# SSHRC, CFI. OpenAlex knows **2,182 Canadian funders**. The four I chose miss
# Canada Research Chairs (42,824 works), Government of Canada (24,131), the
# National Research Council (19,425), Mitacs (16,874), Genome Canada, Brain Canada,
# every provincial agency, and every university that funds its own people.
#
# The fix is the project's own thesis, applied a third time: REPLACE A CURATED LIST
# WITH AN EXTERNAL, CHECKABLE CRITERION. OpenAlex records `country_code` on funders
# and on sources. So the Canadian funders are "the funders OpenAlex says are
# Canadian", and the Canadian venues are "the sources OpenAlex says are Canadian".
# Not my judgement, not my memory, and auditable by anyone.
#
# The lists are PINNED to a file here so the harvest is reproducible and so a
# reviewer can diff them.

suppressPackageStartupMessages({library(duckdb); library(DBI); library(glue); library(cli)})
dir.create("data/frame", recursive = TRUE, showWarnings = FALSE)

con <- dbConnect(duckdb())
dbExecute(con, "INSTALL httpfs; LOAD httpfs;")
dbExecute(con, "CREATE OR REPLACE SECRET (TYPE s3, PROVIDER config, KEY_ID '', SECRET '');")

for (e in c("funders", "sources")) {
  uri <- glue("s3://openalex/data/parquet/{e}/**/*.parquet")
  out <- glue("data/frame/canadian_{e}.parquet")
  dbExecute(con, glue("
    COPY (SELECT id, display_name, country_code, works_count
          FROM read_parquet('{uri}') WHERE country_code = 'CA')
    TO '{out}' (FORMAT parquet);"))
  n <- dbGetQuery(con, glue("SELECT count(*) n, sum(works_count) w FROM read_parquet('{out}')"))
  cli_alert_success("{e}: {format(n$n, big.mark=',')} Canadian, covering {format(n$w, big.mark=',')} works")
}
dbDisconnect(con, shutdown = TRUE)
