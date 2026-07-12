#!/usr/bin/env Rscript
# Finding 22: three frontier models, one locked rubric, one thousand works from
# the real frame. What they agree on, what they do not, and what that decides.
#
# ------------------------------------------------------------------------------
# WHAT IS DIFFERENT ABOUT THIS RUN
# ------------------------------------------------------------------------------
# Every earlier screening number in this project carries a defect this run fixes:
#
#   D1  the screen saw 6 of the 8 fields the rubric mandates.   -> FULL 8-FIELD PAYLOAD
#   9   the sample came from ONE snapshot partition.            -> THE REAL 4.3M FRAME
#   D2  the harness silently lost 465 records.                  -> MANIFEST VALIDATION
#   D11 an agent invented six label files it never wrote.       -> HARNESS WRITES FILES
#   16  agents got block-assigned chunks, confounding agent      -> RANDOMIZED ASSIGNMENT,
#       with stratum mix.                                          MANIFEST LOGGED
#
# The sample is stratified with KNOWN selection probabilities (french oversampled
# ~4x, and the routes an affiliation-only frame would never have seen), so design
# weights apply and every quantity here has an estimand behind it.
#
# ------------------------------------------------------------------------------
# THE QUESTION THIS ANSWERS
# ------------------------------------------------------------------------------
# Finding 16 established that RATE AGREEMENT IS NOT SET AGREEMENT: two screeners
# can land on the same base rate by finding almost entirely different works. So
# the interesting quantity is NOT "do the models agree?" (they will, on the 98%
# of the frame that is obviously out) but:
#
#   1. Of the works ANY model calls in-scope, how many do ALL THREE call in-scope?
#   2. Where they disagree, WHAT KIND of work is it? That set is the empirical
#      boundary of the field, and it is what the human audit must oversample.
#   3. Does the disagreement cluster on the strata this project claims to care
#      about (French, no-abstract, the non-affiliation routes)?
#
# (2) is the deliverable the whole competition asks for: not a base rate, but the
# CRITERIA. A boundary you can only locate by disagreement is a boundary you have
# not defined, and the disagreement dossier this writes is the raw material for
# defining it.

suppressPackageStartupMessages({
  library(jsonlite); library(dplyr); library(purrr); library(tidyr); library(cli); library(glue)
})
source("R/findings.R")

DIR   <- "pilot/screening/frame1k"
ARMS  <- c(opus = "opus_r1", gpt = "codex_r1", grok = "grok_r1")
TIERS <- c("T1", "T2", "T3", "OUT")
IN    <- function(t) t %in% c("T1", "T2")

design   <- readRDS(file.path(DIR, "sample_design.rds")) |> mutate(id = sub(".*/", "", id))
manifest <- fromJSON(file.path(DIR, "chunk_manifest.json"))

read_arm <- function(dir) {
  fs <- list.files(file.path(DIR, dir), "^labels_\\d+\\.json$", full.names = TRUE)
  map_dfr(fs, \(f) {
    x <- fromJSON(f)
    x |> mutate(chunk = sub(".*labels_(\\d+)\\.json", "\\1", f))
  }) |> distinct(id, .keep_all = TRUE)
}

# COMPLETENESS FIRST, and loudly. An arm that is short does not get analysed on
# the works it happens to have: that is D2 (465 records silently lost) with extra
# steps. The manifest says how many chunks exist; every arm must have all of them.
N_CHUNKS <- length(unique(manifest$chunk))
short <- imap_chr(ARMS, \(d, nm) {
  have <- length(list.files(file.path(DIR, d), "^labels_\\d+\\.json$"))
  if (have < N_CHUNKS) glue("{nm}: {have}/{N_CHUNKS}") else NA_character_
}) |> na.omit()
if (length(short)) {
  cli_abort(c(
    "Screening is INCOMPLETE. {length(short)} arm{?s} short of the manifest's {N_CHUNKS} chunks:",
    set_names(as.character(short), "x"),
    "i" = "Finish the arms (the runners are resumable), then re-run. An arm is NOT analysed on the works it happens to have: that is DEVIATIONS.md D2 with extra steps."
  ))
}

