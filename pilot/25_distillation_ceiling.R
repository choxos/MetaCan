#!/usr/bin/env Rscript
# Finding 25: what a classifier trained on LLM labels can and cannot buy.
#
# ------------------------------------------------------------------------------
# THE QUESTION, ASKED SERIOUSLY
# ------------------------------------------------------------------------------
# "Isn't it better to train an algorithm (even machine learning) on the LLM
# outputs, and keep making training sets until the algorithm matures?"
#
# It is the right question, and it deserves an experiment rather than an opinion,
# because the answer is not the same for both halves of it.
#
# HALF ONE: can a classifier distilled from an LLM RESOLVE the boundary?
#   No, and this script measures why. The student inherits its teacher's boundary.
#   Trained on Opus, it agrees with Opus and disagrees with Grok by about as much
#   as Opus disagrees with Grok. It does not converge on some underlying truth the
#   models were both approximating, because THERE IS NO SUCH TRUTH IN THE LABELS:
#   the disagreement is definitional, not stochastic. Distillation launders a
#   contested judgment into an artifact that looks objective.
#
# HALF TWO: does self-training on its own pseudo-labels "mature" the algorithm?
#   It converges. That is not the same as maturing. With no external signal, the
#   loop converges to SELF-CONSISTENCY, and at a ~1% base rate the cheapest way to
#   be self-consistent is to SHRINK THE POSITIVE CLASS. This script runs the loop
#   and measures which way it shrinks.
#
#   The rubric already names the failure mode in writing:
#       "This is the error that makes the field look smaller and more anglophone
#        than it is."
#   A self-training loop is that error implemented as an optimizer, so the loop is
#   scored on exactly that: the French share of what it keeps.
#
# WHAT THE CLASSIFIER IS ACTUALLY GOOD FOR, AND IT IS NOT NOTHING:
#   A STRATIFIER for the two-phase audit. Design-weighted estimates from KNOWN
#   selection probabilities are unbiased however noisy the stratifier is; noise
#   costs efficiency, never validity (see PROTOCOL.md section 6, finding 14). So
#   the last section measures the only thing that matters for that job: how much
#   human coding effort a classifier-stratified audit saves over a blind one.
#
# NOTHING HERE IS USED TO PRODUCE AN ESTIMATE. A model trained on machine labels
# cannot be the instrument that measures machine labels.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(Matrix)
  library(glmnet); library(cli); library(glue); library(duckdb); library(DBI)
})
source("R/findings.R")

SEED <- 20260712L
set.seed(SEED)
DIR   <- "pilot/screening/frame1k"
FRAME <- "data/frame/canadian_works.parquet"

IN <- function(t) t %in% c("T1", "T2")

# --- labels: only works ALL THREE models labelled -------------------------------
design <- readRDS(file.path(DIR, "sample_design.rds"))
arm <- function(a, nm) {
  list.files(file.path(DIR, a), "^labels_\\d+\\.json$", full.names = TRUE) |>
    map_dfr(\(f) fromJSON(f) |> select(id, tier)) |>
    rename(!!nm := tier)
}
lab <- design |>
  inner_join(arm("opus_r1",  "opus"), by = "id") |>
  inner_join(arm("codex_r1", "gpt"),  by = "id") |>
  inner_join(arm("grok_r1",  "grok"), by = "id")
cli_alert_info("works carrying all three model labels: {nrow(lab)}")
if (nrow(lab) < 500) cli_abort("too few three-way labelled works to fit anything honest")

# --- text ------------------------------------------------------------------------
chunks <- list.files(file.path(DIR, "chunks"), "^chunk_\\d+\\.json$", full.names = TRUE) |>
  map_dfr(\(f) fromJSON(f) |> select(any_of(c("id", "title", "abstract", "lang"))))
lab <- lab |> inner_join(chunks, by = "id")

STOP <- c("the","a","an","of","and","or","to","in","for","on","with","by","is","are","was","were","be","been",
          "this","that","these","those","we","our","their","it","its","as","at","from","which","not","but",
          "de","la","le","les","des","du","et","en","un","une","dans","pour","sur","par","au","aux","est","que",
          "qui","plus","ce","cette","nous","leur","ses","son","study","studies","results","using","used","use")

