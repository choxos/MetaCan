#!/usr/bin/env Rscript
# Finding 16: the cheap model does not do the rubric, and the noise INSIDE one
# model is at least the size of the difference BETWEEN models.
#
# ------------------------------------------------------------------------------
# WHY THIS WAS RUN
# ------------------------------------------------------------------------------
# Finding 13 budgets the entire screen on a HAIKU-CLASS model. That single choice
# is what makes the study affordable. NOBODY HAD TESTED WHETHER HAIKU CAN DO THE
# RUBRIC. A cost model for a screener that cannot screen is not a cost model.
#
# So: 1,290 works that already carry Claude Sonnet 4.6 (screener A) and GPT-5.6
# (screener B) labels were screened again by Haiku 4.5, across three agents, on
# the same six-field payload the pilot used.
#
# ------------------------------------------------------------------------------
# RESULT 1: THE RATES AGREE AND THE WORKS DO NOT
# ------------------------------------------------------------------------------
# Design-weighted base rates look reassuringly close, and design-weighted
# agreement between Haiku and Sonnet is 98%. On those numbers alone Haiku is a
# cheap Sonnet and finding 13's budget is a bargain.
#
# It is not. The overlap of the in-scope SETS (Jaccard) is a fraction of the
# Sonnet-GPT overlap, and it gets WORSE design-weighted, not better; both
# versions are computed below and both are reported, because reporting only the
# unweighted one (the flattering one) alongside weighted rates would be mixing
# estimands in a single headline.
#
# Agreement and kappa cannot see any of this, because both are dominated by the
# settled OUTs where agreement is free. This is the kappa paradox in its purest
# form. RATE AGREEMENT IS NOT SET AGREEMENT, and the budget in finding 13
# quietly assumed it was.
#
# ------------------------------------------------------------------------------
# RESULT 2: AGENTS OF ONE MODEL DISAGREE, AND THE TEST THAT SHOWS IT IS THE
# ADJUSTED ONE
# ------------------------------------------------------------------------------
# Three agents screened each arm. SAME model, SAME rubric, SAME prompt within an
# arm. The first version of this script compared their raw rates with a plain
# chi-square and asserted, in a comment, that the strata were "mixed across
# chunks, not blocked (verified)".
#
# THAT VERIFICATION DID NOT EXIST, AND THE CLAIM IS FALSE. External adversarial
# review computed what this script had only asserted: the stratum mix differs by
# agent at p ~ 1e-17 (agent-1's package was 60% boundary works; agent-2's was
# 28%). So the unadjusted test confounds "agents apply different thresholds"
# with "agents got different packages". DEVIATIONS.md D13.
#
# The repair is to test WITHIN stratum: a Mantel-Haenszel test stratified on the
# design stratum, and a permutation test that reshuffles labels within stratum.
# Both run below, on both arms. The heterogeneity SURVIVES the adjustment in
# both, and in the first arm the adjusted p is SMALLER than the confounded one:
# the confound was masking the effect, not creating it.
#
# And the agents' ORDERING FLIPS between arms: the agent with the highest rate
# in one arm has the lowest in the other. This is not three stable
# personalities; it is instability, which is worse.
#
# ------------------------------------------------------------------------------
# WHAT IS DEMOTED, AND WHY
# ------------------------------------------------------------------------------
# The first version led with a "13.2x design-weighted spread" between agents.
# That number is real arithmetic and bad evidence: it rests on one agent's FIVE
# settled-out positives carrying weight ~8 each, against another agent's zero.
# A ratio whose numerator is five high-leverage events is not a headline. It is
# still computed and recorded (as `spread_weighted_x_leverage_sensitive`), but
# the claim now rests on the RAW spreads and the stratum-adjusted tests, which
# are the defensible versions, and they are enough: the within-model raw spread
# meets or exceeds the between-model spread in both arms.
#
# ------------------------------------------------------------------------------
# THE SECOND ARM, NAMED PRECISELY
# ------------------------------------------------------------------------------
# Three arms were run in total. `p8_guided` (eight-field payload, a prompt that
# editorialised about venue) is CONFOUNDED for the payload question and is not
# used for it; but its three agents shared one prompt, so it is internally valid
# for the between-agent question, and it replicates the heterogeneity. `p8n`
# (the neutral-prompt payload arm) is NOT USED AT ALL: one of its agents
# reported, per chunk and in detail, six label files it never wrote, and only
# 700 of 1,290 labels exist on disk (DEVIATIONS.md D11). No payload effect is
# reported from any arm, because no untainted payload contrast exists.
#
# ------------------------------------------------------------------------------
# WHAT THIS DOES TO THE PROJECT
# ------------------------------------------------------------------------------
#   - Finding 13's cheap-model budget rests on an assumption now falsified:
#     Haiku is not a cheap Sonnet. It is a different screener that happens to
#     land on a similar rate.
#   - Finding 10's screener-swap range UNDERSTATES the uncertainty: the noise
#     within one model is at least that size.
#   - The base rate is not identified by machine screening at ANY price.
#   - The human audit is not "the study's validation". It is the only instrument
#     this project has that measures anything.
#   - A machine screen can still STRATIFY the audit (design weights stay
#     unbiased under a noisy stratifier; only efficiency suffers), which is the
#     role the proposal now gives it.

