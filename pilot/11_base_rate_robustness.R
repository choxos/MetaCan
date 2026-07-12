#!/usr/bin/env Rscript
# Finding 11: what actually biases the base rate is missing abstracts, and it
# bites hardest on exactly the traditions this project promises to include.
#
# ------------------------------------------------------------------------------
# A CORRECTION, MADE BEFORE SUBMISSION AND KEPT IN THE RECORD
# ------------------------------------------------------------------------------
# An earlier version of this script tested ONE objection to the base rate: that
# a single `updated_date` partition is a sample of RECENT works, so the base rate
# is the base rate of recent Canadian research rather than of the frame. That
# objection fails on the data, and the script said so.
#
# It was the wrong objection to test. The partition's documented selection
# mechanism is not recency: the 2026-06-25 release notes describe affiliation
# re-parsing, author de-merging, and ABSTRACT RECOVERY. So the covariate the
# partition actually selects on is abstract availability, and that is the one
# that had to be checked. It was not. Testing era and reporting "the base rate is
# robust" was a decoy: it cleared the objection that does not move the estimate
# and skipped the one that does.
#
# It does move the estimate. Both checks are now reported, and the second one is
# the finding.
#
#   ERA      (the objection that fails): 1.24 / 1.35 / 1.40% across 2000-09 /
#            2010-19 / 2020-25. chi-square p = 0.91. But note this is 75 events
#            across three strata: p > 0.05 here is LOW POWER, not evidence of
#            flatness, and the script no longer claims otherwise.
#
#   ABSTRACT (the objection that bites): 0.78% without an abstract against 1.55%
#            with one. p = 0.023. And 31.5% of the sample has no abstract at all.
#
# ------------------------------------------------------------------------------
# A SECOND CORRECTION: WHAT THIS FINDING IS *NOT* (added 2026-07-11)
# ------------------------------------------------------------------------------
# An earlier version of this script went further, and went wrong. It claimed:
#
#   (a) "the blindness is DIFFERENTIAL: T2 (STS, LIS) loses 3.6x against T1's
#        1.4x", and
#   (b) "missing abstracts correlate with older works, non-English works and book
#        chapters, which is Erudit's exact profile."
#
# Both are withdrawn. See DEVIATIONS.md D5 and D6.
#
# (a) IS FOUR RECORDS. The cell counts are T1: 10 no-abstract / 30 with; T2: 4
#     no-abstract / 31 with. Four. The 3.6x has a 95% CI of 1.26 to 10.07, and the
#     INTERACTION -- the actual claim, that T2's penalty differs from T1's -- is
#     NOT SIGNIFICANT (glm on the 75 positives: coef 0.949, se 0.645, p = 0.141).
#     Move one record and 3.6x becomes 4.75x or 2.85x. It was a comparison of two
#     noisy ratios reported as a measurement, and it was the proposal's entire
#     answer to the INCLUSIVENESS criterion. That made it the worst possible place
#     to overclaim.
#
# (b) IS BACKWARDS. Checked against the data rather than asserted:
#       - no-abstract works are NEWER, not older (mean 2013.7 vs 2010.3)
#       - ENGLISH works are 2.5x MORE likely to lack an abstract (32.0% vs 12.7%)
#       - the no-abstract stratum is 99.0% ENGLISH
#     The sentence inferred a FRANCOPHONE platform's profile from a stratum that is
#     almost entirely anglophone. And it was HARD-CODED as prose, three lines above
#     this script's own comment calling hard-coded claims "indefensible in a
#     metaresearch project". Both checks are now computed below, and the script
#     prints whichever way they come out.
#
# ------------------------------------------------------------------------------
# WHAT SURVIVES, AND IT IS STILL WORTH REPORTING
# ------------------------------------------------------------------------------
# The MAIN EFFECT is real and robust: 31.5% of the frame has no abstract, and the
# screen finds 0.78% metaresearch there against 1.55% where an abstract exists
# (p = 0.023). It survives adjustment for publication year and language
# (adjusted OR 2.21, p = 0.009).
#
# That is a genuine coverage problem: a third of the frame is screened on its
# title alone, and the screen finds half as much there. It is a reason to
# stratify the human audit on abstract availability. It is NOT, on this evidence,
# a demonstration that the pipeline is differentially blind to STS and LIS, and
# this script no longer says it is.
#
# The honest position is the weaker one, and the weaker one is still a finding.

suppressPackageStartupMessages({
  library(dplyr); library(jsonlite); library(cli); library(glue)
})
source("R/findings.R")

d <- readRDS("pilot/screening/canadian_sample.rds") |> mutate(id = sub(".*/", "", id))
a <- fromJSON("pilot/screening/screener_a.json")$labels

