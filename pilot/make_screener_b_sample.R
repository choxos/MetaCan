#!/usr/bin/env Rscript
# Build the stratified sample that screener B (GPT-5.6 / codex) will label.
#
# Why not simply run B over all 6,202 records?
#
# Because metaresearch is a RARE class inside Canadian research: on screener A's
# labels, low single digits. If two screeners both label ~6,000 obvious rejects
# OUT, raw agreement is ~98% and Cohen's kappa becomes unstable and misleading:
# the statistic is dominated by the cell where agreement is free. This is the
# well-known kappa paradox with skewed marginals, and reporting a headline kappa
# from it would be worse than reporting nothing.
#
# So B labels a sample STRATIFIED ON A'S LABEL, with the contested strata taken
# whole and the settled stratum sampled:
#
#   - every record A called T1 or T2          (the positives; take all)
#   - every record A called T3                (paratext; take all)
#   - every record A was NOT confident about  (the boundary; take all)
#   - a random draw from A's confident OUTs   (the settled mass; sample)
#
# Agreement is then reported per stratum, and the overall figure is reconstructed
# with design weights rather than read off a skewed 2x2. The selection
# probabilities are recorded here so the weighting is not guesswork later.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(cli); library(glue)
})

set.seed(20260711)
N_OUT_SAMPLE <- 600L   # from the confident-OUT stratum

a <- fromJSON("pilot/screening/screener_a.json")$labels
recs <- readRDS("pilot/screening/canadian_sample.rds") |>
  mutate(id = sub(".*/", "", id))

d <- a |>
  mutate(
    stratum = case_when(
      tier %in% c("T1", "T2")        ~ "positive",
      tier == "T3"                   ~ "paratext",
      confidence %in% c("low", "medium") ~ "boundary",
      TRUE                           ~ "settled_out"
    )
  )

cli_h1("Screener A's labels, by stratum")
print(d |> count(stratum, sort = TRUE))

take_all <- d |> filter(stratum != "settled_out")
settled  <- d |> filter(stratum == "settled_out")
n_settled <- nrow(settled)

sampled <- settled |> slice_sample(n = min(N_OUT_SAMPLE, n_settled))

samp <- bind_rows(take_all, sampled) |>
  mutate(
    # Inverse of the selection probability. The settled stratum is the only one
    # that was sampled; everything else was taken with certainty.
    sel_prob = if_else(stratum == "settled_out", nrow(sampled) / n_settled, 1),
    weight   = 1 / sel_prob
  )

cli_h2("What screener B will label")
print(samp |> count(stratum, sel_prob = round(sel_prob, 3), sort = TRUE))
cli_alert_info("total for B: {nrow(samp)} of {nrow(d)} ({round(100*nrow(samp)/nrow(d), 1)}%)")

out <- samp |>
  left_join(recs |> select(id, title, abstract, year = publication_year,
                           lang = language, type),
            by = "id") |>
  mutate(abstract = ifelse(is.na(abstract), "", substr(abstract, 1, 1500)),
         lang     = ifelse(is.na(lang), "unk", lang))

saveRDS(samp |> select(id, stratum, sel_prob, weight),
        "pilot/screening/b_design.rds")

dir.create("pilot/screening/chunks_b", showWarnings = FALSE)
N <- 60L                                     # small chunks: codex sessions are slow
chunks <- split(out |> select(id, title, abstract, year, lang, type),
                ceiling(seq_len(nrow(out)) / N))
for (i in seq_along(chunks)) {
  write_json(chunks[[i]], sprintf("pilot/screening/chunks_b/chunk_%02d.json", i),
             auto_unbox = TRUE)
}
cli_alert_success("wrote {length(chunks)} chunks for screener B (~{N} records each)")