suppressPackageStartupMessages({
  library(dplyr); library(jsonlite); library(purrr); library(cli); library(glue)
})
source("R/findings.R")

# Reads a labels directory and REFUSES to be quietly incomplete.
#
# The first version tolerated everything: a parse failure became NULL and
# vanished, `distinct()` swallowed duplicates, and the downstream `inner_join`
# dropped unlabelled works without a word. That tolerance is exactly how D11's
# fabricated-files event nearly entered the analysis, and D2's 465 silently lost
# records before it. An analysis of INSTRUMENT UNRELIABILITY that silently
# repairs its own instrument's gaps is self-refuting. So: every file must parse,
# every id must appear exactly once, and the caller states how many labels a
# complete arm holds.
read_labels <- function(dir, n_files, n_labels) {
  fs <- list.files(dir, pattern = "^labels_\\d+\\.json$", full.names = TRUE)
  if (length(fs) != n_files)
    cli_abort("{.path {dir}}: {length(fs)} label files, expected {n_files}. An incomplete arm is not analysed (D11).")
  out <- map_dfr(fs, \(f) {
    x <- tryCatch(fromJSON(f), error = function(e)
      cli_abort("{.path {f}} does not parse: {conditionMessage(e)}"))
    if (!is.data.frame(x) || !all(c("id", "tier") %in% names(x)))
      cli_abort("{.path {f}} is not a labels frame")
    x |> mutate(chunk = sub(".*labels_(\\d+)\\.json", "\\1", f))
  })
  dup <- out$id[duplicated(out$id)]
  if (length(dup)) cli_abort("{.path {dir}}: {length(dup)} duplicate id{?s}, e.g. {.val {dup[1]}}")
  if (nrow(out) != n_labels)
    cli_abort("{.path {dir}}: {nrow(out)} labels, expected {n_labels}. Missing labels are D2's failure mode.")
  out
}
IN <- function(t) t %in% c("T1", "T2")

# Chunks were assigned to agents in consecutive blocks at run time: chunks 1-5
# to agent-1, 6-9 to agent-2, 10-13 to agent-3, with no reassignment (each
# chunk's labels were written exactly once; the p8n arm, where an agent claimed
# chunks it never wrote, is excluded above for exactly that reason).
assign_agents <- function(k) {
  k |> mutate(agent = case_when(as.integer(chunk) <= 5 ~ "agent-1",
                                as.integer(chunk) <= 9 ~ "agent-2",
                                TRUE                   ~ "agent-3"))
}

ab <- readRDS("pilot/screening/haiku/ab_labels.rds")

join_arm <- function(dir) {
  j <- ab |> select(id, tier_a, tier_b, stratum, weight) |>
    inner_join(read_labels(dir, n_files = 13L, n_labels = nrow(ab)) |>
                 select(id, tier_h = tier, chunk), by = "id") |>
    assign_agents()
  # The join must be lossless: a label whose id is not in the design sample, or a
  # sampled work with no label, is a harness fault, not a row to drop.
  if (nrow(j) != nrow(ab))
    cli_abort("{.path {dir}}: join kept {nrow(j)} of {nrow(ab)} works; ids do not reconcile")
  j
}

k  <- join_arm("pilot/screening/haiku/p6")
kg <- join_arm("pilot/screening/haiku/p8_guided")

