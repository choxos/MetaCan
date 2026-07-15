#!/usr/bin/env Rscript
# Render findings.json into the table the proposal quotes.
#
# The proposal must never contain a hand-typed number. Every figure it cites is
# emitted here from the JSON the pilot scripts wrote, so prose and code cannot
# drift apart.

suppressPackageStartupMessages({
  library(cli); library(glue); library(purrr); library(jsonlite)
})
source("R/findings.R")

OUT <- file.path("pilot", "results", "FINDINGS.md")

ORDER <- c(
  the_frame               = "The frame is built, not estimated: 4,299,418 works",
  base_rate               = "A historical model assigned ~1% positive labels",
  topic_route_recall      = "The topic route recovers one in eight model-positive works",
  agreement               = "Swap the historical model and the positive-label rate doubles",
  base_rate_robustness    = "Abstract availability changes the historical model-positive rate",
  topics                  = "No OpenAlex topic for the field",
  affiliation_gap         = "Affiliation metadata is mostly absent",
  erudit                  = "Erudit is invisible to OpenAlex",
  language_gap            = "French retrieval counts are much lower in this OpenAlex subset",
  polysemy                = "Keyword retrieval cannot survive polysemy",
  canadian_linkage        = "'Canadian' is three different questions",
  capture_recapture_fails = "Capture-recapture is void here",
  openalex_is_metered     = "The API is metered; the snapshot is not",
  screening_cost          = "The prefilter existed because I miscosted the alternative",
  audit_power             = "The audit could not measure what it exists to measure",
  label_limits            = "What the machine labels cannot tell us, including about my own headline",
  agent_variance          = "Within-model variation rivals between-model variation in these runs",
  retraction_record       = "OpenAlex cannot represent the retraction record, and undercounts it",
  funder_route_recall     = "Both clauses of the estimand rest on metadata that is mostly absent",
  abstract_cascade        = "Abstract recovery varies sharply by work type and language",
  preprint_coverage       = "The preprint coverage claim, measured instead of asserted",
  trial_linkage           = "The number that looked like a replication and was a coincidence",
  three_model_screen      = "Three models select substantially different sets",
  instrument_contradicts_itself = "The locked instrument contradicts itself, and nothing caught it",
  zero_probability_region = "The design could not reach 12.9% of the frame, and no weight fixes that",
  canadian_linkage_misnames_itself = "Both clauses of 'Canadian' measure something other than their name",
  classifier              = "The classifier ranks machine labels; it does not validate the field",
  distillation_ceiling    = "A classifier trained on LLM labels cannot reproduce even its own teacher",
  active_learning         = "The active loop improves imitation; its random anchors cannot validate it",
  gemma_gate              = "Gemma failed the prespecified gate, and the gate needs an unbiased test set",
  adjudication            = "A fourth model assigned rubric seams to 89% of selected disagreements",
  v1_to_v2                = "Under v2, 54% of selected v1 model disagreements became unanimous"
)

