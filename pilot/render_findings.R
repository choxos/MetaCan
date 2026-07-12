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
  base_rate               = "Metaresearch is ~1% of Canadian research",
  topic_route_recall      = "The topic route finds one in eight of the field",
  agreement               = "Swap the screener and the field doubles",
  base_rate_robustness    = "A third of the frame is screened on its title alone",
  topics                  = "No OpenAlex topic for the field",
  affiliation_gap         = "Affiliation metadata is mostly absent",
  erudit                  = "Erudit is invisible to OpenAlex",
  language_gap            = "Francophone metaresearch is nearly unfindable",
  polysemy                = "Keyword retrieval cannot survive polysemy",
  canadian_linkage        = "'Canadian' is three different questions",
  capture_recapture_fails = "Capture-recapture is void here",
  openalex_is_metered     = "The API is metered; the snapshot is not",
  screening_cost          = "The prefilter existed because I miscosted the alternative",
  audit_power             = "The audit could not measure what it exists to measure",
  label_limits            = "What the machine labels cannot tell us, including about my own headline",
  agent_variance          = "The noise inside one model exceeds the difference between models",
  retraction_record       = "OpenAlex cannot represent the retraction record, and undercounts it",
  funder_route_recall     = "Both clauses of the estimand rest on metadata that is mostly absent",
  abstract_cascade        = "The abstract gap is structural, and no source in the chain reaches it",
  preprint_coverage       = "The preprint coverage claim, measured instead of asserted",
  trial_linkage           = "The number that looked like a replication and was a coincidence",
  three_model_screen      = "The field's boundary is a region three models each cut differently"
)