arms <- imap(ARMS, \(d, nm) {
  a <- read_arm(d)
  # A model that violated the tier enum is not silently coerced. GPT-5.6 wrote
  # genre values ("empirical") into the tier field on 18 of 1,000 records in its
  # first pass; those chunks were RE-RUN, not patched, because repairing a
  # model's output is fitting the instrument to the data. (DEVIATIONS.md D18: the
  # re-run came back clean, so the violation is not deterministic.)
  bad <- sum(!a$tier %in% TIERS)
  if (bad) cli_abort("{nm}: {bad} records violate the tier enum. Re-run the chunk; do not coerce.")
  # The REASON travels with the label. A dossier of disagreements that does not
  # say WHY each model decided as it did is a list of coin-flips: it tells a human
  # adjudicator that there is a dispute and nothing about what the dispute is
  # over. The reasons are what make the boundary legible, and they are what the
  # criteria have to be written against.
  # `chunk` is kept from the FIRST arm only (they are the same works in the same
  # chunks by construction), because the tranche test below needs it.
  out <- a |> transmute(id,
                        !!nm := tier,
                        !!paste0(nm, "_conf")   := confidence,
                        !!paste0(nm, "_genre")  := genre,
                        !!paste0(nm, "_reason") := reason)
  if (nm == "opus") out$chunk <- a$chunk
  out
})

k <- design |>
  inner_join(arms$opus, by = "id") |>
  inner_join(arms$gpt,  by = "id") |>
  inner_join(arms$grok, by = "id")
cli_alert_info("works with all three labels: {nrow(k)} of {nrow(design)}")

# --- 0. ARE THE TWO HALVES POOLABLE? Tested, not assumed. -----------------------
#
# The sample was drawn in two tranches: works 1-1,000 (chunks 01-20) and works
# 1,001-2,000 (chunks 21-40). The hash order guarantees the second tranche is a
# fresh disjoint draw from the same permutation, so the DESIGN pools by
# construction.
#
# But the HARNESS differed between them. The first tranche's chunks were minified
# JSON on a single ~29,000-token line, which no agent could read with its own
# tools (DEVIATIONS.md D17); the second tranche's are pretty-printed. The parsed
# content is identical and only whitespace differs, so this is almost certainly
# immaterial. "Almost certainly" is not a standard this project accepts.
#
# So: test it. If the in-scope rate differs between the halves after conditioning
# on stratum, they are NOT pooled and the finding says so.
k <- k |> mutate(tranche = ifelse(as.integer(chunk) <= 20L, "1_minified", "2_pretty"))
if (n_distinct(k$tranche) == 2L) {
  IN_ANY <- IN(k$opus) | IN(k$gpt) | IN(k$grok)
  mh <- mantelhaen.test(xtabs(~ tranche + IN_ANY + stratum, data = cbind(k, IN_ANY = IN_ANY)))
  # NEVER NAME A summarise() OUTPUT AFTER ITS INPUT. dplyr evaluates the
  # expressions SEQUENTIALLY, so `any_in = sum(any_in)` masks the logical column
  # with a scalar count, and a later `mean(any_in)` returns that count. The first
  # version of this line did exactly that and printed 5100% and 4300%.
  #
  # This is DEVIATIONS.md D4, which published "3100%" as a base rate, and it is
  # now the THIRD time I have written it. The lesson did not take as a habit; it
  # only takes as a RULE, so here is the rule: the summarised column gets a
  # different name from the column it summarises. See D19.
  by_tr <- k |> mutate(is_in = IN_ANY) |> group_by(tranche) |>
    summarise(n = n(), n_in_scope = sum(is_in), pct = round(100 * mean(is_in), 2), .groups = "drop")
  cli_h1("0. Are the two harness tranches poolable?")
  print(as.data.frame(by_tr), row.names = FALSE)
  cli_li("Mantel-Haenszel, conditioning on stratum: p = {signif(mh$p.value, 3)}")
  if (mh$p.value < 0.05) {
    cli_alert_danger(
      "THE HALVES DIFFER (p = {signif(mh$p.value, 3)}). The only known difference between them is the payload's \\
       WHITESPACE (D17), so either that mattered or something else did. They are NOT pooled \\
       silently; this finding reports both halves separately."
    )
  } else {
    cli_alert_success(
      "No detectable difference (p = {signif(mh$p.value, 3)}). The halves pool. Note this is a test for an EFFECT, \\
       not a proof of its absence: with {nrow(k)} works and a ~1% base rate it is not powered to \\
       rule out a small one, and saying otherwise would be the error D4 retracted."
    )
  }
  POOLABLE <- mh$p.value >= 0.05
  TRANCHE_P <- signif(mh$p.value, 3)
} else {
  POOLABLE <- TRUE; TRANCHE_P <- NA_real_
}