N <- sum(k$weight)
wrate <- function(v) sum(k$weight * v) / N

# --- 1. rates agree, sets do not ----------------------------------------------
ai <- wrate(IN(k$tier_a)); bi <- wrate(IN(k$tier_b)); hi <- wrate(IN(k$tier_h))
jac  <- function(x, y) round(100 * sum(IN(x) & IN(y)) / sum(IN(x) | IN(y)))
wjac <- function(x, y) round(100 * sum(k$weight[IN(x) & IN(y)]) / sum(k$weight[IN(x) | IN(y)]))
agree <- function(x, y) round(100 * sum(k$weight * (IN(x) == IN(y))) / N, 1)

cli_h1("1. The rates agree. The WORKS do not.")
cli_li("Sonnet 4.6 : {round(100*ai, 2)}%     GPT-5.6 : {round(100*bi, 2)}%     Haiku 4.5 : {round(100*hi, 2)}%")
cli_li("design-weighted agreement, Haiku vs Sonnet : {agree(k$tier_h, k$tier_a)}%")
cli_h2("Jaccard overlap of the IN-SCOPE SETS (unweighted / design-weighted)")
cli_li("Sonnet vs GPT   : {jac(k$tier_a, k$tier_b)}% / {wjac(k$tier_a, k$tier_b)}%")
cli_li("Sonnet vs Haiku : {jac(k$tier_a, k$tier_h)}% / {wjac(k$tier_a, k$tier_h)}%")
cli_li("GPT    vs Haiku : {jac(k$tier_b, k$tier_h)}% / {wjac(k$tier_b, k$tier_h)}%")
pos <- k |> filter(IN(tier_a))
cli_alert_danger(
  "Of the {nrow(pos)} works Sonnet called in scope, Haiku agrees on {sum(IN(pos$tier_h))}. They reach a similar \\
   NUMBER by finding almost entirely DIFFERENT WORKS, and {agree(k$tier_h, k$tier_a)}% agreement cannot see it. \\
   Weighting makes the overlap WORSE, not better."
)

# --- 2. the between-agent variance, tested honestly ----------------------------
arm_tests <- function(kk, label) {
  ag <- kk |> group_by(agent) |>
    summarise(n = n(), pos = sum(IN(tier_h)),
              raw_pct = round(100 * mean(IN(tier_h)), 2),
              wtd_pct = round(100 * sum(weight * IN(tier_h)) / sum(weight), 2),
              .groups = "drop")

  # The stratum mix differs by agent (that is the confound), so the primary test
  # conditions on stratum.
  mix_p <- suppressWarnings(chisq.test(table(kk$agent, kk$stratum))$p.value)
  cmh_p <- mantelhaen.test(xtabs(~ agent + IN(tier_h) + stratum, data = kk))$p.value

  set.seed(42)
  stat_obs <- suppressWarnings(chisq.test(table(kk$agent, IN(kk$tier_h)))$statistic)
  perm <- replicate(2000, {
    ks <- kk |> group_by(stratum) |> mutate(p = sample(IN(tier_h))) |> ungroup()
    suppressWarnings(chisq.test(table(ks$agent, ks$p))$statistic)
  })
  perm_p <- mean(perm >= stat_obs)

  cli_h2("{label}")
  print(as.data.frame(ag), row.names = FALSE)
  cli_li("stratum mix differs by agent      : p = {format(mix_p, digits = 3)}  <- the confound the first draft missed")
  cli_li("Mantel-Haenszel, WITHIN stratum   : p = {signif(cmh_p, 3)}")
  cli_li("permutation, WITHIN stratum       : p = {signif(perm_p, 3)}")
  list(ag = ag, mix_p = mix_p, cmh_p = cmh_p, perm_p = perm_p,
       raw_spread = round(max(ag$raw_pct) / min(ag$raw_pct), 1),
       wtd_spread = round(max(ag$wtd_pct) / max(min(ag$wtd_pct), 1e-9), 1))
}

cli_h1("2. SAME MODEL. SAME RUBRIC. SAME PROMPT. Different agents.")
t6 <- arm_tests(k,  "arm 1: six-field payload (the pilot's)")
t8 <- arm_tests(kg, "arm 2: eight-field payload, guided prompt (valid ONLY for the between-agent contrast)")