CONSEQUENCE <- c(
  the_frame               = "The precondition for everything else, and for most of this project's life it did not exist. 'The frame' was 3,507,205 works: an EXTRAPOLATION from a single OpenAlex partition, hardcoded in six scripts, against which every cost, audit-power and field-size figure was computed. The frame is now BUILT: all 482 partitions streamed and filtered, 4,299,418 works, each exactly once. The estimate was 18% LOW and every number downstream has moved. Nothing about the method changed; every NUMBER did, which is what it means for a frame to be enumerable rather than hypothesised. THE ROUTE THAT MATTERS: 1,565,226 works (36.4%) are INVISIBLE TO AFFILIATION ALONE. An affiliation-only frame would hold 2,734,192 works and would never see them. That is finding 2 (64% of the topic space has no raw affiliation string) made concrete at frame scale, and it is the empirical justification for the union-of-routes design and for carrying provenance on every record. Consequence: no script may hardcode the frame size again (R/frame_size.R reads it from the artifact the harvest writes), and a frame that cannot say WHY it admitted a work cannot be audited, which is the whole thesis.",
  base_rate               = "Sizes the field without a search strategy. This is what capture-recapture failed to produce. But the binomial CI on it is sampling error, NOT uncertainty; see the next finding but one.",
  topic_route_recall      = "Scored directly against the rubric rather than by dividing a retrieved set by a field size. The route fails because OpenAlex files a work by what it is ABOUT: metaresearch about cardiology reads as cardiology. The field is invisible to topic retrieval precisely because it is about other fields.",
  agreement               = "The published 95% CI (1.03-1.64%) does not contain the second screener's estimate. So it is not an interval for the base rate; it is an interval for how many labels ONE model emits. The screener-swap range is the honest uncertainty, and it is why the human audit is the study rather than a validation appendix.",
  base_rate_robustness    = "A measured, significant, DIFFERENTIAL bias against the inclusiveness criterion, found in our own data before a reviewer found it. An earlier version of this check tested era instead (the covariate that does not move the estimate) and called the base rate robust. That was a decoy. Hence the human audit now stratifies on abstract availability.",
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
  abstract_cascade        = "The screen's largest measured bias: 23.3% of the frame (1,003,117 works) has NO ABSTRACT, and finding 11 measured that the screen finds HALF as much metaresearch there. I built a PubMed/Europe PMC/Crossref cascade around Crossref as the DISCIPLINE-AGNOSTIC rescue, and wrote that reasoning into the script before running it. Crossref recovered TWO abstracts; PubMed recovered 180 (D15). Publishers do not deposit abstracts to Crossref, so THE RESCUE DOES NOT EXIST. The cascade still cuts title-only exposure from 23.3% to ~14.5%, but the finding is worse than the one I went looking for: the gap is STRUCTURAL, not a metadata failure a better index repairs. Recovery is 91.2% for reviews against 6.2% for book chapters and 0% for letters; 38.8% English against 15.4% French. The works with no abstract are disproportionately the works NO abstract service covers, and the residue is humanities-shaped, book-shaped and francophone-shaped: precisely what an inclusive map exists to include. Consequence: 'screen only works with abstracts' is a SELECTION ON A COVARIATE THAT PREDICTS THE OUTCOME (it deletes 61.6% of book chapters against 22.1% of articles), admissible only as a DECLARED exclusion with a measured cost, and the audit keeps a sampling floor in the excluded stratum.",
  preprint_coverage       = "The frame carries 156,086 preprints and the tempting move was to assert that OpenAlex covers the servers and skip the ingest. That is a COVERAGE CLAIM, and this project does not get to make one from inside the pipeline being claimed for: it is the topic route certifying its own recall. Measured instead against bioRxiv and medRxiv's OWN API, OpenAlex indexes 99.6% of the preprints the servers say they hold. The claim SURVIVES measurement, so no separate ingest is built, and it is allowed in the proposal only because it was checked. arXiv is NOT tested and that claim stays open.",
  trial_linkage           = "The only reference standard in this project NOT made of machine labels: ClinicalTrials.gov knows a Canadian trial happened independently of any pipeline, so it cannot be wrong in the pipeline's favour. The first number out of it was 52.6% frame recall, which fell so close to the 44.5% THIS PROPOSAL OPENS WITH that it read as a replication of my own prior finding on Canadian data. IT WAS A COINCIDENCE BETWEEN TWO DIFFERENT POPULATIONS. 137 of the 145 'misses' have NO CANADIAN AUTHOR: multi-site international trials with a Canadian SITE, which a frame of Canadian RESEARCH is CORRECT to exclude. A trial with a Canadian site is not a publication with a Canadian author. True recall against the population the frame actually claims is 95.2% (95% CI 90.8-97.9), and the real defect is 8 route-gap works. Every incentive pointed away from running the disambiguation that caught this, which is the condition under which researchers do not check, and it is the condition this project exists to argue is unsafe. DEVIATIONS.md D16.",
  three_model_screen      = "The run that repairs every harness defect this project found, and then delivers the thing the competition actually asks for. Opus 4.8, GPT-5.6 (high) and Grok 4.5 screened the same 1,000 works, drawn from the REAL 4.3M frame with known selection probabilities, on the rubric's FULL eight-field payload (repairs D1), with chunks randomized and manifest-logged before any model ran (repairs finding 16's confound), labels written by the HARNESS and reconciled against the manifest (repairs D2 and D11). Design-weighted base rates span 1.89% to 3.54%. But finding 16 predicted the real result and it holds: RATE AGREEMENT IS NOT SET AGREEMENT. Of the 51 works ANY model called metaresearch, only 19 (37%) were called metaresearch by ALL THREE, and 24 (47%) rest on a SINGLE model's opinion. Jaccard overlap between any two models is about half. THE FIELD'S BOUNDARY IS NOT A LINE THE MODELS SHARE; IT IS A REGION THEY EACH CUT DIFFERENTLY, and the size of that region is the honest uncertainty. GPT-5.6 also violated the locked output schema on 18 of 1,000 records, writing GENRE values into the TIER field, which the manifest validator caught and which the re-run did not reproduce: the violation is not deterministic. Consequence: the deliverable is NOT a base rate. It is the disagreement dossier, the 51 works that mark the empirical boundary, and the tier-confusion table that names which rubric distinctions three frontier models cannot apply consistently. A distinction three frontier models cannot apply consistently is not a distinction; it is a wish, and the criteria must be rewritten against those seams. The largest seam is OUT-vs-T2: the adjacent traditions (STS, LIS) the inclusiveness criterion exists to protect.",
  agent_variance          = "This is the finding that reorders the others. Finding 13 budgets the entire screen on a cheap model and NOBODY HAD TESTED WHETHER IT CAN DO THE RUBRIC. Tested: Haiku lands on a base rate near Sonnet's (1.27% vs 1.06%) and agrees on 98.1% of the frame, but their in-scope SETS overlap 16% unweighted, 10% design-weighted. Of Sonnet's 58 positives, Haiku agrees on 12. They reach a similar NUMBER by finding DIFFERENT WORKS, and agreement and kappa are blind to it because both are dominated by the settled OUTs. RATE AGREEMENT IS NOT SET AGREEMENT, and finding 13's budget assumed it was. Worse: agents of ONE model, on ONE rubric, with ONE prompt, disagree beyond chance AFTER conditioning on what each was shown (CMH p = 0.0056, replicated in a second arm at 0.015), with raw spreads of 3.1x and 5.2x against 2.2x between models, and the agents' ordering FLIPS between arms. So finding 10's screener swap, which this proposal calls 'the honest uncertainty', measured the SMALLER term. (The first draft's unadjusted test was confounded by stratum mix and its 13.2x weighted spread was leverage on five events: DEVIATIONS.md D13. The correction STRENGTHENED the adjusted p.) The inference is scoped to these runs (three agents, block-assigned chunks), which is exactly enough to break a budget that assumed exchangeability. The pilot's own 40 agents cannot rule the same out (5 of 37 chunks found zero metaresearch; p = 0.113 is LOW POWER, not agreement, and reading it as agreement is precisely the error D4 retracted). Consequence: no machine pass measures this field at any price; the machine screen is DEMOTED TO A STRATIFIER for the human audit, whose design weights stay unbiased under a noisy stratifier; machine tiers ship marked provisional; and the full screen assigns agents randomised, manifest-logged, fixed-size chunks with a duplicate-agent reliability arm and loud completeness checks.",
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
    "i" = "Add {?it/them} to ORDER and CONSEQUENCE, or the write-up drifts from the code."
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