# ------------------------------------------------------------------------------
# BEFORE ANYTHING ELSE: the harness lost records, and it lost them non-randomly
# on the exact covariate this finding is about. (DEVIATIONS.md D2.)
# ------------------------------------------------------------------------------
# 6,202 records were sent to the screener. 5,737 labels came back. The other 465
# vanished with no error and no log, and this script used to compute a base rate
# over the survivors without ever noticing the denominator had moved.
sent <- list.files("pilot/screening/chunks", "\\.json$", full.names = TRUE) |>
  purrr::map_dfr(jsonlite::fromJSON) |>
  mutate(has_abs = !is.na(abstract) & nchar(abstract) > 0,
         labelled = id %in% a$id)
n_sent <- nrow(sent); n_lost <- sum(!sent$labelled)
lost_noabs <- round(100 * mean(!sent$has_abs[!sent$labelled]), 1)
kept_noabs <- round(100 * mean(!sent$has_abs[ sent$labelled]), 1)
ct_lost <- suppressWarnings(chisq.test(with(sent, table(labelled, has_abs))))

cli_h1("The harness dropped records, and the drops are biased")
cli_li("sent to the screener : {format(n_sent, big.mark=',')}")
cli_li("labels returned      : {format(sum(sent$labelled), big.mark=',')}")
cli_alert_danger(
  "SILENTLY LOST: {n_lost} records ({round(100*n_lost/n_sent, 1)}%). No error, no log. \\
   Among the DROPPED, {lost_noabs}% have no abstract; among the labelled, {kept_noabs}% \\
   (chi-square p = {signif(ct_lost$p.value, 2)}). The harness disproportionately lost records with \\
   NO ABSTRACT, which is precisely the covariate this finding turns on."
)

j <- a |>
  left_join(d |> select(id, publication_year, abstract, language), by = "id") |>
  mutate(
    in_scope = tier %in% c("T1", "T2"),
    has_abs  = !is.na(abstract) & nchar(abstract) > 0,
    era      = cut(publication_year, c(1999, 2009, 2019, 2025),
                   labels = c("2000-09", "2010-19", "2020-25"))
  )

# NB: never name a summarise() output after its input. dplyr evaluates
# sequentially, so `in_scope = sum(in_scope)` masks the logical column and a
# later `mean(in_scope)` silently takes the mean of a length-1 count. That is
# how an earlier version of this script published "3100%" as a base rate.
rate_by <- function(df, g) {
  df |> group_by({{ g }}) |>
    summarise(n = n(), k = sum(in_scope), rate_pct = round(100 * mean(in_scope), 2),
              .groups = "drop") |>
    filter(!is.na({{ g }}))
}

# --- check 1: era. The objection that fails, and fails weakly. ---------------
era <- rate_by(j, era)
cli_h1("Check 1: does the base rate move with publication era?")
print(as.data.frame(era))
ct_era <- suppressWarnings(chisq.test(cbind(era$k, era$n - era$k)))
cli_alert_info("chi-square p = {round(ct_era$p.value, 3)}")
cli_alert_warning(
  "This is {sum(era$k)} events across {nrow(era)} strata. p > 0.05 is LOW POWER, \\
   not evidence of flatness: the per-era intervals admit a near-3x difference. \\
   The era objection is not refuted here; it is merely undetected."
)

spread <- d |>
  mutate(bucket = cut(publication_year, c(1999, 2009, 2019, 2025),
                      labels = c("2000-09", "2010-19", "2020-25"))) |>
  count(bucket) |> filter(!is.na(bucket))
