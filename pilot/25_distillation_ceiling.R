#!/usr/bin/env Rscript
# Finding 25: what a classifier trained on LLM labels can and cannot buy.
#
# The computation is in pilot/25_distillation_ceiling.py (scikit-learn). This script
# runs it and records the finding. Two files rather than one, because the first
# version of this WAS one file, in R, with hand-rolled sparse matrices and a fixed
# glmnet lambda, and it produced numbers that were impossible: 100% of the in-scope
# works in the classifier's top decile, 100% of the unlabelled pool predicted
# positive, and a student matching its own teacher at Jaccard 0.04.
#
# Those numbers FLATTERED the argument I was making. That is the direction this
# project has learned to distrust, so the estimator is now scikit-learn's, the
# regularisation strength is chosen by cross-validated average precision rather than
# by me, and the vectoriser is fitted on train and only applied to test.
#
# ------------------------------------------------------------------------------
# WHAT THE EXPERIMENT FOUND, INCLUDING THE PART THAT REFUTED ME
# ------------------------------------------------------------------------------
# 1. THE STUDENT CANNOT EVEN REPRODUCE ITS OWN TEACHER. Student-vs-own-teacher
#    Jaccard is about 0.17. The three TEACHERS agree with EACH OTHER at 0.50 to
#    0.56. So the distilled classifier is a worse approximation of Opus than Grok
#    is. Distilling from Opus also makes you agree with Grok LESS than Opus does
#    (-0.348): distillation does not bridge the gap between the models, it degrades
#    away from all of them.
#
# 2. THE SELF-TRAINING LOOP DID NOT COLLAPSE, AND I PREDICTED THAT IT WOULD.
#    I argued, in writing and at length, that self-training at a 1% base rate would
#    shrink the positive class toward the confident core and away from French and
#    STS, implementing the rubric's own error 3 as an optimiser. IT DID NOT HAPPEN.
#    Positive rate held at 1.00% and the French share of the positives held at
#    6.50%, for three rounds, drift 0.00.
#
#    The reason is `class_weight="balanced"`, and I was warned. The adversarial
#    review said, before the loop was run: "Self-training collapse is a serious
#    risk, NOT A THEOREM. Class balancing can stop shrinkage. It still cannot
#    manufacture external validity." That is exactly what happened, and the
#    prediction I had already written into a comment block was wrong.
#
#    What the loop DID do is reach a fixed point immediately and then recycle its
#    own labels forever: training positives went 224 -> 424 -> 424 -> 424. It
#    CONVERGED WITHOUT LEARNING. "Maturity" is not a property the loop can acquire;
#    it is a fixed point it falls into, and a fixed point looks identical from the
#    inside whether the labels are right or wrong.
#
# 3. THE STRATIFIER IS GENUINELY WORTH IT. 48% of the in-scope works sit in the
#    classifier's top decile against a blind baseline of 10%: a 4.8x lift in
#    in-scope works found per unit of human coding effort. Design-weighted estimates
#    from KNOWN selection probabilities stay unbiased however noisy the stratifier
#    is. Noise costs efficiency, never validity.
#
# NOTHING HERE PRODUCES AN ESTIMATE. A model trained on machine labels cannot be the
# instrument that measures machine labels.

suppressPackageStartupMessages({ library(jsonlite); library(cli); library(glue) })
source("R/findings.R")

RES <- "pilot/results/distillation.json"
PY  <- "pilot/25_distillation_ceiling.py"

if (!file.exists(RES) || file.mtime(PY) > file.mtime(RES)) {
  cli_alert_info("running {.path {PY}} (scikit-learn)")
  status <- system2("python3", PY, stdout = "", stderr = "")
  if (status != 0 || !file.exists(RES)) cli_abort("the distillation experiment did not produce {.path {RES}}")
}
r <- fromJSON(RES)

stu_own <- c(opus = r$student_vs_teacher_jaccard$opus$opus,
             gpt  = r$student_vs_teacher_jaccard$gpt$gpt,
             grok = r$student_vs_teacher_jaccard$grok$grok)
tt <- unlist(r$teacher_vs_teacher_jaccard)

cli_h1("1. The student cannot reproduce even its own teacher")
cli_li("student vs ITS OWN teacher : {paste(sprintf('%s %.2f', names(stu_own), stu_own), collapse = ' | ')}")
cli_li("teacher vs teacher         : {paste(sprintf('%s %.2f', names(tt), tt), collapse = ' | ')}")
cli_alert_danger(
  "A distilled student matches its own teacher at Jaccard {round(mean(stu_own), 2)}, while the three teachers match \\
   EACH OTHER at {round(min(tt), 2)} to {round(max(tt), 2)}. The classifier is a WORSE approximation of Opus than Grok is. And \\
   distilling from Opus moves you AWAY from Grok ({sprintf('%+.2f', r$bridging_gain$opus_student_vs_grok)}), not toward it: distillation does not bridge the \\
   models' disagreement, it degrades away from all of them."
)