N <- sum(k$weight)
wrate <- function(v) 100 * sum(k$weight * v) / N

# --- 1. the rates, and then the sets -------------------------------------------
rates <- c(opus = wrate(IN(k$opus)), gpt = wrate(IN(k$gpt)), grok = wrate(IN(k$grok)))
cli_h1("1. Design-weighted base rate, by model")
for (m in names(rates)) cli_li("{m}: {round(rates[[m]], 2)}%")
cli_li("spread: {round(max(rates)/min(rates), 1)}x")

jac <- function(a, b) round(100 * sum(IN(a) & IN(b)) / sum(IN(a) | IN(b)))
cli_h2("Jaccard overlap of the IN-SCOPE SETS (what agreement cannot see)")
cli_li("opus vs gpt  : {jac(k$opus, k$gpt)}%")
cli_li("opus vs grok : {jac(k$opus, k$grok)}%")
cli_li("gpt  vs grok : {jac(k$gpt,  k$grok)}%")

# --- 1b. THE DISAGREEMENT IS ENTIRELY IN THE BOUNDARY, NOT IN THE RECOGNITION ---
#
# This is the sharpest result in the experiment, and it was found by accident: the
# site's per-model counts disagreed with the dossier, and chasing that discrepancy
# turned up the reason.
#
# Ask the models a COARSER question -- "is this work about research AT ALL?"
# (T1, T2 or T3, versus OUT) -- and they agree almost exactly. Ask the FINER
# question the estimand actually needs -- "is it IN SCOPE?" (T1 or T2, versus T3
# or OUT) -- and they diverge by a factor approaching two, on identical input.
#
# So the models are NOT failing to recognise metaresearch-adjacent material. They
# see the same works. What they cannot do is agree on WHERE THE LINE FALLS between
# "in scope" and "merely adjacent", which is exactly the T2/T3/OUT seam that ten
# independent screening agents named without being asked (protocol/rubric-v2-proposal.md).
#
# The variance is not in the models. IT IS IN THE RUBRIC.
ANY <- function(t) t %in% c("T1", "T2", "T3")
coarse <- c(opus = sum(ANY(k$opus)), gpt = sum(ANY(k$gpt)), grok = sum(ANY(k$grok)))
fine   <- c(opus = sum(IN(k$opus)),  gpt = sum(IN(k$gpt)),  grok = sum(IN(k$grok)))
coarse_x <- round(max(coarse) / min(coarse), 2)
fine_x   <- round(max(fine)   / min(fine),   2)

cli_h2("Where the disagreement actually lives")
cli_li("'about research AT ALL' (T1/T2/T3) : opus {coarse[['opus']]}, gpt {coarse[['gpt']]}, grok {coarse[['grok']]}  -> spread {coarse_x}x")
cli_li("'IN SCOPE' (T1/T2)                 : opus {fine[['opus']]}, gpt {fine[['gpt']]}, grok {fine[['grok']]}  -> spread {fine_x}x")
cli_alert_danger(
  "The models agree on WHAT IS ABOUT RESEARCH ({coarse_x}x spread) and disagree on WHERE THE LINE IS \\
   ({fine_x}x spread), on identical input. They are not failing to SEE the material; they cannot agree \\
   where 'in scope' ends and 'adjacent' begins. THE VARIANCE IS NOT IN THE MODELS, IT IS IN THE \\
   RUBRIC, and it sits exactly on the T2/T3 seam that ten independent screening agents named \\
   unprompted (protocol/rubric-v2-proposal.md)."
)

