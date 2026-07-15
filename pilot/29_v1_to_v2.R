#!/usr/bin/env Rscript
# Finding 29: what did writing the missing sentences actually change?
#
# ------------------------------------------------------------------------------
# THE MEASUREMENT NOBODY MAKES
# ------------------------------------------------------------------------------
# Every screening project revises its codebook. Almost none of them measure what the
# revision did, because by the time the codebook is fixed the old labels have been
# thrown away and the ambiguity was never written down in the first place.
#
# This one can, and only because the sequence was:
#
#   1. LOCK v1.
#   2. Screen 5,600 works with three models against it.
#   3. Have an independent blinded judge adjudicate every disagreement AND NAME THE
#      SEAM that produced it, giving a frequency-weighted census of the rubric's
#      missing sentences.
#   4. PUBLISH the census.
#   5. Write v2 against the census, and lock it BEFORE re-screening.
#   6. Re-screen, and report the difference. Whatever it is.
#
# Step 4 is what makes step 6 honest. The ambiguity was enumerated and published
# BEFORE it was resolved, so v2 cannot be quietly tuned until the numbers improve.
#
# ------------------------------------------------------------------------------
# WHAT THIS CAN AND CANNOT CLAIM
# ------------------------------------------------------------------------------
# The re-screen covers the 179 CONTESTED works: the ones the three models split on
# under v1. That is a set SELECTED FOR DISAGREEMENT, so:
#
#   IT CAN say: of the disagreements v2's rules were written to resolve, how many
#               did they actually resolve?
#
#   IT CANNOT say: agreement across the whole frame rose from X to Y. Regression to
#               the mean alone would move a set selected for disagreement, and any
#               number computed here would flatter v2 for free.
#
# The unbiased version is a full re-screen of all 5,600 under v2, which is
# prespecified and is what the funded work runs. This is the targeted test, scoped
# to the claim it can support, and the distinction is stated rather than blurred.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(cli); library(glue)
})
source("R/findings.R")

DIR <- "pilot/screening/frame1k"
V2  <- file.path(DIR, "v2")

load_arm <- function(dir, pat, nm) {
  fs <- list.files(dir, pat, full.names = TRUE)
  if (!length(fs)) cli_abort("no labels in {.path {dir}}")
  map_dfr(fs, \(f) fromJSON(f) |> select(id, tier)) |> rename(!!nm := tier)
}

v1 <- fromJSON(file.path(DIR, "disagreement_dossier.json")) |>
  filter(!(opus == gpt & gpt == grok)) |>
  select(id, v1_opus = opus, v1_gpt = gpt, v1_grok = grok)

v2 <- load_arm(file.path(V2, "opus_v2"),  "^labels_\\d+\\.json$", "v2_opus") |>
  inner_join(load_arm(file.path(V2, "codex_v2"), "^labels_\\d+\\.json$", "v2_gpt"),  by = "id") |>
  inner_join(load_arm(file.path(V2, "grok_v2"),  "^labels_\\d+\\.json$", "v2_grok"), by = "id")