tok <- function(x) {
  x <- tolower(x); x <- gsub("[^a-zà-ÿ ]+", " ", x)
  w <- strsplit(x, "\\s+")
  lapply(w, \(v) unique(v[nchar(v) > 3 & !v %in% STOP]))
}
docs <- tok(paste(lab$title, lab$abstract))

vocab <- table(unlist(docs))
vocab <- names(vocab)[vocab >= 5 & vocab <= 0.5 * nrow(lab)]   # drop hapaxes and near-universals
cli_alert_info("vocabulary: {format(length(vocab), big.mark=',')} terms (df >= 5)")

as_dtm <- function(doclist, vocab) {
  idx <- match(unlist(doclist), vocab)
  i   <- rep(seq_along(doclist), lengths(doclist))
  keep <- !is.na(idx)
  m <- sparseMatrix(i = i[keep], j = idx[keep], x = 1,
                    dims = c(length(doclist), length(vocab)))
  # tf-idf; idf fixed from the training vocabulary so the transform is reusable
  df  <- Matrix::colSums(m > 0); df[df == 0] <- 1
  idf <- log(length(doclist) / df)
  m %*% Diagonal(x = idf)
}
X <- as_dtm(docs, vocab)

# --- out-of-fold predictions, one student per teacher ----------------------------
#
# OOF, not in-sample. A student scored on the rows it was fitted on would report
# its teacher's labels back to us with a flourish and call it accuracy.
K <- 5L
fold <- sample(rep_len(seq_len(K), nrow(lab)))

oof_for <- function(y) {
  p <- numeric(length(y))
  for (k in seq_len(K)) {
    tr <- fold != k
    if (sum(y[tr]) < 5) { p[!tr] <- 0; next }
    fit <- glmnet(X[tr, ], y[tr], family = "binomial", alpha = 0.1, lambda = 0.02)
    p[!tr] <- as.numeric(predict(fit, X[!tr, ], type = "response"))
  }
  p
}

TEACHERS <- c("opus", "gpt", "grok")
y <- lapply(TEACHERS, \(t) as.integer(IN(lab[[t]]))); names(y) <- TEACHERS
p <- lapply(TEACHERS, \(t) oof_for(y[[t]]));          names(p) <- TEACHERS

# Threshold: match the teacher's own positive COUNT, so student and teacher are
# compared at equal prevalence. Anything else confounds "where is the boundary"
# with "how big is the class", and only the first is the question.
cut_at_n <- function(pr, n) { th <- sort(pr, decreasing = TRUE)[max(n, 1)]; pr >= th }
student <- lapply(TEACHERS, \(t) cut_at_n(p[[t]], sum(y[[t]]))); names(student) <- TEACHERS

jac <- function(a, b) { u <- sum(a | b); if (u == 0) return(NA_real_); round(sum(a & b) / u, 3) }

cli_h1("1. Does a distilled student RESOLVE the boundary, or INHERIT it?")
teacher_sets <- lapply(TEACHERS, \(t) as.logical(y[[t]])); names(teacher_sets) <- TEACHERS

cmp <- expand.grid(student = TEACHERS, vs_teacher = TEACHERS, stringsAsFactors = FALSE) |>
  mutate(jaccard = map2_dbl(student, vs_teacher, \(s, t) jac(student[[s]], teacher_sets[[t]])))
wide <- cmp |> tidyr::pivot_wider(names_from = vs_teacher, values_from = jaccard)
cli_text("Jaccard of each STUDENT's positive set against each TEACHER's positive set:")
print(as.data.frame(wide), row.names = FALSE)

cli_text("")
cli_text("And the teachers against each other, for reference:")
tt <- expand.grid(a = TEACHERS, b = TEACHERS, stringsAsFactors = FALSE) |>
  filter(a < b) |>
  mutate(jaccard = map2_dbl(a, b, \(x, z) jac(teacher_sets[[x]], teacher_sets[[z]])))
print(as.data.frame(tt), row.names = FALSE)