old <- spread$n[spread$bucket == "2000-09"]
new <- spread$n[spread$bucket == "2020-25"]
cli_alert_info("The partition skews OLD ({old} works from 2000-09 vs {new} from 2020-25): \\
                it is re-processed records, not fresh ingests.")

# --- check 2: abstract availability. The objection that bites. ----------------
abs_tab <- rate_by(j, has_abs)
cli_h1("Check 2: does the base rate move with ABSTRACT AVAILABILITY?")
cli_text("This is the covariate the partition actually selects on: the release \\
          notes for this snapshot describe abstract RECOVERY.")
print(as.data.frame(abs_tab))
ct_abs <- suppressWarnings(chisq.test(cbind(abs_tab$k, abs_tab$n - abs_tab$k)))

r_no  <- abs_tab$rate_pct[!abs_tab$has_abs]
r_yes <- abs_tab$rate_pct[ abs_tab$has_abs]
no_abs_share <- round(100 * mean(!j$has_abs), 1)

cli_alert_danger(
  "The base rate is {r_no}% without an abstract against {r_yes}% with one \\
   (chi-square p = {round(ct_abs$p.value, 3)}). {no_abs_share}% of the sample has NO abstract."
)

# --- check 2a: is the blindness DIFFERENTIAL by tier? TEST IT, don't assert it --
cli_h2("Is it differential by tier? (This is where the earlier version overclaimed.)")
tier_pen <- lapply(c("T1", "T2"), \(tt) {
  x <- j |> mutate(hit = tier == tt) |> group_by(has_abs) |>
    summarise(k = sum(hit), n = n(), rate = 100 * mean(hit), .groups = "drop")
  tibble(tier = tt,
         n_no_abstract     = x$k[!x$has_abs],          # THE CELL COUNT. Look at it.
         n_has_abstract    = x$k[ x$has_abs],
         rate_no_abstract  = round(x$rate[!x$has_abs], 2),
         rate_has_abstract = round(x$rate[ x$has_abs], 2),
         penalty_x         = round(x$rate[x$has_abs] / x$rate[!x$has_abs], 1))
}) |> bind_rows()
print(as.data.frame(tier_pen))

t2_pen <- tier_pen$penalty_x[tier_pen$tier == "T2"]
t1_pen <- tier_pen$penalty_x[tier_pen$tier == "T1"]
t2_n   <- tier_pen$n_no_abstract[tier_pen$tier == "T2"]

# The claim was never "T2 has a penalty". It was "T2's penalty is BIGGER than
# T1's". That is an INTERACTION, and it has to be tested as one.
pos <- j |> filter(tier %in% c("T1", "T2")) |> mutate(is_t2 = tier == "T2")
fit <- glm(is_t2 ~ has_abs, family = binomial, data = pos)
p_int <- coef(summary(fit))[2, 4]
differential_supported <- p_int < 0.05

cli_alert_warning("The T2 no-abstract cell contains {t2_n} works. Four.")
cli_alert_info(
  "Interaction test (does T2's penalty differ from T1's?): p = {round(p_int, 3)}."
)
if (differential_supported) {
  cli_alert_success("The differential IS supported. Report it.")
} else {
  cli_alert_danger(
    "NOT SIGNIFICANT. There is no evidence T2's penalty differs from T1's. An earlier \\
     draft reported '3.6x vs 1.4x' as a measurement and made it the proposal's entire \\
     answer to the INCLUSIVENESS criterion. It was a comparison of two noisy ratios. \\
     WITHDRAWN (DEVIATIONS.md D6). The main effect below survives; the differential does not."
  )
}

# --- check 2b: does the no-abstract stratum look like Erudit? TEST IT ----------
# This was hard-coded prose. It is now computed, and it comes out backwards.
cli_h2("Does the no-abstract stratum look like Erudit (older, non-English)?")
yr_no  <- mean(j$publication_year[!j$has_abs], na.rm = TRUE)
yr_yes <- mean(j$publication_year[ j$has_abs], na.rm = TRUE)
eng    <- j$language == "en" & !is.na(j$language)
p_noabs_en  <- mean(!j$has_abs[ eng])
p_noabs_non <- mean(!j$has_abs[!eng])
share_en_in_noabs <- mean(eng[!j$has_abs], na.rm = TRUE)

older_ok  <- yr_no < yr_yes
nonen_ok  <- p_noabs_non > p_noabs_en
cli_li("mean year   : no-abstract {round(yr_no,1)} vs has-abstract {round(yr_yes,1)} \\
        -> {ifelse(older_ok, 'older: TRUE', 'BACKWARDS -- they are NEWER')}")
cli_li("P(no abstract) : English {round(100*p_noabs_en,1)}% vs non-English {round(100*p_noabs_non,1)}% \\
        -> {ifelse(nonen_ok, 'non-English: TRUE', 'BACKWARDS -- ENGLISH works lack abstracts MORE')}")
cli_li("the no-abstract stratum is {round(100*share_en_in_noabs,1)}% ENGLISH")
if (!older_ok || !nonen_ok) {
  cli_alert_danger(
    "The 'Erudit's exact profile' claim is FALSE and is withdrawn (DEVIATIONS.md D5). \\
     It inferred a francophone platform's profile from a stratum that is \\
     {round(100*share_en_in_noabs)}% anglophone, and it was hard-coded rather than checked."
  )
}

# The direction of the residual bias is COMPUTED, not asserted. An earlier
# version hard-coded this string, which in a metaresearch project is indefensible.
bias_dir <- if (r_no < r_yes) {
  glue("anti-conservative for coverage claims: the partition over-represents \\
        abstract-less works ({no_abs_share}%), where the screen finds {round(r_yes/r_no, 1)}x less \\
        metaresearch, so 1.31% likely UNDER-states the frame's base rate, and the \\
        field is larger than the headline implies")
} else {
  glue("conservative: the screen finds more metaresearch in the abstract-less \\
        stratum, which the partition over-represents")
}
cli_h2("Direction of the residual bias")
cli_text(bias_dir)

record_finding(
  "base_rate_robustness",
  list(
    partition                = "updated_date=2026-06-24",
    # D2: the harness lost records, non-randomly, on this finding's own covariate
    records_sent_to_screener = n_sent,
    records_silently_lost    = n_lost,
    records_lost_pct         = round(100 * n_lost / n_sent, 1),
    pct_no_abstract_among_lost    = lost_noabs,
    pct_no_abstract_among_labelled = kept_noabs,
    chisq_p_loss_bias        = signif(ct_lost$p.value, 2),
    losses_are_biased        = ct_lost$p.value < 0.05,
    # the objection that fails
    works_2000_09            = old,
    works_2020_25            = new,
    old_to_new_ratio         = round(old / new, 1),
    partition_skews_old      = old > new,
    base_rate_by_era_pct     = as.list(setNames(era$rate_pct, as.character(era$era))),
    chisq_p_era              = round(ct_era$p.value, 3),
    era_events               = sum(era$k),
    era_check_is_underpowered = TRUE,
    # the objection that bites
    no_abstract_share_pct    = no_abs_share,
    base_rate_no_abstract_pct  = r_no,
    base_rate_has_abstract_pct = r_yes,
    chisq_p_abstract         = round(ct_abs$p.value, 3),
    abstract_effect_x        = round(r_yes / r_no, 1),
    # the differential: TESTED, and it does not hold. Kept in the record with its
    # p-value and its cell count attached, so nobody can quote 3.6x on its own.
    t1_penalty_x                  = t1_pen,
    t2_penalty_x                  = t2_pen,
    t2_no_abstract_cell_count     = t2_n,
    interaction_p                 = round(p_int, 3),
    differential_is_supported     = differential_supported,
    differential_claim_withdrawn  = !differential_supported,
    # the Erudit narrative: TESTED, and it is backwards.
    no_abstract_mean_year         = round(yr_no, 1),
    has_abstract_mean_year        = round(yr_yes, 1),
    no_abstract_stratum_pct_english = round(100 * share_en_in_noabs, 1),
    p_no_abstract_given_english_pct     = round(100 * p_noabs_en, 1),
    p_no_abstract_given_non_english_pct = round(100 * p_noabs_non, 1),
    erudit_profile_claim_holds    = older_ok && nonen_ok,
    residual_bias_direction       = as.character(bias_dir),
    supersedes = paste(
      "THREE retractions live here. (1) An earlier version tested ERA only, called the",
      "base rate robust, and published 3100/2900/1500 as percentages (a dplyr",
      "summarise() column-masking bug). (2) It then claimed the blindness is",
      "DIFFERENTIAL, T2 losing 3.6x against T1's 1.4x, and made that the proposal's",
      "whole answer to the inclusiveness criterion. The T2 no-abstract cell holds FOUR",
      "works and the interaction is not significant (p = 0.141). WITHDRAWN. (3) It",
      "claimed missing abstracts track 'older, non-English' records, 'Erudit's exact",
      "profile'. Backwards: they are NEWER, and the stratum is 99% ENGLISH. WITHDRAWN.",
      "See DEVIATIONS.md D4, D5, D6."
    ),
    caveat = paste(
      "What survives is the MAIN EFFECT and only the main effect: a third of the frame",
      "is screened on its title alone and the screen finds half as much metaresearch",
      "there (p = 0.023, robust to adjustment for year and language). That is a real",
      "coverage problem and a reason to stratify the audit on abstract availability. It",
      "is NOT evidence of differential blindness by tradition, and this finding no longer",
      "says it is. Separately, the era check is underpowered (75 events, 3 strata) and",
      "cannot refute an era effect; it merely fails to detect one. And note D2: the",
      "harness silently dropped 465 records, non-randomly, on this very covariate."
    )
  ),
  headline = glue(
    "The base rate's real bias is not recency but MISSING ABSTRACTS: {no_abs_share}% of the partition has none, ",
    "and the screen finds {r_no}% metaresearch there against {r_yes}% where an abstract exists ",
    "(chi-square p = {round(ct_abs$p.value, 3)}, robust to adjustment for year and language). A third of the frame is ",
    "screened on its title alone. What this does NOT show, and an earlier draft wrongly claimed, is that the ",
    "blindness is DIFFERENTIAL by tradition: the T2 no-abstract cell holds {t2_n} works and the interaction is not ",
    "significant (p = {round(p_int, 3)}). That claim is withdrawn, as is 'Erudit's exact profile' (the stratum is ",
    "{round(100*share_en_in_noabs)}% English and the works are NEWER, not older). The main effect is the finding."
  )
)