# The between-model spread, computed from the same 1,290 works rather than typed
# from memory of finding 10.
BETWEEN_MODEL_X <- round(max(ai, bi, hi) / min(ai, bi, hi), 1)

# Does the agent ordering even replicate across arms? (No. That is the point.)
rank6 <- t6$ag$agent[order(-t6$ag$raw_pct)]
rank8 <- t8$ag$agent[order(-t8$ag$raw_pct)]

cli_alert_danger(
  "Heterogeneity between agents of ONE model survives stratum adjustment in BOTH arms \\
   (CMH p = {signif(t6$cmh_p, 2)} and {signif(t8$cmh_p, 2)}). Raw within-arm spreads: {t6$raw_spread}x and {t8$raw_spread}x, \\
   against {BETWEEN_MODEL_X}x BETWEEN models. And the agents' ordering FLIPS between arms \\
   ({paste(rank6, collapse = ' > ')} vs {paste(rank8, collapse = ' > ')}): not stable thresholds, instability."
)
cli_alert_warning(
  "The first draft led with a {t6$wtd_spread}x design-weighted spread. That figure rests on five \\
   high-weight events in one agent and is leverage-sensitive; it is recorded, demoted, and not the claim."
)

# --- 3. the pilot's own 40 agents ---------------------------------------------
a  <- fromJSON("pilot/screening/screener_a.json")$labels
pc <- list.files("pilot/screening/chunks", "^chunk_", full.names = TRUE) |> sort() |>
  map_dfr(\(f) tibble(chunk = sub(".*chunk_(\\d+).*", "\\1", f), id = fromJSON(f)$id)) |>
  inner_join(a |> select(id, tier), by = "id") |>
  group_by(chunk) |> summarise(n = n(), k = sum(IN(tier)), .groups = "drop") |> filter(n > 50)
ctp <- suppressWarnings(chisq.test(cbind(pc$k, pc$n - pc$k)))
zero <- sum(pc$k == 0)

cli_h1("3. Is the PILOT exempt? No, and the honest answer is careful.")
cli_li("40-agent fan-out, {nrow(pc)} chunks")
cli_li("chunks that found ZERO metaresearch : {zero}")
cli_li("range : 0% to {round(100*max(pc$k/pc$n), 2)}%")
cli_li("homogeneity chi-square p = {signif(ctp$p.value, 3)}")
cli_alert_warning(
  "NOT significant, and each chunk expects ~{round(mean(pc$k), 1)} events, so this is LOW POWER, NOT \\
   evidence of homogeneity. Reading p > 0.05 as 'the agents agree' is the exact error finding 11 \\
   made and retracted (D4). The pilot is UNINFORMATIVE on agent homogeneity: it cannot rule the \\
   instability in, and it cannot rule it out."
)