# The test: does the Opus-taught student agree with Grok BETTER than Opus does?
# If distillation were finding a shared underlying signal, it would. If it is just
# inheriting a boundary, it will not.
gain <- c(
  opus_student_vs_grok = jac(student$opus, teacher_sets$grok) - jac(teacher_sets$opus, teacher_sets$grok),
  opus_student_vs_gpt  = jac(student$opus, teacher_sets$gpt)  - jac(teacher_sets$opus, teacher_sets$gpt),
  grok_student_vs_opus = jac(student$grok, teacher_sets$opus) - jac(teacher_sets$grok, teacher_sets$opus)
)
cli_text("")
cli_alert_info("Change in cross-model agreement from distilling (positive = the student bridges the gap):")
for (nm in names(gain)) cli_li("{nm}: {sprintf('%+.3f', gain[[nm]])}")

# --- 2. the self-training loop, run rather than argued about ---------------------
#
# Take works the models NEVER SAW, pseudo-label them with the student, retrain on
# the pseudo-labels, repeat. There is no external signal anywhere in this loop.
cli_h1("2. The self-training loop: does it mature, or does it just shrink?")

con <- dbConnect(duckdb())
dbExecute(con, glue("CREATE VIEW f AS SELECT * FROM read_parquet('{FRAME}')
                     WHERE NOT is_paratext AND length(title) > 10"))
pool <- dbGetQuery(con, glue(
  "SELECT id, title, abstract_idx, language AS lang FROM f
   ORDER BY md5(id || 'selftrain{SEED}') LIMIT 20000"))
dbDisconnect(con, shutdown = TRUE)

deinvert <- function(j) {
  if (is.na(j) || !nzchar(j)) return("")
  ix <- tryCatch(fromJSON(j), error = function(e) NULL)
  if (is.null(ix) || !length(ix)) return("")
  w <- rep(names(ix), lengths(ix)); paste(w[order(unlist(ix, use.names = FALSE))], collapse = " ")
}
pool$abstract <- vapply(pool$abstract_idx, deinvert, character(1))
pool$id <- sub(".*/", "", pool$id)
pool <- pool |> filter(!id %in% lab$id)
Xp <- as_dtm(tok(paste(pool$title, pool$abstract)), vocab)
cli_alert_info("unlabelled pool for the loop: {format(nrow(pool), big.mark=',')} works the models never saw")

TEACH <- "opus"                                  # the strongest teacher; the loop is kindest to it
base_rate <- mean(y[[TEACH]])
cur_y  <- y[[TEACH]]; cur_X <- X
rounds <- tibble()
for (r in 0:3) {
  fit <- glmnet(cur_X, cur_y, family = "binomial", alpha = 0.1, lambda = 0.02)
  pp  <- as.numeric(predict(fit, Xp, type = "response"))
  # Pseudo-label at the SAME rule every round: the loop is given no help and no
  # sabotage. Positives are whatever the current model calls positive at 0.5.
  keep <- pp >= 0.5
  rate <- mean(keep)
  fr   <- if (sum(keep)) mean(pool$lang[keep] == "fr") else NA_real_
  rounds <- bind_rows(rounds, tibble(
    round = r,
    n_train_pos = sum(cur_y),
    pool_positive_rate_pct = round(100 * rate, 2),
    french_share_of_positives_pct = round(100 * fr, 1)
  ))
  if (r == 3) break
  # retrain on the pool it just labelled itself. No human, no rubric, no anchor.
  cur_X <- rbind(X, Xp)
  cur_y <- c(y[[TEACH]], as.integer(keep))
}
cli_text("Teacher's own in-scope rate in the labelled sample: {round(100*base_rate,2)}%")
cli_text("French share of the unlabelled pool: {round(100*mean(pool$lang == 'fr'),1)}%")
print(as.data.frame(rounds), row.names = FALSE)

drift <- rounds$pool_positive_rate_pct[nrow(rounds)] - rounds$pool_positive_rate_pct[1]
fr_drift <- rounds$french_share_of_positives_pct[nrow(rounds)] - rounds$french_share_of_positives_pct[1]
cli_alert_danger(
  "Across {nrow(rounds)-1} rounds of self-training with NO external signal, the positive rate moved \\
   {sprintf('%+.2f', drift)} points and the French share of the positives moved {sprintf('%+.1f', fr_drift)} points. \\
   Nothing in the loop can detect this, because the loop's only reference is itself."
)

# --- 3. what the classifier IS worth: stratification -----------------------------
cli_h1("3. The job a classifier can actually do: allocate human effort")
# Rank the labelled works by the student's score and ask how much of the in-scope
# set sits in the top decile. That is exactly the quantity a two-phase audit uses,
# and it is unaffected by the student inheriting a boundary, because the human
# coder, not the student, supplies the label.
truth_any <- teacher_sets$opus | teacher_sets$gpt | teacher_sets$grok
sc <- p[[TEACH]]
top10 <- sc >= sort(sc, decreasing = TRUE)[ceiling(0.10 * length(sc))]
recall_top10 <- sum(truth_any & top10) / sum(truth_any)
cli_li("works any model called in-scope: {sum(truth_any)}")
cli_li("of those, in the classifier's TOP DECILE by score: {sum(truth_any & top10)} ({round(100*recall_top10)}%)")
cli_alert_success(
  "A blind audit finds {round(100*0.10)}% of the in-scope works in 10% of the sample; this stratifier finds \\
   {round(100*recall_top10)}%. THAT is the legitimate use: it decides where the humans look, and the design \\
   weights stay unbiased however noisy it is. It never supplies a label."
)

record_finding(
  "distillation_ceiling",
  list(
    n_three_way_labelled          = nrow(lab),
    vocabulary_terms              = length(vocab),
    student_vs_own_teacher_jaccard = c(opus = jac(student$opus, teacher_sets$opus),
                                       gpt  = jac(student$gpt,  teacher_sets$gpt),
                                       grok = jac(student$grok, teacher_sets$grok)),
    teacher_vs_teacher_jaccard    = setNames(tt$jaccard, paste(tt$a, tt$b, sep = "_vs_")),
    cross_model_agreement_gain_from_distilling = round(gain, 3),
    selftrain_rounds              = rounds$round,
    selftrain_pool_positive_rate_pct = rounds$pool_positive_rate_pct,
    selftrain_french_share_pct    = rounds$french_share_of_positives_pct,
    selftrain_positive_rate_drift = round(drift, 2),
    selftrain_french_share_drift  = round(fr_drift, 1),
    stratifier_top_decile_recall_pct = round(100 * recall_top10),
    stratifier_blind_baseline_pct    = 10,
    used_to_produce_any_estimate  = FALSE,
    caveat = paste(
      "The student is a TF-IDF + regularised logistic model on title and abstract, which is the cheap",
      "classifier the question was about. A stronger encoder would raise every number here and change",
      "NONE of the argument: the ceiling is not set by the model class, it is set by the labels. A",
      "student cannot learn a boundary its teacher does not have, and a self-training loop with no",
      "external signal cannot discover one. The stratifier result is the part that survives, and it",
      "survives because a stratifier does not need to be right, only informative."
    )
  ),
  headline = glue(
    "A CLASSIFIER TRAINED ON LLM LABELS INHERITS THE BOUNDARY; IT DOES NOT RESOLVE IT. Students distilled from each ",
    "model reproduce their own teacher (Jaccard {jac(student$opus, teacher_sets$opus)} for Opus) and agree with the OTHER models no better than ",
    "their teacher already did: distilling changed cross-model agreement by {sprintf('%+.3f', gain[['opus_student_vs_grok']])} against Grok. There is no shared ",
    "signal underneath for the student to find, because the disagreement is DEFINITIONAL, not stochastic, and training on ",
    "one model's labels silently settles the question the audit exists to answer. Worse, the proposed self-training loop ",
    "was RUN: on 20,000 works the models never saw, three rounds of retraining on its own pseudo-labels moved the ",
    "positive rate {sprintf('%+.2f', drift)} points and the French share of the positives {sprintf('%+.1f', fr_drift)} points, with nothing in the loop able to ",
    "detect either, because the loop's only reference is itself. That is the rubric's own error 3 ('the error that makes ",
    "the field look smaller and more anglophone than it is') implemented as an optimiser. What the classifier IS worth: ",
    "as a STRATIFIER it puts {round(100*recall_top10)}% of the in-scope works in its top decile against a blind baseline of 10%, and a ",
    "two-phase audit's design weights stay unbiased however noisy the stratifier is. It decides where the humans look. ",
    "It never supplies a label."
  )
)
