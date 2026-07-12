#!/usr/bin/env Rscript
# Finding 12: the topic route finds about one in eight of the field, and the
# reason it fails is the most interesting thing in this pilot.
#
# ------------------------------------------------------------------------------
# A CORRECTION, MADE BEFORE SUBMISSION AND KEPT IN THE RECORD
# ------------------------------------------------------------------------------
# An earlier version of this pilot reported "the topic route retrieves 32.4% of
# the field", computed as 14,873 (works the topic route returns) / 45,850 (works
# the base rate implies exist). That number was wrong, and wrong in the direction
# that flattered the design.
#
# It divided a RETRIEVED SET by a TRUE FIELD SIZE. Those are different objects.
# The retrieved set is mostly not metaresearch (precision below), and the works
# it does contain are not a random draw from the field. A ratio of two
# incommensurable quantities is not a coverage estimate; it is arithmetic with no
# estimand behind it.
#
# The right quantity is RECALL, and the screening data measures it directly: of
# the works the rubric calls metaresearch, what fraction does the topic route
# actually retrieve? No extrapolation, no ratio of unlike things: just a 2x2
# against the labels.
#
# ------------------------------------------------------------------------------
# WHY THE ROUTE FAILS, WHICH IS THE POINT
# ------------------------------------------------------------------------------
# OpenAlex assigns primary_topic from a work's CONTENT. A metaresearch paper
# about reporting quality in cardiology trials is, on the page, mostly about
# cardiology, so it is filed under Cardiology, not under Scientometrics.
#
# That is not a bug in OpenAlex. It is what "aboutness" means. But it has a
# consequence that is fatal for topic-based retrieval of THIS field specifically:
#
#   metaresearch is invisible to topic classification precisely BECAUSE it is
#   about other fields.
#
# The more a piece of metaresearch engages seriously with a domain (and the
# best of it does), the more it looks like that domain to a classifier. A
# retrieval strategy built on topics therefore does not just miss some of the
# field at random; it systematically misses the part of the field that is most
# embedded in the disciplines it studies.
#
# This is why the design screens a Canadian frame rather than retrieving a
# metaresearch one, and it is why retrieval routes are kept as PROVENANCE rather
# than promoted to the gate.

suppressPackageStartupMessages({
  library(dplyr); library(jsonlite); library(cli); library(glue)
})
source("R/findings.R")
source("R/frame.R")   # CANDIDATE_TOPICS: the route, by ID

# Score the route on the key that DEFINES it. R/frame.R builds the topic route as
# `primary_topic.id:T10102|T13607|...`, so the route must be scored by ID. An
# earlier version of this script string-matched eleven hand-typed topic display
# NAMES instead, because canadian_works() never SELECTed the ID. That scores a
# different route: display names drift, are not unique, and a typo silently drops
# a topic with no error. (Six of the eleven turn out to have no hits in this
# sample at all, which a name-match cannot distinguish from a typo.) The column
# is now in the snapshot SELECT; see R/snapshot.R.
# The frame is READ, not typed. `FRAME_CANADIAN <- 3507205L` was an EXTRAPOLATION from one
# OpenAlex partition, made before the frame existed; the built frame holds
# 4,299,418 works and the estimate was 18% low. See R/frame_size.R.
source("R/frame_size.R")
FRAME_CANADIAN <- frame_size()
API_ROUTE_SIZE <-   14873L   # what the topic route returned from the API (finding 6)

d <- readRDS("pilot/screening/canadian_sample.rds") |>
  mutate(id = sub(".*/", "", id), topic_id = sub(".*/", "", topic_id))
a <- fromJSON("pilot/screening/screener_a.json")$labels

j <- a |>
  left_join(d |> select(id, topic_id, topic, field), by = "id") |>
  mutate(
    in_scope = tier %in% c("T1", "T2"),
    on_route = !is.na(topic_id) & topic_id %in% CANDIDATE_TOPICS
  )

tp <- sum( j$on_route &  j$in_scope)   # retrieved, and really metaresearch
fp <- sum( j$on_route & !j$in_scope)   # retrieved, and not
fn <- sum(!j$on_route &  j$in_scope)   # MISSED
tn <- sum(!j$on_route & !j$in_scope)

recall    <- tp / (tp + fn)
precision <- tp / (tp + fp)
rc <- binom.test(tp, tp + fn)$conf.int
pc <- binom.test(tp, tp + fp)$conf.int

cli_h1("The topic route, scored directly against the rubric")
print(table(route = ifelse(j$on_route, "topic route", "not retrieved"),
            truth = ifelse(j$in_scope, "metaresearch", "not")))