cli_h1("2. The self-training loop, and the prediction it refuted")
rounds <- r$selftrain_rounds
print(as.data.frame(rounds), row.names = FALSE)
cli_alert_warning(
  "I PREDICTED THIS LOOP WOULD SHRINK THE POSITIVE CLASS and drive the French share down, implementing the \\
   rubric's own error 3 ('the error that makes the field look smaller and more anglophone than it is') as an \\
   optimiser. IT DID NOT. Positive rate drift {sprintf('%+.2f', r$selftrain_drift_positive_rate_pts)} points, French share drift \\
   {sprintf('%+.2f', r$selftrain_drift_french_share_pts)} points. The cause is class weighting, and the adversarial review warned me BEFORE the run: \\
   'self-training collapse is a serious risk, NOT A THEOREM; class balancing can stop shrinkage.' It was right."
)
cli_alert_danger(
  "What the loop DID do is reach a fixed point immediately and then recycle its own labels: training positives \\
   {rounds$train_positives[1]} -> {paste(rounds$train_positives[-1], collapse = ' -> ')}. IT CONVERGED WITHOUT LEARNING. A fixed point looks \\
   identical from the inside whether its labels are right or wrong, so 'the algorithm has matured' is not \\
   something the loop can ever tell you."
)

cli_h1("3. What the classifier IS worth: allocating human effort")
cli_li("in-scope works in the classifier's top decile: {r$stratifier_top_decile_recall_pct}% (blind baseline: 10%)")
cli_alert_success(
  "A {r$stratifier_lift_vs_blind}x lift in in-scope works found per unit of human coding effort. THIS is the legitimate use, and it \\
   is not a small one: the machine decides WHERE THE HUMANS LOOK, and the design weights stay unbiased however \\
   noisy it is. It never supplies a label."
)

record_finding(
  "distillation_ceiling",
  list(
    n_three_way_labelled            = r$n_three_way_labelled,
    student_vs_own_teacher_jaccard  = round(stu_own, 3),
    teacher_vs_teacher_jaccard      = round(tt, 3),
    bridging_gain                   = unlist(r$bridging_gain),
    selftrain_rounds                = rounds$round,
    selftrain_train_positives       = rounds$train_positives,
    selftrain_pool_positive_rate_pct = rounds$pool_positive_rate_pct,
    selftrain_french_share_pct      = rounds$french_share_of_positives_pct,
    selftrain_drift_positive_rate_pts = r$selftrain_drift_positive_rate_pts,
    selftrain_drift_french_share_pts  = r$selftrain_drift_french_share_pts,
    my_shrinkage_prediction_was_refuted = TRUE,
    stratifier_top_decile_recall_pct = r$stratifier_top_decile_recall_pct,
    stratifier_lift_vs_blind         = r$stratifier_lift_vs_blind,
    used_to_produce_any_estimate     = FALSE,
    caveat = paste(
      "The student is TF-IDF word+char n-grams with a cross-validated logistic head: the cheap classifier the",
      "question was actually about. A fine-tuned multilingual encoder would raise the student-vs-teacher number",
      "and change none of the argument, because the ceiling is set by the LABELS, not by the model class. The",
      "self-training loop's non-collapse is CONDITIONAL on class weighting and should not be read as a general",
      "safety result: it says the collapse is avoidable, not that the loop is informative. And nothing here",
      "produces a prevalence estimate; the classifier is a stratifier, and the human audit is the instrument."
    )
  ),
  headline = glue(
    "A CLASSIFIER TRAINED ON LLM LABELS CANNOT EVEN REPRODUCE ITS OWN TEACHER, LET ALONE ADJUDICATE THREE. Students ",
    "distilled from each model match their own teacher at Jaccard {round(mean(stu_own), 2)}, while the three teachers match EACH OTHER at ",
    "{round(min(tt), 2)} to {round(max(tt), 2)}: the classifier is a worse approximation of Opus than Grok is. Distilling from Opus also moves you ",
    "AWAY from Grok ({sprintf('%+.2f', r$bridging_gain$opus_student_vs_grok)}), so distillation does not bridge the models' disagreement, it degrades away from all of ",
    "them. THE SELF-TRAINING LOOP THEN REFUTED MY OWN PREDICTION. I argued at length that it would shrink the ",
    "positive class toward the confident anglophone core; run on 20,000 works the models never saw, it did not: ",
    "positive rate drift {sprintf('%+.2f', r$selftrain_drift_positive_rate_pts)} points, French share drift {sprintf('%+.2f', r$selftrain_drift_french_share_pts)} points, because class weighting prevents the collapse, ",
    "exactly as the adversarial review warned before the run ('a serious risk, NOT A THEOREM'). What the loop DID do ",
    "is reach a fixed point immediately and recycle its own labels ({rounds$train_positives[1]} -> {rounds$train_positives[length(rounds$train_positives)]} training positives, then nothing): it ",
    "CONVERGED WITHOUT LEARNING, and a fixed point looks identical from the inside whether its labels are right or ",
    "wrong. What the classifier IS worth is the stratifier: {r$stratifier_top_decile_recall_pct}% of the in-scope works sit in its top decile against a ",
    "blind baseline of 10%, a {r$stratifier_lift_vs_blind}x lift in in-scope works found per unit of human coding effort, and design-weighted ",
    "estimates stay unbiased however noisy it is. THE MACHINE DECIDES WHERE THE HUMANS LOOK. IT NEVER SUPPLIES A LABEL."
  )
)
