#!/usr/bin/env Rscript
# Build guard: refuse to ship a self-masking dplyr summarise/mutate.
#
# ------------------------------------------------------------------------------
# THE BUG THIS EXISTS TO PREVENT, WHICH I HAVE NOW WRITTEN THREE TIMES
# ------------------------------------------------------------------------------
# dplyr evaluates the expressions inside summarise()/mutate() SEQUENTIALLY, in
# the order written. So:
#
#     summarise(n = n(), in_scope = sum(in_scope), rate = 100 * mean(in_scope))
#                        ^^^^^^^^^^^^^^^^^^^^^^^^
#                        this REPLACES the logical column with a scalar count
#
# and `mean(in_scope)` then takes the mean of a length-1 integer, which is that
# integer. `rate` becomes 100 x the COUNT. The result looks like a percentage and
# is off by orders of magnitude.
#
# It published "3100%, 2900%, 1500%" as base rates (DEVIATIONS.md D4). I wrote a
# comment in that script swearing never to do it again. I then did it again in a
# throwaway query the same afternoon, and a THIRD time in
# pilot/22_three_model_screen.R, where it printed 5100% and 4300%.
#
# The lesson does not stick as a habit. It only sticks as a RULE THAT RUNS.
# So it runs, on every build:
#
#     the name on the left of `=` inside summarise()/mutate() may not appear
#     inside an aggregate on the right of that same `=`.
#
# ------------------------------------------------------------------------------
# WHY IT STRIPS COMMENTS FIRST
# ------------------------------------------------------------------------------
# The first version of this check flagged two hits, and BOTH were the warning
# comments in the scripts that already knew about the bug. A guard that cannot
# tell code from a comment about code is not a guard; it is a source of false
# alarms that trains you to ignore it. Comments are stripped before matching.

suppressPackageStartupMessages({ library(cli); library(glue) })

FILES <- c(list.files("pilot", "\\.R$", full.names = TRUE),
           list.files("R",     "\\.R$", full.names = TRUE))
FILES <- setdiff(FILES, "pilot/check_self_masking.R")

AGGS <- c("sum", "mean", "max", "min", "median", "n_distinct", "any", "all", "sd", "var")

# `#` inside a string is not a comment. Strip strings first, then comments; we are
# only looking for identifiers, so losing string contents costs nothing.
strip <- function(line) {
  line <- gsub('"[^"]*"', '""', line)
  line <- gsub("'[^']*'", "''", line)
  sub("#.*$", "", line)
}

hits <- list()
for (f in FILES) {
  src <- strip(readLines(f, warn = FALSE))
  for (i in seq_along(src)) {
    for (a in AGGS) {
      # name = agg(name...)   on one line
      pat <- glue("([A-Za-z._][A-Za-z0-9._]*)\\s*=\\s*{a}\\s*\\(\\s*([A-Za-z._][A-Za-z0-9._]*)")
      m <- regmatches(src[i], regexec(pat, src[i]))[[1]]
      if (length(m) == 3L && m[2] == m[3]) {
        hits[[length(hits) + 1L]] <- list(file = f, line = i, text = trimws(src[i]), name = m[2])
      }
    }
  }
}

if (length(hits)) {
  cli_h1("SELF-MASKING summarise()/mutate() FOUND")
  for (h in hits) cli_li("{h$file}:{h$line}  {.code {h$text}}")
  cli_abort(c(
    "{length(hits)} self-masking assignment{?s}. dplyr evaluates sequentially, so `{hits[[1]]$name} = sum({hits[[1]]$name})` \\
     replaces the column with a scalar and every later reference to it is that scalar.",
    "i" = "Rename the output: `n_{hits[[1]]$name} = sum({hits[[1]]$name})`. This bug published '3100%' as a base rate (DEVIATIONS.md D4) and has been written three times. It does not get a fourth."
  ))
}
cli_alert_success("no self-masking summarise()/mutate() in {length(FILES)} R files")