cli_h2("What it actually does")
cli_li("RECALL    : of the field, how much does it find?  {round(100*recall, 1)}% \\
        (95% CI {round(100*rc[1], 1)}-{round(100*rc[2], 1)}%)")
cli_li("PRECISION : of what it finds, how much is real?   {round(100*precision, 1)}% \\
        (95% CI {round(100*pc[1], 1)}-{round(100*pc[2], 1)}%)")
cli_alert_danger("It MISSES {fn} of the {tp+fn} metaresearch works in the sample.")

cli_h2("Where the missed works were filed instead")
missed <- j |> filter(in_scope, !on_route) |> count(field, sort = TRUE) |> head(6)
print(missed)
cli_alert_info(
  "OpenAlex files a work by what it is ABOUT. Metaresearch about cardiology reads as \\
   cardiology. The field is invisible to topic retrieval precisely because it is about \\
   other fields, and the more seriously a study engages its domain, the more surely it \\
   disappears."
)

cli_h2("The correction")
cli_alert_danger("An earlier draft reported 32.4% coverage (14,873 / 45,850). That was wrong.")
cli_text("It divided a retrieved set by a true field size: incommensurable quantities. \\
          The recall CI ({round(100*rc[1],1)}-{round(100*rc[2],1)}%) excludes 32.4% entirely.")

# --- what does NOT reconcile, stated rather than buried -----------------------
implied <- mean(j$on_route) * FRAME_CANADIAN
cli_h2("What does not reconcile")
cli_alert_warning(
  "The sample puts {round(100*mean(j$on_route), 3)}% of Canadian works on the route, which over the \\
   {format(FRAME_CANADIAN, big.mark=',')}-work frame implies ~{format(round(implied), big.mark=',')} route works. \\
   The API returned {format(API_ROUTE_SIZE, big.mark=',')}: a {round(API_ROUTE_SIZE/implied, 2)}x gap."
)
cli_text(
  "With only {sum(j$on_route)} on-route works in the sample I cannot say why, and neither era \\
   nor abstract availability explains it at this n. The likeliest cause is that one \\
   updated_date partition is not a uniform draw from the frame, which is exactly what \\
   finding 11 measures. RECALL IS UNAFFECTED: it is a within-sample ratio ({tp}/{tp+fn}), not \\
   an extrapolation. But the gap is real and it is not hidden."
)

record_finding(
  "topic_route_recall",
  list(
    n_screened            = nrow(j),
    n_metaresearch        = tp + fn,
    n_retrieved_by_route  = tp + fp,
    true_positives        = tp,
    false_positives       = fp,
    false_negatives       = fn,
    recall_pct            = round(100 * recall, 1),
    recall_ci_lo_pct      = round(100 * rc[1], 1),
    recall_ci_hi_pct      = round(100 * rc[2], 1),
    precision_pct         = round(100 * precision, 1),
    precision_ci_lo_pct   = round(100 * pc[1], 1),
    precision_ci_hi_pct   = round(100 * pc[2], 1),
    missed_works_by_field = as.list(setNames(missed$n, missed$field)),
    scored_by             = "primary_topic.id (the key R/frame.R defines the route with), not display name",
    route_size_implied_by_sample = round(implied),
    route_size_from_api          = API_ROUTE_SIZE,
    reconciliation_gap_x         = round(API_ROUTE_SIZE / implied, 2),
    supersedes            = "the earlier 32.4% figure (14,873/45,850), which divided a retrieved set by a true field size",
    caveat = paste(
      "Small n on the positive class (", tp + fn, "metaresearch works, of which",
      tp + fp, "were on the route), so the intervals are wide. Separately, the",
      "sample-implied route size does not reconcile with the API's 14,873 and I",
      "cannot say why at n =", sum(j$on_route), "on-route works; the likeliest cause",
      "is that one updated_date partition is not a uniform draw (finding 11).",
      "Recall is unaffected: it is a within-sample ratio, not an extrapolation."
    )
  ),
  headline = glue(
    "Scored against the rubric, the topic route retrieves {round(100*recall)}% of Canadian ",
    "metaresearch (95% CI {round(100*rc[1],1)}-{round(100*rc[2],1)}%) at {round(100*precision)}% ",
    "precision: it misses {fn} of {tp+fn}. It fails because OpenAlex files a work by what it is ",
    "about, and metaresearch about cardiology reads as cardiology: the field is invisible to topic ",
    "retrieval precisely because it is about other fields."
  )
)