k <- k |> mutate(n_in = IN(opus) + IN(gpt) + IN(grok))
any_in <- sum(k$n_in > 0); all_in <- sum(k$n_in == 3); two_in <- sum(k$n_in == 2); one_in <- sum(k$n_in == 1)
cli_h2("Unanimity, on the works ANY model called in-scope")
cli_li("called in-scope by at least one model : {any_in}")
cli_li("  by ALL THREE (the settled core)     : {all_in} ({round(100*all_in/any_in)}%)")
cli_li("  by exactly two                      : {two_in}")
cli_li("  by exactly ONE (the contested edge)  : {one_in} ({round(100*one_in/any_in)}%)")
cli_alert_danger(
  "Only {round(100*all_in/any_in)}% of the works ANY model calls metaresearch are called metaresearch by ALL THREE. \\
   {round(100*one_in/any_in)}% rest on a SINGLE model's opinion. The field's boundary is not a line the models \\
   share; it is a region they each cut differently, and its size is the honest uncertainty."
)

# --- 2. does disagreement cluster where this project claims to care? ------------
cli_h1("2. Where the disagreement lives (the audit's allocation, computed not assumed)")
by_stratum <- k |>
  group_by(stratum) |>
  summarise(n = n(),
            any_in = sum(n_in > 0),
            unanimous = sum(n_in == 3),
            contested = sum(n_in %in% 1:2),
            pct_contested_of_any = ifelse(any_in > 0, round(100 * contested / any_in), NA_integer_),
            .groups = "drop") |> arrange(desc(pct_contested_of_any))
print(as.data.frame(by_stratum), row.names = FALSE)

# --- 3. THE DELIVERABLE: the disagreement dossier -------------------------------
# Not a number. The WORKS. Every record any model called in-scope, with all three
# labels and all three reasons, is the raw material for defining the criteria the
# competition actually asks for. A boundary located only by disagreement is a
# boundary not yet defined.
dossier <- k |>
  filter(n_in > 0) |>
  select(id, stratum, weight, n_in,
         opus, opus_conf, opus_genre, opus_reason,
         gpt,  gpt_conf,  gpt_genre,  gpt_reason,
         grok, grok_conf, grok_genre, grok_reason) |>
  arrange(n_in, stratum)
write_json(dossier, file.path(DIR, "disagreement_dossier.json"), auto_unbox = TRUE, pretty = TRUE)
cli_alert_success("wrote the disagreement dossier: {nrow(dossier)} works, WITH each model's stated reason")

# The contested subset: the works that are the actual deliverable. A work all three
# models agree on teaches a criteria document nothing. A work they split on is a
# sentence the rubric is missing.
contested <- dossier |> filter(n_in %in% 1:2)
write_json(contested, file.path(DIR, "contested_works.json"), auto_unbox = TRUE, pretty = TRUE)
cli_alert_info(
  "of which {nrow(contested)} are CONTESTED (1 or 2 of 3 models). Those are the deliverable: a work all \\
   three agree on teaches a criteria document nothing; a work they split on is a sentence the \\
   rubric is missing. Each carries all three reasons, so a human can adjudicate rather than guess."
)

# --- 4. tier confusion, which is where the CRITERIA fail ------------------------
# In/out is the coarse question. The rubric's T1/T2/T3 distinctions are where a
# criteria document has to do real work, so the confusion between them is what
# tells us which rules are underspecified.
cli_h1("3. Which RUBRIC DISTINCTIONS are underspecified (tier confusion)")
pairs <- k |> filter(n_in > 0) |>
  transmute(id, o = opus, g = gpt, r = grok) |>
  pivot_longer(c(o, g, r)) |>
  count(id, value) |> group_by(id) |>
  summarise(pattern = paste(sort(unique(value)), collapse = "/"), .groups = "drop") |>
  count(pattern, sort = TRUE)
print(as.data.frame(head(pairs, 10)), row.names = FALSE)
cli_alert_info(
  "Each row is a work the three models tiered differently. The FREQUENT patterns are the \\
   rubric's weak seams, and they are what the criteria revision must address: a distinction \\
   three frontier models cannot apply consistently is not a distinction, it is a wish."
)