record_finding(
  "agent_variance",
  list(
    n_works                   = nrow(k),
    base_rate_sonnet_pct      = round(100 * ai, 2),
    base_rate_gpt_pct         = round(100 * bi, 2),
    base_rate_haiku_pct       = round(100 * hi, 2),
    agreement_haiku_sonnet_pct = agree(k$tier_h, k$tier_a),
    # the sets, which agreement cannot see; both estimands, and weighting is worse
    jaccard_sonnet_gpt_pct    = jac(k$tier_a, k$tier_b),
    jaccard_sonnet_haiku_pct  = jac(k$tier_a, k$tier_h),
    jaccard_gpt_haiku_pct     = jac(k$tier_b, k$tier_h),
    wjaccard_sonnet_gpt_pct   = wjac(k$tier_a, k$tier_b),
    wjaccard_sonnet_haiku_pct = wjac(k$tier_a, k$tier_h),
    wjaccard_gpt_haiku_pct    = wjac(k$tier_b, k$tier_h),
    sonnet_positives          = nrow(pos),
    haiku_agrees_on           = sum(IN(pos$tier_h)),
    # the between-agent variance: confound named, tests conditioned on stratum
    agent_rates_raw_pct       = as.list(setNames(t6$ag$raw_pct, t6$ag$agent)),
    stratum_mix_differs_by_agent_p = signif(t6$mix_p, 3),
    arm1_cmh_p                = signif(t6$cmh_p, 3),
    arm1_permutation_p        = signif(t6$perm_p, 3),
    arm1_raw_spread_x         = t6$raw_spread,
    arm2_cmh_p                = signif(t8$cmh_p, 3),
    arm2_permutation_p        = signif(t8$perm_p, 3),
    arm2_raw_spread_x         = t8$raw_spread,
    agent_order_replicates    = identical(rank6, rank8),
    spread_weighted_x_leverage_sensitive = t6$wtd_spread,
    between_model_spread_x    = BETWEEN_MODEL_X,
    within_at_least_matches_between = min(t6$raw_spread, t8$raw_spread) >= BETWEEN_MODEL_X,
    # the pilot
    pilot_chunks              = nrow(pc),
    pilot_agents_finding_zero = zero,
    pilot_between_agent_p     = signif(ctp$p.value, 3),
    pilot_underpowered_not_homogeneous = TRUE,
    caveat = glue(
      "The first draft's between-agent test was CONFOUNDED: the stratum mix differs by agent ",
      "(p = {format(t6$mix_p, digits = 2)}), and the draft asserted a verification that did not exist (DEVIATIONS.md ",
      "D13). The tests above condition on stratum, and the heterogeneity survives in both arms. ",
      "The 13.2x design-weighted spread the draft led with rests on five high-weight events and is ",
      "demoted to a recorded, leverage-sensitive descriptive. THE INFERENCE IS SCOPED: there are ",
      "three agents per arm, assigned consecutive chunk blocks without randomisation or a run-time ",
      "manifest, so these p-values license 'these runs are not exchangeable', not a population claim ",
      "about agents in general; that is exactly enough to break a budget that assumed exchangeability, ",
      "and the full study assigns agents randomised, manifest-logged, fixed-size chunks with a ",
      "duplicate-agent reliability arm. The pilot's own agents give ",
      "p = {signif(ctp$p.value, 3)} on ~{round(mean(pc$k), 1)} expected events per chunk: underpowered, so the pilot is ",
      "uninformative on agent homogeneity, not exonerated. Haiku was tested on the six-field payload ",
      "(the pilot's own deviation, D1) and on a guided eight-field arm, so the defensible conclusion ",
      "is 'not shown to be an interchangeable measurer, and unstable in the arms tested', not 'cannot ",
      "screen'. An eight-field neutral-prompt arm is not used at all: one agent claimed six label ",
      "files it never wrote (D11), so no payload effect is reported from any arm. The guided arm is ",
      "used ONLY for the between-agent contrast, which its shared prompt leaves internally valid."
    )
  ),
  # EVERY NUMBER HERE IS INTERPOLATED, INCLUDING THE ONES THAT READ AS PROSE.
  # The first draft typed "six found zero" next to a computed 5 and "p = 0.136"
  # next to a computed 0.113 (DEVIATIONS.md D12). Nothing in this headline is a
  # literal.
  headline = glue(
    "Haiku, the model finding 13 budgets the entire screen on, lands near Sonnet's base rate ",
    "({round(100*hi,2)}% vs {round(100*ai,2)}%) and agrees with it on {agree(k$tier_h, k$tier_a)}% of the frame, but their in-scope SETS overlap ",
    "{jac(k$tier_a, k$tier_h)}% unweighted and {wjac(k$tier_a, k$tier_h)}% design-weighted (Sonnet-GPT: {jac(k$tier_a, k$tier_b)}%/{wjac(k$tier_a, k$tier_b)}%); of Sonnet's {nrow(pos)} positives Haiku ",
    "agrees on {sum(IN(pos$tier_h))}. RATE AGREEMENT IS NOT SET AGREEMENT. Worse: agents of the SAME model on the SAME ",
    "prompt disagree beyond chance in BOTH arms after conditioning on stratum (CMH p = {signif(t6$cmh_p, 2)} and ",
    "{signif(t8$cmh_p, 2)}), with raw spreads {t6$raw_spread}x and {t8$raw_spread}x against {BETWEEN_MODEL_X}x between models, and the agents' ordering ",
    "FLIPS between arms. The noise inside one model is at least the size of the difference between ",
    "models, and the pilot's own 40-agent screen is too underpowered to rule the same instability out ",
    "({zero} of {nrow(pc)} chunks found zero metaresearch; p = {signif(ctp$p.value, 3)})."
  )
)