CONSEQUENCE <- c(
  the_frame               = "The precondition for everything else, and for most of this project's life it did not exist. 'The frame' was 3,507,205 works: an EXTRAPOLATION from a single OpenAlex partition, hardcoded in six scripts, against which every cost, audit-power and field-size figure was computed. The frame is now BUILT: all 482 partitions streamed and filtered, 4,299,418 works, each exactly once. The estimate was 18% LOW and every number downstream has moved. Nothing about the method changed; every NUMBER did, which is what it means for a frame to be enumerable rather than hypothesised. THE ROUTE THAT MATTERS: 1,565,226 works (36.4%) are INVISIBLE TO AFFILIATION ALONE. An affiliation-only frame would hold 2,734,192 works and would never see them. That is finding 2 (64% of the topic space has no raw affiliation string) made concrete at frame scale, and it is the empirical justification for the union-of-routes design and for carrying provenance on every record. Consequence: no script may hardcode the frame size again (R/frame_size.R reads it from the artifact the harvest writes), and a frame that cannot say WHY it admitted a work cannot be audited, which is the whole thesis.",
  base_rate               = "This is a design-weighted positive-label rate from one historical machine screener. It is a hypothesis for human validation, not a prevalence estimate or a count of the field.",
  topic_route_recall      = "Scored against historical machine labels, the topic route recovers a small share of model-positive works. This measures agreement with that machine screen, not sensitivity against human-coded field membership.",
  agreement               = "The published 95% CI (1.03-1.64%) describes one model's emitted labels. A second model emits a substantially different rate. The span is model-output variation; it is neither accuracy nor uncertainty about the field's size.",
  base_rate_robustness    = "The historical model assigned positive labels at roughly half the rate when no abstract was available. This association survives adjustment for year and language, but it is not evidence of classification bias, accuracy, or true prevalence. Human validation therefore stratifies on abstract availability.",
  topics                  = "No single retrieval route can enclose the field. Hence screening over a Canadian frame, with retrieval demoted to provenance.",
  affiliation_gap         = "An affiliation-only rule for 'Canadian' is structurally broken. Hence the funder clause in the primary estimand, and an audit that samples the screened-out stratum.",
  erudit                  = "An OpenAlex-only pipeline cannot even ask how much of the corpus is francophone. Hence the Erudit harvest, and language-stratified validation.",
  language_gap            = "The French share is not a fact about Canadian scholarship; it is a fact about the pipeline. Hence French and English performance are reported separately.",
  polysemy                = "The metaresearch sense of a term is not lexically separable from its everyday sense. Hence semantic screening, and these terms are excluded from the lexicon.",
  canadian_linkage        = "The three senses pick out different sets, and funder metadata skews against the social sciences. Hence one prespecified primary estimand, plus two prespecified alternatives.",
  capture_recapture_fails = "We ran it, and it fails. Hence a base rate over a defined frame, and a two-phase stratified probability audit that samples the screened-out stratum directly.",
  openalex_is_metered     = "An API-based pipeline at this scale is neither free nor reproducible. Hence the pinned S3 snapshot, which is both.",
  audit_power             = "The central promise of the project (a human audit that quantifies what the pipeline missed) was, as first specified, arithmetically impossible: the works a screen wrongly rejects are a vanishing fraction of a 3.2M-record rejected mass, so 600 sampled records find less than one of them. Score-stratified oversampling rescues it only partly and stays BLIND to the confident rejects, which finding 11 says are exactly the T2 and no-abstract works. Hence two further instruments: measure any filter against the 5,737 works that already carry rubric labels, and use KNOWN-ITEM recall on a venue reference set, because venue is an external criterion immune to the aboutness that defeats everything else.",
  label_limits            = "Attacking the FIXES. (A) The topic route's recall is 12% against one screener and 7% against the other, so finding 14's instrument (ii) measures agreement with a MACHINE, not accuracy. The conclusion strengthens (the route is worse than advertised) but the number is not truth. (B) The pilot holds ONE French in-scope work, so French sensitivity is not estimable in an OpenAlex-only frame at any feasible audit size. That is an argument for the Erudit harvest, which the pilot did not run: so French power is stated as a CONDITION, not promised.",
  retraction_record       = "Retraction Watch, joined by DOI, records 143 frame works OpenAlex does not flag, including 49 outright retractions. The undercount is the SMALLER problem: 52 carry an EXPRESSION OF CONCERN, and OpenAlex HAS NO FIELD FOR ONE. `is_retracted` is a BOOLEAN over a state space with at least four values (retraction, expression of concern, correction, reinstatement), so it expresses one and reports the rest as FALSE, which reads as 'fine'. Nor can a boolean carry WHY. This is finding 1's disease in a second schema: the canonical database cannot express the distinction the field turns on. Consequence: retraction ships as a record ATTRIBUTE carrying Retraction Watch's own state and reasons, NOT as a frame route (a retracted cardiology paper is retracted cardiology, not metaresearch).",
  funder_route_recall     = "The primary estimand's funder clause exists to rescue works with no usable affiliation (finding 2: 64% have none), and NOTHING had tested it. Tested against CIHR's own database of 44,190 funded projects, the result REFUTED THE HYPOTHESIS I WROTE BEFORE RUNNING IT: OpenAlex tags 178,133 frame works with CIHR, 4.03 per grant, a plausible rate showing no under-tagging at all (DEVIATIONS.md D14; the papers-per-grant ratio was also the WRONG instrument, dividing two quantities not linked record to record, exactly as the retracted 32.4% coverage figure did). What the data DOES support needs no hypothesis of mine: 71.2% of the frame carries NO FUNDER METADATA AT ALL, and 65.9% of Canadian-AFFILIATED works carry none. That is CA-FUND's hard ceiling. BOTH CLAUSES OF THE PRIMARY ESTIMAND REST ON METADATA THAT IS MOSTLY ABSENT, which is why the frame is a union of four routes and why the audit must sample the works no route reached.",
  abstract_cascade        = "In the frozen frame, 23.3% of works have no OpenAlex abstract. A PubMed, Europe PMC, and Crossref cascade recovered 37.8% of a 500-work sample from that stratum. Recovery varied from 91.2% for reviews to 6.2% for book chapters, and from 38.8% for English to 15.4% for French. Crossref recovered two abstracts against PubMed's 180, so it was not a meaningful discipline-agnostic rescue in this sample. Restricting screening to abstract-bearing works would remove 61.6% of book chapters against 22.1% of articles and would change the frame's composition. The effect on human-validated outcomes remains unknown.",
  preprint_coverage       = "The frame carries 156,086 preprints and the tempting move was to assert that OpenAlex covers the servers and skip the ingest. That is a COVERAGE CLAIM, and this project does not get to make one from inside the pipeline being claimed for: it is the topic route certifying its own recall. Measured instead against bioRxiv and medRxiv's OWN API, OpenAlex indexes 99.6% of the preprints the servers say they hold. The claim SURVIVES measurement, so no separate ingest is built, and it is allowed in the proposal only because it was checked. arXiv is NOT tested and that claim stays open.",
  trial_linkage           = "The only reference standard in this project NOT made of machine labels: ClinicalTrials.gov knows a Canadian trial happened independently of any pipeline, so it cannot be wrong in the pipeline's favour. The first number out of it was 52.6% frame recall, which fell so close to the 44.5% THIS PROPOSAL OPENS WITH that it read as a replication of my own prior finding on Canadian data. IT WAS A COINCIDENCE BETWEEN TWO DIFFERENT POPULATIONS. 137 of the 145 'misses' have NO CANADIAN AUTHOR: multi-site international trials with a Canadian SITE, which a frame of Canadian RESEARCH is CORRECT to exclude. A trial with a Canadian site is not a publication with a Canadian author. True recall against the population the frame actually claims is 95.2% (95% CI 90.8-97.9), and the real defect is 8 route-gap works. Every incentive pointed away from running the disambiguation that caught this, which is the condition under which researchers do not check, and it is the condition this project exists to argue is unsafe. DEVIATIONS.md D16.",
  three_model_screen      = "Three historical models screened the same probability sample against one rubric. Their model-positive rates and selected sets differed materially: only 37% of works called in scope by any model were called in scope by all three in the first 1,000-work run. This is model decision variation, not the true field boundary or uncertainty about its size. The disagreement dossier preserves each model's reasons so it can support rubric development and future human validation.",
  agent_variance          = "Haiku and Sonnet emitted similar model-positive rates but selected substantially different works. Agents using the same model and prompt also varied beyond chance after conditioning on stratum in these runs. This is model-output instability, not uncertainty about the field or evidence of accuracy. Machine outputs are therefore used for stratification and review order; a human-coded probability sample remains necessary for valid estimates.",
  instrument_contradicts_itself = "The locked rubric and output schema specified different controlled vocabularies for genre. The validator checked tier but not genre, so the contradiction survived 16,800 labels. The historical genre field is reported as unusable and is not remapped after seeing the arms diverge. The corrected instrument must be checked against its schema before another screening run.",
  zero_probability_region = "The most serious defect this project has found, and it was found by a model I asked to attack me. A stratified design rests on one identity, sum(N_h) = N, and I never checked it. 549,370 works (12.9% of the sampling frame) had an inclusion probability of EXACTLY ZERO, from two defects stacked: aff_core excluded everything ABOUT Canada while about_only excluded everything AFFILIATED with Canada, so 366,856 works that were both fell between them; and 182,514 more had a stratum predicate that evaluated to SQL NULL, which `WHERE p` and `WHERE NOT p` BOTH decline to select, leaving them in no stratum and not even orphans. Nothing threw. Every stratum returned exactly the n it asked for, because a stratum cannot know about the works it was never asked about. The design drew a clean textbook probability sample OF 87% OF THE FRAME while every number computed from it carried the frame's name. A zero-probability work is not underweighted, it is UNREACHABLE: design weights are the guarantee this project leans on hardest ('unbiased however noisy the stratifier is') and that guarantee is VOID where the probability is zero. The deleted cell was the SECONDARY ESTIMAND'S OWN: 328,912 Canadian-affiliated works about Canada, in a study whose secondary estimand is metaresearch about the Canadian research system. Consequence: the strata are defined in one place (R/strata.R) with the two residual strata as the exact NULL-safe complement, so the seven PARTITION the frame by construction; check_strata_partition.R asserts exhaustive + disjoint + nonempty on every build and is verified BOTH ways; 600 new works drawn and screened. And the reason nothing felt wrong is the finding: the broken design produced a TIDIER sample and SMALLER variance than the correct one. THE ERRORS THAT SURVIVE ARE THE ONES THAT FLATTER YOU.",
  canadian_linkage_misnames_itself = "Every other finding here is about what retrieval MISSES. This is the first about what it wrongly ADMITS, and it hits BOTH clauses of the estimand. CA-AFF, the primary clause: 17,466 works enter the frame on a Canadian 'institution' that does not exist, because OpenAlex hands 'Discovery Air (Canada)' to a Brazilian linguistics paper and 'Impact', a parse failure with an institution id, to a Spanish COVID essay; the route also carries thousands of works in Latvian and Indonesian. That number is a LOWER BOUND and is reported as one: the artifact strings tested are only those screening agents noticed BY EYE while doing something else, so CA-AFF precision is UNKNOWN, not merely unmeasured. ABOUT-CA, the secondary clause: the retrieval route means 'Canada appears in the text' and the rubric field means 'the Canadian research SYSTEM is a substantive object of study', and in the strata built entirely on the former the latter fires on 1-3% of works. Worse, `about_ca` cannot be TRUE unless the work is already about research, so it is nearly collinear with tier and carries almost no independent signal in the very stratum built to carry it: THE SECONDARY ESTIMAND CANNOT BE ESTIMATED FROM THE STRATUM DESIGNED FOR IT. Four screening agents found this independently, unprompted, and all four proposed the same repair: split into `about_ca_system` and `about_ca_topic`, because one boolean cannot separate 'Canadian data, universal claim' from 'a claim about Canada'. Consequence: the human audit must sample the RETRIEVED stratum too, because precision has to be measured and not assumed, and rubric v2 splits the field.",
  classifier              = "This historical model evaluation shows that text can prioritize records resembling machine labels. It does not establish agreement with human coding. The target changes with the machine teacher, abstract availability changes performance materially, and the deployable frame payload lacks abstract text. The classifier therefore supports stratified sampling and review order, not category assignment or prevalence estimation. The later v1 release preserves separate teacher heads and the same interpretation limit.",
  distillation_ceiling    = "The answer to 'why not train an ML model on the LLM labels and iterate until it matures?', run as an experiment instead of argued as an opinion, and it went two ways. AGAINST the idea: a student distilled from each model matches ITS OWN TEACHER at Jaccard 0.17, while the three teachers match EACH OTHER at 0.50 to 0.56. The classifier is a worse approximation of Opus than Grok is. Distilling from Opus also moves you AWAY from Grok (-0.35), so distillation does not bridge the models' disagreement, it degrades away from all of them; the boundary is not recoverable from surface text at this sample size, and training on one model's labels would silently settle the question the audit exists to answer. AGAINST ME: I predicted at length that the self-training loop would shrink the positive class toward the confident anglophone core, implementing the rubric's own error 3 as an optimiser. Run on 20,000 works the models never saw, IT DID NOT: positive rate drift 0.00 points, French share drift 0.00 points, because class weighting prevents the collapse, exactly as the adversarial review had warned BEFORE the run ('a serious risk, NOT A THEOREM'). What the loop did instead was reach a fixed point immediately and recycle its own labels (224 -> 424 training positives, then nothing): IT CONVERGED WITHOUT LEARNING, and a fixed point looks identical from the inside whether its labels are right or wrong, so 'the algorithm has matured' is not something the loop can ever report. FOR the idea, in its correct form: as a STRATIFIER the classifier puts 48% of the in-scope works in its top decile against a blind baseline of 10%, a 4.8x lift in in-scope works found per unit of human coding effort, and design-weighted estimates stay unbiased however noisy it is. Consequence: the classifier is built, and it allocates human effort. It never supplies a label, and it never produces the estimate.",
  active_learning         = "This is a retrospective simulation over machine labels that already exist. It demonstrates acquisition mechanics and improved imitation on a fixed holdout, not prospective learning or human validity. The random anchors contain too few positive records to estimate the relevant performance measures. They can monitor drift, while an independently human-coded probability sample remains necessary for validation.",
  gemma_gate              = "The prespecified gate was honoured, so this model does not label the frame. The comparison also shows that a disagreement-enriched batch can make a fixed agreement threshold misleading. Any replacement gate needs an independent probability sample and a human reference standard. This historical experiment does not validate the current two-arm v1 classifier.",
  adjudication            = "A blinded fourth model reviewed the 179 selected disagreements and assigned a rubric-seam category to 159. It showed no preference among the three screening arms. These model-assigned seam counts are hypotheses for rubric revision, not proof that the rubric is silent or that the field boundary has been located. The fourth model's tiers are used for nothing and produce no estimate because a model cannot validate another model.",
  v1_to_v2                = "The 179 works were selected because the three historical models disagreed under v1, then evaluated by the same models under a revision developed from those cases. Under v2, 96 works became unanimous and pairwise Jaccard moved from 0.19 to 0.36. This describes model behaviour on the development set. It does not show frame-wide agreement, accuracy, or a genuinely contested core. A full prespecified re-screen is required for an unbiased comparison.",
  screening_cost          = "Feasibility is a judging criterion, so it gets a number rather than a promise. The first number was wrong: the rubric is a system prompt sent once per CALL, not once per WORK, and the pilot's own chunks batch 155 works per call, so the cost was overstated 5.1x. That error was not cosmetic. Believing the screen unaffordable, I put a cheap TRIAGE in front of it -- a RETRIEVAL STEP, in a project whose central finding is that retrieval destroys these maps. With the arithmetic right the triage saves $110 and costs the thesis. IT IS DELETED: every work in the frame is read against the full rubric. See DEVIATIONS.md D7."
)