k <- inner_join(v1, v2, by = "id")
if (nrow(k) != nrow(v1))
  cli_abort("{nrow(k)} works have both v1 and v2 labels but {nrow(v1)} were contested; \\
             an incomplete re-screen cannot be compared")
cli_alert_success("all {nrow(k)} contested works re-screened under v2 by all three models")

unan <- function(a, b, c) a == b & b == c
k <- k |> mutate(
  v1_unanimous = unan(v1_opus, v1_gpt, v1_grok),   # FALSE for all, by construction
  v2_unanimous = unan(v2_opus, v2_gpt, v2_grok)
)
stopifnot("the contested set is not contested" = !any(k$v1_unanimous))

resolved <- sum(k$v2_unanimous)
cli_h1("Did writing the missing sentences resolve the disagreements?")
cli_li("works the three models split on under v1 : {nrow(k)} (all of them, by construction)")
cli_li("works they now AGREE on under v2         : {resolved} ({round(100*resolved/nrow(k))}%)")
cli_li("still contested under v2                 : {nrow(k) - resolved}")

# Agreement is a low bar: three models can agree on the WRONG tier. So also report
# the direction of travel, which is what the rules were actually written to do.
IN <- function(t) t %in% c("T1", "T2")
k <- k |> mutate(
  v1_in_any = IN(v1_opus) | IN(v1_gpt) | IN(v1_grok),
  v2_in_any = IN(v2_opus) | IN(v2_gpt) | IN(v2_grok),
  v2_in_all = IN(v2_opus) & IN(v2_gpt) & IN(v2_grok)
)
cli_h2("Where the works went")
print(as.data.frame(k |> count(v2_opus, v2_gpt, v2_grok, sort = TRUE) |> head(6)), row.names = FALSE)

# RULE 1 was written to push method-BUILDING out of T1. Did it?
pair_spread <- function(col) {
  n <- c(opus = sum(IN(k[[paste0(col, "_opus")]])),
         gpt  = sum(IN(k[[paste0(col, "_gpt")]])),
         grok = sum(IN(k[[paste0(col, "_grok")]])))
  n
}
n1 <- pair_spread("v1"); n2 <- pair_spread("v2")
cli_h2("In-scope calls on these works, by model")
cli_li("v1: opus {n1[['opus']]}, gpt {n1[['gpt']]}, grok {n1[['grok']]}  -> spread {round(max(n1)/max(min(n1),1), 2)}x")
cli_li("v2: opus {n2[['opus']]}, gpt {n2[['gpt']]}, grok {n2[['grok']]}  -> spread {round(max(n2)/max(min(n2),1), 2)}x")

jac <- function(a, b) { u <- sum(a | b); if (!u) return(NA_real_); round(sum(a & b)/u, 3) }
j1 <- c(jac(IN(k$v1_opus), IN(k$v1_gpt)), jac(IN(k$v1_opus), IN(k$v1_grok)), jac(IN(k$v1_gpt), IN(k$v1_grok)))
j2 <- c(jac(IN(k$v2_opus), IN(k$v2_gpt)), jac(IN(k$v2_opus), IN(k$v2_grok)), jac(IN(k$v2_gpt), IN(k$v2_grok)))
cli_li("pairwise Jaccard of the in-scope sets: v1 mean {round(mean(j1, na.rm=TRUE), 2)} -> v2 mean {round(mean(j2, na.rm=TRUE), 2)}")

if (resolved / nrow(k) >= 0.5) {
  cli_alert_success(
    "v2 resolved {round(100*resolved/nrow(k))}% of the disagreements it was written against. The seams were real and \\
     naming them was sufficient."
  )
} else {
  cli_alert_warning(
    "v2 resolved only {round(100*resolved/nrow(k))}% of the disagreements it was written against. NAMING THE SEAMS WAS \\
     NOT ENOUGH. That is a result and it is reported as one: it says the residual disagreement is not a \\
     documentation problem, and the human audit is carrying more weight than the rubric revision can take off it."
  )
}
cli_alert_info(
  "SCOPE. These 179 works were SELECTED FOR DISAGREEMENT, so this measures whether v2's rules resolve the cases \\
   they were written for. It does NOT measure agreement across the frame: regression to the mean alone would move \\
   a set selected this way, and a global claim from it would flatter v2 for free. The unbiased test is a full \\
   re-screen of all 5,600 under v2, which is prespecified and is what the funded work runs."
)

record_finding(
  "v1_to_v2",
  list(
    contested_under_v1   = nrow(k),
    unanimous_under_v2   = resolved,
    pct_resolved         = round(100 * resolved / nrow(k)),
    still_contested      = nrow(k) - resolved,
    in_scope_by_model_v1 = n1,
    in_scope_by_model_v2 = n2,
    jaccard_v1_mean      = round(mean(j1, na.rm = TRUE), 3),
    jaccard_v2_mean      = round(mean(j2, na.rm = TRUE), 3),
    sequence = paste(
      "lock v1; screen 5,600 works with three models; have an independent blinded judge adjudicate every",
      "disagreement AND name the seam that caused it; PUBLISH the seam census; write v2 against the census and",
      "lock it BEFORE re-screening; re-screen; report the difference, whatever it is. Publishing the census",
      "before resolving it is what stops v2 being tuned until the numbers improve."
    ),
    caveat = paste(
      "SELECTED FOR DISAGREEMENT. These 179 works are exactly the ones the three models split on under v1, so",
      "this measures whether v2's rules resolve the cases they were written for. It CANNOT support a claim about",
      "agreement across the frame: regression to the mean alone would move a set selected this way. The unbiased",
      "test is a full re-screen of all 5,600 under v2, prespecified, and it is what the funded work runs."
    )
  ),
  headline = glue(
    "UNDER V2, {round(100*resolved/nrow(k))}% OF THE SELECTED V1 MODEL DISAGREEMENTS BECAME UNANIMOUS. The 179 works ",
    "three frontier models split on under rubric v1 were re-screened, by the same three models, under a v2 whose ",
    "rules were written against a published, frequency-weighted census of WHICH SENTENCES THE RUBRIC WAS MISSING. ",
    "{resolved} of {nrow(k)} are now unanimous, and the pairwise Jaccard of the in-scope sets moves from {round(mean(j1, na.rm=TRUE), 2)} to {round(mean(j2, na.rm=TRUE), 2)}. The ",
    "comparison was fixed by publishing the seam census before v2 was evaluated. SCOPE, stated rather than blurred: ",
    "these works were SELECTED FOR DISAGREEMENT, so this shows how the same models changed on the cases used to develop ",
    "the revision; it does NOT say frame-wide agreement or accuracy rose, because ",
    "regression to the mean alone would move a set selected this way. The unbiased test is a full re-screen of ",
    "all 5,600 under v2, prespecified, and it is what the funded work runs."
  )
)