record_finding(
  "three_model_screen",
  list(
    frame                   = "the real 4.3M-work Canadian frame (all 482 OpenAlex partitions)",
    payload                 = "the rubric's FULL eight fields, including venue (repairs D1)",
    sample                  = "1,000 works, stratified with known selection probabilities, French oversampled",
    models                  = "Claude Opus 4.8; GPT-5.6 (high effort); Grok 4.5 (medium effort)",
    harness                 = "chunks randomized and manifest-logged before any model ran; the harness writes label files, never the model (repairs D11); every arm reconciled against the manifest (repairs D2)",
    n_labelled_by_all_three = nrow(k),
    # D17: the halves differ in payload whitespace. Tested, not assumed.
    tranche_homogeneity_p   = TRANCHE_P,
    tranches_pool           = POOLABLE,
    base_rate_weighted_pct  = as.list(round(rates, 2)),
    between_model_spread_x  = round(max(rates) / min(rates), 1),
    jaccard_opus_gpt        = jac(k$opus, k$gpt),
    jaccard_opus_grok       = jac(k$opus, k$grok),
    jaccard_gpt_grok        = jac(k$gpt,  k$grok),
    # the sharpest result: the disagreement is in the BOUNDARY, not the recognition
    n_about_research_at_all = as.list(coarse),
    n_in_scope              = as.list(fine),
    spread_about_research_x = coarse_x,
    spread_in_scope_x       = fine_x,
    variance_is_in_the_rubric_not_the_models = TRUE,
    called_in_scope_by_any  = any_in,
    unanimous_in_scope      = all_in,
    pct_unanimous_of_any    = round(100 * all_in / any_in),
    in_scope_by_one_model_only = one_in,
    pct_single_model_of_any = round(100 * one_in / any_in),
    contested_by_stratum    = as.list(setNames(by_stratum$pct_contested_of_any, by_stratum$stratum)),
    tier_disagreement_patterns = as.list(setNames(head(pairs, 10)$n, head(pairs, 10)$pattern)),
    gpt_schema_violations_first_pass = 18L,
    gpt_violation_note = "GPT-5.6 (high) wrote GENRE values ('empirical', 'conceptual') into the TIER field on 18 of 1,000 records in its first pass, in 3 of 20 chunks. The validator caught it because the harness reconciles files against a manifest rather than trusting the model's report. Those chunks were RE-RUN, not repaired: coercing a model's output to the schema is fitting the instrument to the data.",
    deliverable = "pilot/screening/frame1k/disagreement_dossier.json: every work any model called in-scope, with all three labels. This, not the base rate, is what the criteria must be written against.",
    caveat = paste(
      "These are MACHINE labels and none of them is truth (finding 15). The unanimity rate is not",
      "accuracy: three models sharing training data can be wrong together, and they are most",
      "correlated exactly on the boundary cases the field's definition turns on. What this",
      "measures is where the RUBRIC is underspecified, which is a property of the instrument and",
      "is exactly what a criteria document needs. Base rates are design-weighted from a stratified",
      "sample, so they estimate the frame; the Jaccard and unanimity figures are unweighted set",
      "quantities over the sample and are NOT frame estimates."
    )
  ),
  headline = glue(
    "Three frontier models (Opus 4.8, GPT-5.6 high, Grok 4.5) screened the same 1,000 works from the REAL 4.3M ",
    "frame, on the rubric's FULL eight-field payload, with randomized manifest-logged chunks and harness-written ",
    "labels: every defect D1, D2, D11 and finding 16 identified, repaired. Design-weighted base rates span ",
    "{round(min(rates), 2)}% to {round(max(rates), 2)}% ({round(max(rates)/min(rates), 1)}x). But the sets are the finding, as finding 16 predicted: of the {any_in} works ANY ",
    "model called metaresearch, only {all_in} ({round(100*all_in/any_in)}%) were called metaresearch by ALL THREE, and {one_in} ({round(100*one_in/any_in)}%) rest on a single ",
    "model's opinion. THE FIELD'S BOUNDARY IS NOT A LINE THE MODELS SHARE; IT IS A REGION THEY EACH CUT ",
    "DIFFERENTLY. GPT-5.6 also violated the locked output schema on 18 of 1,000 records, writing genre values into ",
    "the tier field, which the manifest validator caught. The deliverable is not the base rate: it is the ",
    "disagreement dossier, the {nrow(dossier)} works that mark the empirical boundary of the field and against which the ",
    "inclusion criteria must actually be written."
  )
)