store <- all_findings()

# The renderer must not silently fall behind the pilot. A finding that exists in
# findings.json but has no entry here is a drift bug, not a formatting detail:
# it means a number was computed and then quietly dropped from the write-up.
orphans <- setdiff(names(store), names(ORDER))
if (length(orphans)) {
  cli_abort(c(
    "findings.json has {length(orphans)} finding{?s} this renderer does not know about: {.val {orphans}}",
    "i" = "Add the listed keys to ORDER and CONSEQUENCE, or the write-up drifts from the code."
  ))
}
missing <- setdiff(names(ORDER), names(store))
if (length(missing)) cli_abort("Missing findings: {.val {missing}}. Run `make pilot` first.")

rows <- imap_chr(ORDER, \(short, key) {
  glue("| {which(names(ORDER) == key)} | **{short}.** {store[[key]]$headline} | {CONSEQUENCE[[key]]} |")
})

lines <- c(
  "# Pilot findings",
  "",
  "Every number below is produced by a script in `pilot/`, against the live OpenAlex",
  "API, with the raw response archived under `pilot/raw/`. Re-derive them offline,",
  "with no network at all, using `make pilot-offline`.",
  "",
  glue("Computed: {store$topics$computed_at_utc}"),
  "",
  "| # | Finding | Consequence for the design |",
  "|---|---|---|",
  unname(rows),
  "",
  "## Raw values",
  "",
  "```json",
  toJSON(map(store[names(ORDER)], "values"), auto_unbox = TRUE, pretty = TRUE),
  "```",
  ""
)

dir.create(dirname(OUT), recursive = TRUE, showWarnings = FALSE)
writeLines(lines, OUT)

cli_alert_success("wrote {OUT}")
iwalk(ORDER, \(short, key) {
  cli_h3("{which(names(ORDER) == key)}. {short}")
  cli_text(store[[key]]$headline)
})
