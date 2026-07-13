# Pilot findings

Every number below is produced by a script in `pilot/`, against the live OpenAlex
API, with the raw response archived under `pilot/raw/`. Re-derive them offline,
with no network at all, using `make pilot-offline`.

Computed: 2026-07-13T03:45:06Z

| # | Finding | Consequence for the design |
|---|---|---|
| 1 | **The frame is built, not estimated: 4,299,418 works.** The frame is BUILT, not estimated. All 482 partitions of a pinned OpenAlex snapshot were streamed and filtered, and the Canadian frame holds 4,299,418 works, each exactly once. For most of this project's life 'the frame' was 3,507,205, an EXTRAPOLATION from a single partition, hardcoded in six scripts; the estimate was 18% LOW, and every cost, audit-power and field-size figure computed against it has moved. The route that matters: 1,565,226 works (36.4% of the frame) are INVISIBLE TO AFFILIATION ALONE. A frame built on Canadian affiliation would hold 2,734,192 works and would never see them. That is finding 2 at frame scale, and it is why the frame is a union of four routes and why every record carries the provenance of the route that admitted it. | The precondition for everything else, and for most of this project's life it did not exist. 'The frame' was 3,507,205 works: an EXTRAPOLATION from a single OpenAlex partition, hardcoded in six scripts, against which every cost, audit-power and field-size figure was computed. The frame is now BUILT: all 482 partitions streamed and filtered, 4,299,418 works, each exactly once. The estimate was 18% LOW and every number downstream has moved. Nothing about the method changed; every NUMBER did, which is what it means for a frame to be enumerable rather than hypothesised. THE ROUTE THAT MATTERS: 1,565,226 works (36.4%) are INVISIBLE TO AFFILIATION ALONE. An affiliation-only frame would hold 2,734,192 works and would never see them. That is finding 2 (64% of the topic space has no raw affiliation string) made concrete at frame scale, and it is the empirical justification for the union-of-routes design and for carrying provenance on every record. Consequence: no script may hardcode the frame size again (R/frame_size.R reads it from the artifact the harvest writes), and a frame that cannot say WHY it admitted a work cannot be audited, which is the whole thesis. |
| 2 | **Metaresearch is ~1% of Canadian research.** Screening 5,737 unfiltered Canadian works against the rubric puts metaresearch at 1.31% of Canadian research, implying ~56,206 works in the 4,299,418-work frame, sizing the field without a search strategy at all. The 95% CI on this screener's labels is 1.03-1.64%, but that is sampling error, NOT the uncertainty: swap the screener and the estimate lands outside it (finding 10). The field is somewhere between 37,000 and 83,000 works, and only the human audit can narrow that. | Sizes the field without a search strategy. This is what capture-recapture failed to produce. But the binomial CI on it is sampling error, NOT uncertainty; see the next finding but one. |
| 3 | **The topic route finds one in eight of the field.** Scored against the rubric, the topic route retrieves 12% of Canadian metaresearch (95% CI 5.6-21.6%) at 60% precision: it misses 66 of 75. It fails because OpenAlex files a work by what it is about, and metaresearch about cardiology reads as cardiology: the field is invisible to topic retrieval precisely because it is about other fields. | Scored directly against the rubric rather than by dividing a retrieved set by a field size. The route fails because OpenAlex files a work by what it is ABOUT: metaresearch about cardiology reads as cardiology. The field is invisible to topic retrieval precisely because it is about other fields. |
| 4 | **Swap the screener and the field doubles.** Swap which model is called 'the screener' and the base rate moves from 1.06% to 2.37%: a 2.2x spread, from 45,397 to 101,776 works in the frame. The two screeners agree on in/out for 98.4% of the frame (design-weighted), but that figure is dominated by the settled rejects: agreement falls to 95% inside the contested boundary. THE SCREENER-SWAP RANGE, NOT THE BINOMIAL CI ON EITHER MODEL ALONE, IS THE HONEST UNCERTAINTY ON THE FIELD'S SIZE. | The published 95% CI (1.03-1.64%) does not contain the second screener's estimate. So it is not an interval for the base rate; it is an interval for how many labels ONE model emits. The screener-swap range is the honest uncertainty, and it is why the human audit is the study rather than a validation appendix. |
| 5 | **A third of the frame is screened on its title alone.** The base rate's real bias is not recency but MISSING ABSTRACTS: 31.5% of the partition has none, and the screen finds 0.78% metaresearch there against 1.55% where an abstract exists (chi-square p = 0.023, robust to adjustment for year and language). A third of the frame is screened on its title alone. What this does NOT show, and an earlier draft wrongly claimed, is that the blindness is DIFFERENTIAL by tradition: the T2 no-abstract cell holds 4 works and the interaction is not significant (p = 0.141). That claim is withdrawn, as is 'Erudit's exact profile' (the stratum is 99% English and the works are NEWER, not older). The main effect is the finding. | A measured, significant, DIFFERENTIAL bias against the inclusiveness criterion, found in our own data before a reviewer found it. An earlier version of this check tested era instead (the covariate that does not move the estimate) and called the base rate robust. That was a decoy. Hence the human audit now stratifies on abstract availability. |
| 6 | **No OpenAlex topic for the field.** Of 4,516 OpenAlex topics, 0 name metaresearch as a field. The 11 topics that do carry metaresearch content are scattered across 7 different OpenAlex fields. | No single retrieval route can enclose the field. Hence screening over a Canadian frame, with retrieval demoted to provenance. |
| 7 | **Affiliation metadata is mostly absent.** 508,744 of 793,883 works (64%) in the metaresearch topic space have no raw affiliation strings in OpenAlex. | An affiliation-only rule for 'Canadian' is structurally broken. Hence the funder clause in the primary estimand, and an audit that samples the screened-out stratum. |
| 8 | **Erudit is invisible to OpenAlex.** Erudit matches 0 sources in OpenAlex, but its OAI-PMH endpoint is live and exposes 379 harvestable sets. | An OpenAlex-only pipeline cannot even ask how much of the corpus is francophone. Hence the Erudit harvest, and language-stratified validation. |
| 9 | **Francophone metaresearch is nearly unfindable.** French is 2.7% (395/14,873) of Canadian metaresearch in OpenAlex. A dedicated French lexicon finds 168 Canadian works, against 8,026 in English. | The French share is not a fact about Canadian scholarship; it is a fact about the pipeline. Hence French and English performance are reported separately. |
| 10 | **Keyword retrieval cannot survive polysemy.** The single term reproducibility retrieves 43,392 Canadian works, of which only 0.8% fall in the metaresearch topic space. Keyword retrieval cannot separate the metaresearch sense from the everyday one. | The metaresearch sense of a term is not lexically separable from its everyday sense. Hence semantic screening, and these terms are excluded from the lexicon. |
| 11 | **'Canadian' is three different questions.** Affiliation finds 14,873 works; a further 3,964 are about Canada with no Canadian affiliation. NSERC has 9.2x SSHRC's linked works, so funder-based rules under-count the social sciences. | The three senses pick out different sets, and funder metadata skews against the social sciences. Hence one prespecified primary estimand, plus two prespecified alternatives. |
| 12 | **Capture-recapture is void here.** Naive two-route capture-recapture estimates 467,541 Canadian metaresearch works, implying Canada produces 59% of the world's metaresearch against an observed 1.9%. The estimator is void here; we cut it rather than dress it up as a lower bound. | We ran it, and it fails. Hence a base rate over a defined frame, and a two-phase stratified probability audit that samples the screened-out stratum directly. |
| 13 | **The API is metered; the snapshot is not.** The OpenAlex API is metered (1,000 credits per ~11h; $0.10 free tier). Enumerating the 4,299,418-work Canadian frame needs 21,498 cursor-paged calls: 10 days per pass on the free tier. An API-based pipeline at this scale is neither free nor reproducible; the pinned snapshot is both. | An API-based pipeline at this scale is neither free nor reproducible. Hence the pinned S3 snapshot, which is both. |
| 14 | **The prefilter existed because I miscosted the alternative.** The full rubric over the 4,299,418-work frame with two screeners costs $6,567, not the $30,608 an earlier version of this script reported: the rubric is a system prompt sent once per CALL, and the pilot's own chunks batch 155 works per call, so it was overcharged 4.7x. That error was not cosmetic. It made me propose a cheap TRIAGE in front of the screen, which is a RETRIEVAL STEP in a project whose central finding is that retrieval destroys these maps. With the arithmetic right the triage is unnecessary: the full rubric over EVERY work in the frame, plus a second screener on a 20,000-record sample, costs $1,110 and leaves ~$1,790 for the human coder. THE PREFILTER IS DELETED. | Feasibility is a judging criterion, so it gets a number rather than a promise. The first number was wrong: the rubric is a system prompt sent once per CALL, not once per WORK, and the pilot's own chunks batch 155 works per call, so the cost was overstated 5.1x. That error was not cosmetic. Believing the screen unaffordable, I put a cheap TRIAGE in front of it -- a RETRIEVAL STEP, in a project whose central finding is that retrieval destroys these maps. With the arithmetic right the triage saves $110 and costs the thesis. IT IS DELETED: every work in the frame is read against the full rubric. See DEVIATIONS.md D7. |
| 15 | **The audit could not measure what it exists to measure.** The audit as first specified could not measure what it exists to measure. A simple random sample of the 4,243,096-record screened-out mass yields an expected 0.4 hits from the 600 records budgeted; seeing 20 would take 2,009 coder-hours against the 65 planned. Score-stratified oversampling rescues it only partly (the pilot shows 30 of 37 disputed works sit at the contested boundary), and it stays BLIND to the confident rejects. Which works those are is a MECHANISM, not a measured differential: the rubric says judge on the title alone with no abstract, and says T2 work may use none of the field's vocabulary, so a work with neither is rejected confidently and never sampled. (An earlier version cited a 3.6x figure here as if it were measured; it rested on four works and is withdrawn.) So recall is measured two other ways: against the 5,737 works that already carry rubric labels, and by KNOWN-ITEM recall on a venue reference set, because venue is an external criterion immune to the aboutness that defeats everything else. | The central promise of the project (a human audit that quantifies what the pipeline missed) was, as first specified, arithmetically impossible: the works a screen wrongly rejects are a vanishing fraction of a 3.2M-record rejected mass, so 600 sampled records find less than one of them. Score-stratified oversampling rescues it only partly and stays BLIND to the confident rejects, which finding 11 says are exactly the T2 and no-abstract works. Hence two further instruments: measure any filter against the 5,737 works that already carry rubric labels, and use KNOWN-ITEM recall on a venue reference set, because venue is an external criterion immune to the aboutness that defeats everything else. |
| 16 | **What the machine labels cannot tell us, including about my own headline.** Two limits on the machine labels, found by attacking the fixes. (A) The topic route's recall is 12% against screener A and 7% against screener B: finding 14's instrument (ii) scores filters against MACHINE labels, so it measures agreement with a machine, not accuracy, and finding 10 already showed that swings by a factor of two. The conclusion strengthens (the second screener thinks the route is WORSE) but 12% is not truth. (B) The pilot holds exactly 1 French in-scope work, so seeing 20 French positives needs ~1,620 coded French records against an audit budget of 1,000. FRENCH SENSITIVITY IS NOT ESTIMABLE IN AN OPENALEX-ONLY FRAME. That is an argument for the Erudit harvest, not against the French claim, but the pilot did not run that harvest, so the power is stated as a condition rather than a promise. | Attacking the FIXES. (A) The topic route's recall is 12% against one screener and 7% against the other, so finding 14's instrument (ii) measures agreement with a MACHINE, not accuracy. The conclusion strengthens (the route is worse than advertised) but the number is not truth. (B) The pilot holds ONE French in-scope work, so French sensitivity is not estimable in an OpenAlex-only frame at any feasible audit size. That is an argument for the Erudit harvest, which the pilot did not run: so French power is stated as a CONDITION, not promised. |
| 17 | **The noise inside one model exceeds the difference between models.** Haiku, the model finding 13 budgets the entire screen on, lands near Sonnet's base rate (1.27% vs 1.06%) and agrees with it on 98.1% of the frame, but their in-scope SETS overlap 16% unweighted and 10% design-weighted (Sonnet-GPT: 54%/37%); of Sonnet's 58 positives Haiku agrees on 12. RATE AGREEMENT IS NOT SET AGREEMENT. Worse: agents of the SAME model on the SAME prompt disagree beyond chance in BOTH arms after conditioning on stratum (CMH p = 0.0056 and 0.015), with raw spreads 3.1x and 5.2x against 2.2x between models, and the agents' ordering FLIPS between arms. The noise inside one model is at least the size of the difference between models, and the pilot's own 40-agent screen is too underpowered to rule the same instability out (5 of 37 chunks found zero metaresearch; p = 0.113). | This is the finding that reorders the others. Finding 13 budgets the entire screen on a cheap model and NOBODY HAD TESTED WHETHER IT CAN DO THE RUBRIC. Tested: Haiku lands on a base rate near Sonnet's (1.27% vs 1.06%) and agrees on 98.1% of the frame, but their in-scope SETS overlap 16% unweighted, 10% design-weighted. Of Sonnet's 58 positives, Haiku agrees on 12. They reach a similar NUMBER by finding DIFFERENT WORKS, and agreement and kappa are blind to it because both are dominated by the settled OUTs. RATE AGREEMENT IS NOT SET AGREEMENT, and finding 13's budget assumed it was. Worse: agents of ONE model, on ONE rubric, with ONE prompt, disagree beyond chance AFTER conditioning on what each was shown (CMH p = 0.0056, replicated in a second arm at 0.015), with raw spreads of 3.1x and 5.2x against 2.2x between models, and the agents' ordering FLIPS between arms. So finding 10's screener swap, which this proposal calls 'the honest uncertainty', measured the SMALLER term. (The first draft's unadjusted test was confounded by stratum mix and its 13.2x weighted spread was leverage on five events: DEVIATIONS.md D13. The correction STRENGTHENED the adjusted p.) The inference is scoped to these runs (three agents, block-assigned chunks), which is exactly enough to break a budget that assumed exchangeability. The pilot's own 40 agents cannot rule the same out (5 of 37 chunks found zero metaresearch; p = 0.113 is LOW POWER, not agreement, and reading it as agreement is precisely the error D4 retracted). Consequence: no machine pass measures this field at any price; the machine screen is DEMOTED TO A STRATIFIER for the human audit, whose design weights stay unbiased under a noisy stratifier; machine tiers ship marked provisional; and the full screen assigns agents randomised, manifest-logged, fixed-size chunks with a duplicate-agent reliability arm and loud completeness checks. |
| 18 | **OpenAlex cannot represent the retraction record, and undercounts it.** Joined to the Canadian frame by DOI, Retraction Watch records 143 works that OpenAlex does NOT flag as retracted, including 49 outright retractions. But the undercount is the smaller problem. 52 of these carry an EXPRESSION OF CONCERN, and OpenAlex HAS NO FIELD FOR ONE: `is_retracted` is a boolean over a state space with at least four values (retraction, expression of concern, correction, reinstatement), so it can express one and silently reports the rest as FALSE, which reads as 'fine'. Nor can a boolean carry WHY. This is finding 1's disease in a second schema: the canonical database cannot express the distinction the field turns on. | Retraction Watch, joined by DOI, records 143 frame works OpenAlex does not flag, including 49 outright retractions. The undercount is the SMALLER problem: 52 carry an EXPRESSION OF CONCERN, and OpenAlex HAS NO FIELD FOR ONE. `is_retracted` is a BOOLEAN over a state space with at least four values (retraction, expression of concern, correction, reinstatement), so it expresses one and reports the rest as FALSE, which reads as 'fine'. Nor can a boolean carry WHY. This is finding 1's disease in a second schema: the canonical database cannot express the distinction the field turns on. Consequence: retraction ships as a record ATTRIBUTE carrying Retraction Watch's own state and reasons, NOT as a frame route (a retracted cardiology paper is retracted cardiology, not metaresearch). |
| 19 | **Both clauses of the estimand rest on metadata that is mostly absent.** The PRIMARY ESTIMAND leans on CA-FUND to rescue works whose affiliation is missing (finding 2: 64% have no affiliation string), and nothing had tested it. Tested against CIHR's own database of 44,190 funded projects, the result REFUTED THE HYPOTHESIS I WROTE BEFORE RUNNING IT: OpenAlex tags 178,133 frame works with CIHR, or 4.03 per grant, a plausible rate showing no under-tagging (DEVIATIONS.md D14). What the data DOES support needs no hypothesis of mine: 71.2% OF THE FRAME CARRIES NO FUNDER METADATA AT ALL, which is CA-FUND's hard ceiling, and 65.9% of Canadian-AFFILIATED works carry none either. Both clauses of the estimand rest on metadata that is mostly absent, which is why the frame is a union of four routes and why the audit must sample the works no route reached. | The primary estimand's funder clause exists to rescue works with no usable affiliation (finding 2: 64% have none), and NOTHING had tested it. Tested against CIHR's own database of 44,190 funded projects, the result REFUTED THE HYPOTHESIS I WROTE BEFORE RUNNING IT: OpenAlex tags 178,133 frame works with CIHR, 4.03 per grant, a plausible rate showing no under-tagging at all (DEVIATIONS.md D14; the papers-per-grant ratio was also the WRONG instrument, dividing two quantities not linked record to record, exactly as the retracted 32.4% coverage figure did). What the data DOES support needs no hypothesis of mine: 71.2% of the frame carries NO FUNDER METADATA AT ALL, and 65.9% of Canadian-AFFILIATED works carry none. That is CA-FUND's hard ceiling. BOTH CLAUSES OF THE PRIMARY ESTIMAND REST ON METADATA THAT IS MOSTLY ABSENT, which is why the frame is a union of four routes and why the audit must sample the works no route reached. |
| 20 | **The abstract gap is structural, and no source in the chain reaches it.** The screen's largest measured bias is the abstract gap: 23.3% of the frame (1,003,117 works) has NO ABSTRACT, and finding 11 showed the screen finds HALF as much metaresearch there. Cascading PubMed, Europe PMC and Crossref recovers 37.8% of a 500-work sample, cutting title-only exposure to ~14.5% of the frame. But I BUILT THE CASCADE AROUND CROSSREF as the discipline-agnostic rescue, and it recovered 2 abstracts against PubMed's 180: publishers do not deposit them, so THAT RESCUE DOES NOT EXIST (D15). The gap is therefore not a metadata failure a better index fixes; it is STRUCTURAL. Recovery is 91.2% for reviews against 6.2% for book chapters, 38.8% English against 15.4% French. So the tempting shortcut, 'just screen the works that have abstracts', is a SELECTION ON A COVARIATE THAT PREDICTS THE OUTCOME which would delete 61.6% of book chapters against 22.1% of articles, AND the works it deletes are exactly the works no cascade can rescue. Defensible only as a DECLARED exclusion with a measured cost, and the audit keeps a sampling floor in it. | The screen's largest measured bias: 23.3% of the frame (1,003,117 works) has NO ABSTRACT, and finding 11 measured that the screen finds HALF as much metaresearch there. I built a PubMed/Europe PMC/Crossref cascade around Crossref as the DISCIPLINE-AGNOSTIC rescue, and wrote that reasoning into the script before running it. Crossref recovered TWO abstracts; PubMed recovered 180 (D15). Publishers do not deposit abstracts to Crossref, so THE RESCUE DOES NOT EXIST. The cascade still cuts title-only exposure from 23.3% to ~14.5%, but the finding is worse than the one I went looking for: the gap is STRUCTURAL, not a metadata failure a better index repairs. Recovery is 91.2% for reviews against 6.2% for book chapters and 0% for letters; 38.8% English against 15.4% French. The works with no abstract are disproportionately the works NO abstract service covers, and the residue is humanities-shaped, book-shaped and francophone-shaped: precisely what an inclusive map exists to include. Consequence: 'screen only works with abstracts' is a SELECTION ON A COVARIATE THAT PREDICTS THE OUTCOME (it deletes 61.6% of book chapters against 22.1% of articles), admissible only as a DECLARED exclusion with a measured cost, and the audit keeps a sampling floor in the excluded stratum. |
| 21 | **The preprint coverage claim, measured instead of asserted.** The frame carries 156,086 preprints, and the tempting move was to assert that OpenAlex covers the preprint servers and skip the ingest. That is a COVERAGE CLAIM, and this project does not get to make one from inside the pipeline being claimed for: it is the topic route certifying its own recall (finding 12). Measured instead against the servers' OWN API, OpenAlex indexes 99.6% of the 705 bioRxiv and medRxiv preprints enumerated (3 missing). The claim survives measurement, so no separate preprint ingest is built. | The frame carries 156,086 preprints and the tempting move was to assert that OpenAlex covers the servers and skip the ingest. That is a COVERAGE CLAIM, and this project does not get to make one from inside the pipeline being claimed for: it is the topic route certifying its own recall. Measured instead against bioRxiv and medRxiv's OWN API, OpenAlex indexes 99.6% of the preprints the servers say they hold. The claim SURVIVES measurement, so no separate ingest is built, and it is allowed in the proposal only because it was checked. arXiv is NOT tested and that claim stays open. |
| 22 | **The number that looked like a replication and was a coincidence.** The registry is the only REFERENCE STANDARD in this project not made of machine labels: ClinicalTrials.gov knows a Canadian trial happened independently of any pipeline, so it cannot be wrong in the pipeline's favour. Of 304 publications SPONSORS THEMSELVES reported as results of completed Canadian-located trials, the frame holds 160: a naive recall of 52.6%, which fell so close to the 44.5% THIS PROPOSAL OPENS WITH that it read as a replication. IT IS AN ARTIFACT, and running the disambiguation is the only thing that caught it: 137 of the 145 'misses' have NO CANADIAN AUTHOR (multi-site international trials with a Canadian SITE), and a frame of Canadian RESEARCH is CORRECT to exclude them. A trial with a Canadian site is not a publication with a Canadian author. Against the population the frame actually claims, recall is 95.2% (95% CI 90.8-97.9), and the real defect is 8 works OpenAlex holds WITH a Canadian author that the frame's own routes still missed. The frame is GOOD at this, the dramatic parallel was a coincidence between two different populations, and I had every incentive not to check. DEVIATIONS.md D16. | The only reference standard in this project NOT made of machine labels: ClinicalTrials.gov knows a Canadian trial happened independently of any pipeline, so it cannot be wrong in the pipeline's favour. The first number out of it was 52.6% frame recall, which fell so close to the 44.5% THIS PROPOSAL OPENS WITH that it read as a replication of my own prior finding on Canadian data. IT WAS A COINCIDENCE BETWEEN TWO DIFFERENT POPULATIONS. 137 of the 145 'misses' have NO CANADIAN AUTHOR: multi-site international trials with a Canadian SITE, which a frame of Canadian RESEARCH is CORRECT to exclude. A trial with a Canadian site is not a publication with a Canadian author. True recall against the population the frame actually claims is 95.2% (95% CI 90.8-97.9), and the real defect is 8 route-gap works. Every incentive pointed away from running the disambiguation that caught this, which is the condition under which researchers do not check, and it is the condition this project exists to argue is unsafe. DEVIATIONS.md D16. |
| 23 | **The field's boundary is a region three models each cut differently.** Three frontier models (Opus 4.8, GPT-5.6 high, Grok 4.5) screened the same 5,600 works, drawn from the real 4.3M frame under a design whose seven strata PARTITION it (an earlier five-stratum design could not reach 12.9% of the frame at all; D22). Design-weighted base rates span 2.54% to 3.81% (1.5x). But the RATE is not the finding, the SETS are: of the 274 works ANY model called metaresearch, only 104 (38%) were called metaresearch by ALL THREE, and 117 (43%) rest on a SINGLE model's opinion; pairwise Jaccard on the in-scope sets is about 50%. THE FIELD'S BOUNDARY IS NOT A LINE THE MODELS SHARE; IT IS A REGION THEY EACH CUT DIFFERENTLY, and that result is STABLE across n = 1,000, 2,000 and 5,600 (unanimity 37%, 37%, 38%). A SECOND, PRETTIER CLAIM DID NOT SURVIVE: at n = 2,000 the models agreed markedly more on 'is this about research at all' (1.43x here) than on 'is it in scope' (1.51x here), and this project said so in capitals; at n = 5,600 the two spreads are within noise (ratio 1.06) and the claim is WITHDRAWN (D23). The largest tier confusion is OUT-vs-T2, every time, at every sample size: the adjacent traditions the inclusiveness criterion exists to protect. The deliverable is not a base rate. It is the disagreement dossier, the 274 works that mark the empirical boundary, each carrying all three models' stated reasons, and the criteria that have to be written against them. | The run that repairs every harness defect this project found, and then delivers the thing the competition actually asks for. Opus 4.8, GPT-5.6 (high) and Grok 4.5 screened the same 1,000 works, drawn from the REAL 4.3M frame with known selection probabilities, on the rubric's FULL eight-field payload (repairs D1), with chunks randomized and manifest-logged before any model ran (repairs finding 16's confound), labels written by the HARNESS and reconciled against the manifest (repairs D2 and D11). Design-weighted base rates span 1.89% to 3.54%. But finding 16 predicted the real result and it holds: RATE AGREEMENT IS NOT SET AGREEMENT. Of the 51 works ANY model called metaresearch, only 19 (37%) were called metaresearch by ALL THREE, and 24 (47%) rest on a SINGLE model's opinion. Jaccard overlap between any two models is about half. THE FIELD'S BOUNDARY IS NOT A LINE THE MODELS SHARE; IT IS A REGION THEY EACH CUT DIFFERENTLY, and the size of that region is the honest uncertainty. GPT-5.6 also violated the locked output schema on 18 of 1,000 records, writing GENRE values into the TIER field, which the manifest validator caught and which the re-run did not reproduce: the violation is not deterministic. Consequence: the deliverable is NOT a base rate. It is the disagreement dossier, the 51 works that mark the empirical boundary, and the tier-confusion table that names which rubric distinctions three frontier models cannot apply consistently. A distinction three frontier models cannot apply consistently is not a distinction; it is a wish, and the criteria must be rewritten against those seams. The largest seam is OUT-vs-T2: the adjacent traditions (STS, LIS) the inclusiveness criterion exists to protect. |
| 24 | **The locked instrument contradicts itself, and nothing caught it.** THE LOCKED INSTRUMENT CONTRADICTS ITSELF, AND NOTHING CAUGHT IT. The rubric and the output schema name TWO DIFFERENT controlled vocabularies for the same field, `genre`, overlapping on 2 values (empirical and other); 4 terms exist only in the rubric and 7 only in the schema. Every screener was handed both and told to obey both, and each invented its own reconciliation: GPT-5.6 and Grok followed the rubric and are therefore 26.9% and 20.9% ILLEGAL against the schema, while Opus drew from both lists at once and emitted 13 distinct values. The validator checked `tier` and never checked `genre`, so 16,800 labels passed every check that ran. It was found by an agent mentioning it in one clause of a report about something else. Nothing crashed; the variable simply meant a different thing in each arm, and the variance would have been attributed to the models. The labels are NOT repaired, because harmonising the arms after seeing them would destroy the only evidence that they diverged; the genre field is reported as unusable and the fix belongs in the instrument, at a version boundary. | The instrument this project locked, preregistered, and screened 5,000 works against SPECIFIES TWO DIFFERENT CONTROLLED VOCABULARIES FOR THE SAME FIELD. protocol/rubric.md names one genre list, protocol/screening-schema.json names another, and they overlap on TWO values out of eleven. Every screener was handed both documents and told to obey both, and each invented its own reconciliation: GPT-5.6 and Grok followed the rubric and are therefore 27% and 22% ILLEGAL against the schema they were told to conform to, while Opus drew from both lists at once and emitted 13 distinct values. The manifest validator checked `tier` and NEVER CHECKED `genre`, so 6,000 labels passed every check that ran. Nothing crashed. No file was malformed. The variable simply meant a different thing in each arm, and the resulting variance would have been read as MODEL DISAGREEMENT, which is the exact quantity this project is trying to measure. It was found because a screening agent mentioned it in one clause of a report about something else. Consequence: the genre field from this screen is REPORTED AS UNUSABLE and used for nothing downstream, and it is NOT remapped, because harmonising three arms after seeing how they diverged would destroy the only evidence that they did. The fix belongs in the instrument, at a version boundary, and the deeper fix is that a locked instrument must be MACHINE-CHECKED AGAINST ITS OWN SCHEMA before any model runs: a codebook that contradicts itself does not announce itself, it just produces variance and lets you blame the models. |
| 25 | **The design could not reach 12.9% of the frame, and no weight fixes that.** THE SAMPLING DESIGN COULD NOT REACH 12.9% OF THE FRAME, AND NO WEIGHT CAN FIX THAT. A stratified design rests on one identity, sum(N_h) = N. It was never checked. 549,370 works (12.9% of the sampling frame) had an inclusion probability of EXACTLY ZERO: 366,856 that no predicate claimed, because aff_core excluded everything ABOUT Canada while about_only excluded everything AFFILIATED with Canada, so a work that was both fell between them; and 182,514 more whose predicate evaluated to SQL NULL, which `WHERE p` and `WHERE NOT p` BOTH decline to select, so they were in no stratum and were not even orphans. Nothing threw. Every stratum returned exactly the n it asked for, because a stratum cannot know about the works it was never asked about, and the design drew a clean textbook probability sample OF 87% OF THE FRAME while every number computed from it said 'the frame'. A zero-probability work is not underweighted, it is UNREACHABLE, and design weights are the guarantee this project leans on hardest. THE CELL IT DELETED WAS THE SECONDARY ESTIMAND'S: 328,912 Canadian-affiliated works about Canada, in a study whose secondary estimand is 'metaresearch about the Canadian research system'. Repaired by adding the exact NULL-safe complement as two strata; the 7 strata now partition the frame by construction (4,255,410 = 4,255,410), asserted on every build. It was found by an adversarial model adding up five numbers I handed it. The defect made the sample TIDIER and the variance SMALLER, which is why nothing about it felt wrong: the errors that survive are the ones that flatter you. | The most serious defect this project has found, and it was found by a model I asked to attack me. A stratified design rests on one identity, sum(N_h) = N, and I never checked it. 549,370 works (12.9% of the sampling frame) had an inclusion probability of EXACTLY ZERO, from two defects stacked: aff_core excluded everything ABOUT Canada while about_only excluded everything AFFILIATED with Canada, so 366,856 works that were both fell between them; and 182,514 more had a stratum predicate that evaluated to SQL NULL, which `WHERE p` and `WHERE NOT p` BOTH decline to select, leaving them in no stratum and not even orphans. Nothing threw. Every stratum returned exactly the n it asked for, because a stratum cannot know about the works it was never asked about. The design drew a clean textbook probability sample OF 87% OF THE FRAME while every number computed from it carried the frame's name. A zero-probability work is not underweighted, it is UNREACHABLE: design weights are the guarantee this project leans on hardest ('unbiased however noisy the stratifier is') and that guarantee is VOID where the probability is zero. The deleted cell was the SECONDARY ESTIMAND'S OWN: 328,912 Canadian-affiliated works about Canada, in a study whose secondary estimand is metaresearch about the Canadian research system. Consequence: the strata are defined in one place (R/strata.R) with the two residual strata as the exact NULL-safe complement, so the seven PARTITION the frame by construction; check_strata_partition.R asserts exhaustive + disjoint + nonempty on every build and is verified BOTH ways; 600 new works drawn and screened. And the reason nothing felt wrong is the finding: the broken design produced a TIDIER sample and SMALLER variance than the correct one. THE ERRORS THAT SURVIVE ARE THE ONES THAT FLATTER YOU. |
| 26 | **Both clauses of 'Canadian' measure something other than their name.** BOTH CLAUSES OF 'CANADIAN' MEASURE SOMETHING OTHER THAN WHAT THEY ARE NAMED. This project has spent all its effort on what retrieval MISSES; this is the first hard evidence about what it wrongly ADMITS. (1) CA-AFF, the PRIMARY estimand's main clause: 17,466 works enter the frame on a Canadian 'institution' that does not exist. OpenAlex hands 'Discovery Air (Canada)' to a Brazilian linguistics paper, 'Musee de la Civilisation' to a Brazilian food-science paper, and 'Impact', which is not an institution at all but a parse failure with an institution id, to a Spanish COVID essay. The CA-AFF route also carries thousands of works in Latvian and Indonesian. That count is a LOWER BOUND: the artifact strings tested are only the ones screening agents noticed BY EYE while doing something else, and nobody has swept the institution vocabulary, so the true precision is UNKNOWN rather than merely unmeasured. (2) ABOUT-CA, the SECONDARY estimand: the retrieval route means 'Canada appears in the text' and the rubric field means 'the Canadian research SYSTEM is a substantive object of study', and in the strata built entirely on the former, the latter fires on 1.8% to 3.5% of works. Worse, `about_ca` cannot be true unless the work is ALREADY about research, so it is nearly collinear with tier: only 39 works in 5,600 are both in-scope AND about the Canadian research system. THE SECONDARY ESTIMAND CANNOT BE ESTIMATED FROM THE STRATUM DESIGNED FOR IT. Four screening agents found this independently and all four proposed the same repair: split the field into `about_ca_system` and `about_ca_topic`, because one boolean cannot separate 'Canadian data, universal claim' from 'a claim about Canada'. | Every other finding here is about what retrieval MISSES. This is the first about what it wrongly ADMITS, and it hits BOTH clauses of the estimand. CA-AFF, the primary clause: 17,466 works enter the frame on a Canadian 'institution' that does not exist, because OpenAlex hands 'Discovery Air (Canada)' to a Brazilian linguistics paper and 'Impact', a parse failure with an institution id, to a Spanish COVID essay; the route also carries thousands of works in Latvian and Indonesian. That number is a LOWER BOUND and is reported as one: the artifact strings tested are only those screening agents noticed BY EYE while doing something else, so CA-AFF precision is UNKNOWN, not merely unmeasured. ABOUT-CA, the secondary clause: the retrieval route means 'Canada appears in the text' and the rubric field means 'the Canadian research SYSTEM is a substantive object of study', and in the strata built entirely on the former the latter fires on 1-3% of works. Worse, `about_ca` cannot be TRUE unless the work is already about research, so it is nearly collinear with tier and carries almost no independent signal in the very stratum built to carry it: THE SECONDARY ESTIMAND CANNOT BE ESTIMATED FROM THE STRATUM DESIGNED FOR IT. Four screening agents found this independently, unprompted, and all four proposed the same repair: split into `about_ca_system` and `about_ca_topic`, because one boolean cannot separate 'Canadian data, universal claim' from 'a claim about Canada'. Consequence: the human audit must sample the RETRIEVED stratum too, because precision has to be measured and not assumed, and rubric v2 splits the field. |
| 27 | **A classifier trained on LLM labels cannot reproduce even its own teacher.** A CLASSIFIER TRAINED ON LLM LABELS CANNOT EVEN REPRODUCE ITS OWN TEACHER, LET ALONE ADJUDICATE THREE. Students distilled from each model match their own teacher at Jaccard 0.17, while the three teachers match EACH OTHER at 0.5 to 0.56: the classifier is a worse approximation of Opus than Grok is. Distilling from Opus also moves you AWAY from Grok (-0.35), so distillation does not bridge the models' disagreement, it degrades away from all of them. THE SELF-TRAINING LOOP THEN REFUTED MY OWN PREDICTION. I argued at length that it would shrink the positive class toward the confident anglophone core; run on 20,000 works the models never saw, it did not: positive rate drift +0.00 points, French share drift +0.00 points, because class weighting prevents the collapse, exactly as the adversarial review warned before the run ('a serious risk, NOT A THEOREM'). What the loop DID do is reach a fixed point immediately and recycle its own labels (224 -> 424 training positives, then nothing): it CONVERGED WITHOUT LEARNING, and a fixed point looks identical from the inside whether its labels are right or wrong. What the classifier IS worth is the stratifier: 48.2% of the in-scope works sit in its top decile against a blind baseline of 10%, a 4.8x lift in in-scope works found per unit of human coding effort, and design-weighted estimates stay unbiased however noisy it is. THE MACHINE DECIDES WHERE THE HUMANS LOOK. IT NEVER SUPPLIES A LABEL. | The answer to 'why not train an ML model on the LLM labels and iterate until it matures?', run as an experiment instead of argued as an opinion, and it went two ways. AGAINST the idea: a student distilled from each model matches ITS OWN TEACHER at Jaccard 0.17, while the three teachers match EACH OTHER at 0.50 to 0.56. The classifier is a worse approximation of Opus than Grok is. Distilling from Opus also moves you AWAY from Grok (-0.35), so distillation does not bridge the models' disagreement, it degrades away from all of them; the boundary is not recoverable from surface text at this sample size, and training on one model's labels would silently settle the question the audit exists to answer. AGAINST ME: I predicted at length that the self-training loop would shrink the positive class toward the confident anglophone core, implementing the rubric's own error 3 as an optimiser. Run on 20,000 works the models never saw, IT DID NOT: positive rate drift 0.00 points, French share drift 0.00 points, because class weighting prevents the collapse, exactly as the adversarial review had warned BEFORE the run ('a serious risk, NOT A THEOREM'). What the loop did instead was reach a fixed point immediately and recycle its own labels (224 -> 424 training positives, then nothing): IT CONVERGED WITHOUT LEARNING, and a fixed point looks identical from the inside whether its labels are right or wrong, so 'the algorithm has matured' is not something the loop can ever report. FOR the idea, in its correct form: as a STRATIFIER the classifier puts 48% of the in-scope works in its top decile against a blind baseline of 10%, a 4.8x lift in in-scope works found per unit of human coding effort, and design-weighted estimates stay unbiased however noisy it is. Consequence: the classifier is built, and it allocates human effort. It never supplies a label, and it never produces the estimate. |

## Raw values

```json
{
  "the_frame": {
    "built_from": "all 482 partitions of a pinned OpenAlex snapshot, streamed and filtered; each work appears exactly once",
    "partitions": 482,
    "works": 4299418,
    "prior_estimate": 3507205,
    "estimate_was_low_by_pct": 18,
    "estimate_was_an_extrapolation_from_one_partition": true,
    "route_ca_aff": 2734192,
    "route_about_ca": 1316408,
    "route_ca_fund": 788103,
    "route_ca_venue": 638161,
    "invisible_to_affiliation": 1565226,
    "pct_invisible_to_affiliation": 36.4,
    "with_venue": 3902048,
    "pct_with_venue": 90.8,
    "with_abstract": 3296301,
    "pct_with_abstract": 76.7,
    "pct_no_abstract": 23.3,
    "french": 237207,
    "pct_french": 5.5,
    "built_utc": "2026-07-12T17:59:59Z",
    "caveat": "The frame is bounded by OpenAlex. A work whose Canadian link is invisible to the metadata (no affiliation, no funder, no textual mention, no Canadian venue) cannot enter ANY frame by any method, and scholarship indexed by neither OpenAlex nor Erudit is not estimated here. That is a hard boundary of the data, not of this design, and it is stated rather than hidden. Erudit matches ZERO OpenAlex sources (finding 3), so the francophone share reported here (5.5%) measures the pipeline, NOT Canadian scholarship."
  },
  "base_rate": {
    "n_screened": 5737,
    "screener": "claude-sonnet-4-6, 40 agents, medium effort, locked rubric",
    "sampling_frame": "unfiltered Canadian works from the pinned 2026-06-24 snapshot partition",
    "tier_counts": {
      "OUT": 5621,
      "T1": 40,
      "T2": 35,
      "T3": 41
    },
    "n_in_scope_t1_t2": 75,
    "base_rate_pct": 1.31,
    "base_rate_ci_lo_pct": 1.03,
    "base_rate_ci_hi_pct": 1.64,
    "canadian_frame_size": 4299418,
    "estimated_field_size": 56206,
    "estimated_field_lo": 44268,
    "estimated_field_hi": 70338,
    "topic_route_retrieved": 14873,
    "binomial_ci_is_not_the_uncertainty": true,
    "caveat": "Machine labels, not a human gold standard, and the binomial CI above is sampling error on ONE screener; the honest uncertainty is the screener-swap range in finding 10 (1.06% to 2.37%). The partition is also not a uniform draw: it under-represents works with abstracts, where the screen finds 2x more metaresearch (finding 11). This is a hypothesis with a denominator; the human-coded probability sample tests it. Do NOT divide topic_route_retrieved by estimated_field_size; see finding 12."
  },
  "topic_route_recall": {
    "n_screened": 5737,
    "n_metaresearch": 75,
    "n_retrieved_by_route": 15,
    "true_positives": 9,
    "false_positives": 6,
    "false_negatives": 66,
    "recall_pct": 12,
    "recall_ci_lo_pct": 5.6,
    "recall_ci_hi_pct": 21.6,
    "precision_pct": 60,
    "precision_ci_lo_pct": 32.3,
    "precision_ci_hi_pct": 83.7,
    "missed_works_by_field": {
      "Social Sciences": 17,
      "Medicine": 16,
      "Health Professions": 7,
      "Business, Management and Accounting": 4,
      "Economics, Econometrics and Finance": 4,
      "Computer Science": 3
    },
    "scored_by": "primary_topic.id (the key R/frame.R defines the route with), not display name",
    "route_size_implied_by_sample": 11241,
    "route_size_from_api": 14873,
    "reconciliation_gap_x": 1.32,
    "supersedes": "the earlier 32.4% figure (14,873/45,850), which divided a retrieved set by a true field size",
    "caveat": "Small n on the positive class ( 75 metaresearch works, of which 15 were on the route), so the intervals are wide. Separately, the sample-implied route size does not reconcile with the API's 14,873 and I cannot say why at n = 15 on-route works; the likeliest cause is that one updated_date partition is not a uniform draw (finding 11). Recall is unaffected: it is a within-sample ratio, not an extrapolation."
  },
  "agreement": {
    "n_double_screened": 1290,
    "base_rate_screener_a_pct": 1.06,
    "base_rate_screener_b_pct": 2.37,
    "swap_ratio_x": 2.24,
    "field_size_screener_a": 45397,
    "field_size_screener_b": 101776,
    "published_binomial_ci_contains_b": false,
    "screener_a": "claude-sonnet-4-6 (40 agents, medium effort)",
    "screener_b": "gpt-5.6-sol (codex)",
    "sampling": "stratified on screener A's label; positives/paratext/boundary taken whole, settled-OUT sampled",
    "raw_agreement_inout_pct": 96.6,
    "weighted_agreement_pct": 98.4,
    "cohens_kappa_inout": 0.681,
    "n_disagree_inout": 44,
    "gpt_in_claude_out": 37,
    "claude_in_gpt_out": 7,
    "agreement_by_stratum": {
      "stratum": [
        "settled_out",
        "boundary",
        "positive",
        "paratext"
      ],
      "n": [
        600,
        599,
        58,
        33
      ],
      "sel_prob": [
        0.1249,
        1,
        1,
        1
      ],
      "agree_pct": [
        99,
        95,
        87.9,
        97
      ],
      "a_says_in": [
        0,
        0,
        58,
        0
      ],
      "b_says_in": [
        6,
        30,
        51,
        1
      ]
    },
    "caveat": "PROCESS METRIC, NOT ACCURACY. Two LLMs share training data and failure modes; their errors are correlated and most correlated on the boundary. This is not 'duplicate screening': that term's warrant comes from independent human judgement. Accuracy rests on the human-coded probability sample (PROTOCOL s6.2). Agreement is reported per stratum because a pooled kappa on a 1.3% base rate is dominated by the cell where agreement is free (the kappa paradox). And note what the high agreement figure CONCEALS: it is dominated by the settled-OUT mass, while the two screeners imply base rates a factor of two apart. Quoting agreement without the swap would be presenting the reassuring statistic."
  },
  "base_rate_robustness": {
    "partition": "updated_date=2026-06-24",
    "records_sent_to_screener": 6202,
    "records_silently_lost": 465,
    "records_lost_pct": 7.5,
    "pct_no_abstract_among_lost": 40.2,
    "pct_no_abstract_among_labelled": 31.5,
    "chisq_p_loss_bias": 0.0001,
    "losses_are_biased": true,
    "works_2000_09": 2704,
    "works_2020_25": 1195,
    "old_to_new_ratio": 2.3,
    "partition_skews_old": true,
    "base_rate_by_era_pct": {
      "2000-09": 1.24,
      "2010-19": 1.35,
      "2020-25": 1.4
    },
    "chisq_p_era": 0.906,
    "era_events": 75,
    "era_check_is_underpowered": true,
    "no_abstract_share_pct": 31.5,
    "base_rate_no_abstract_pct": 0.78,
    "base_rate_has_abstract_pct": 1.55,
    "chisq_p_abstract": 0.023,
    "abstract_effect_x": 2,
    "t1_penalty_x": 1.4,
    "t2_penalty_x": 3.6,
    "t2_no_abstract_cell_count": 4,
    "interaction_p": 0.141,
    "differential_is_supported": false,
    "differential_claim_withdrawn": true,
    "no_abstract_mean_year": 2013.7,
    "has_abstract_mean_year": 2010.3,
    "no_abstract_stratum_pct_english": 99,
    "p_no_abstract_given_english_pct": 32,
    "p_no_abstract_given_non_english_pct": 12.7,
    "erudit_profile_claim_holds": false,
    "residual_bias_direction": "anti-conservative for coverage claims: the partition over-represents abstract-less works (31.5%), where the screen finds 2x less metaresearch, so 1.31% likely UNDER-states the frame's base rate, and the field is larger than the headline implies",
    "supersedes": "THREE retractions live here. (1) An earlier version tested ERA only, called the base rate robust, and published 3100/2900/1500 as percentages (a dplyr summarise() column-masking bug). (2) It then claimed the blindness is DIFFERENTIAL, T2 losing 3.6x against T1's 1.4x, and made that the proposal's whole answer to the inclusiveness criterion. The T2 no-abstract cell holds FOUR works and the interaction is not significant (p = 0.141). WITHDRAWN. (3) It claimed missing abstracts track 'older, non-English' records, 'Erudit's exact profile'. Backwards: they are NEWER, and the stratum is 99% ENGLISH. WITHDRAWN. See DEVIATIONS.md D4, D5, D6.",
    "caveat": "What survives is the MAIN EFFECT and only the main effect: a third of the frame is screened on its title alone and the screen finds half as much metaresearch there (p = 0.023, robust to adjustment for year and language). That is a real coverage problem and a reason to stratify the audit on abstract availability. It is NOT evidence of differential blindness by tradition, and this finding no longer says it is. Separately, the era check is underpowered (75 events, 3 strata) and cannot refute an era effect; it merely fails to detect one. And note D2: the harness silently dropped 465 records, non-randomly, on this very covariate."
  },
  "topics": {
    "n_topics_in_taxonomy": 4516,
    "n_topics_naming_field": 0,
    "topics_naming_field": [],
    "n_candidate_topics": 11,
    "n_fields_spanned": 7,
    "fields_spanned": [
      "Arts and Humanities",
      "Computer Science",
      "Decision Sciences",
      "Mathematics",
      "Medicine",
      "Psychology",
      "Social Sciences"
    ],
    "candidate_topic_ids": [
      "T10102",
      "T13607",
      "T13516",
      "T11937",
      "T10206",
      "T10582",
      "T10267",
      "T10778",
      "T13558",
      "T13284",
      "T11875"
    ]
  },
  "affiliation_gap": {
    "topic_space_total": 793883,
    "with_raw_affiliation": 285139,
    "without_raw_affiliation": 508744,
    "pct_without": 64.1
  },
  "erudit": {
    "openalex_sources_matching_erudit": 0,
    "oai_endpoint": "https://oai.erudit.org/oai/request",
    "oai_repository_name": "Erudit",
    "oai_earliest_datestamp": "2011-06-03",
    "oai_harvestable_sets": 379
  },
  "language_gap": {
    "canadian_topic_works": 14873,
    "n_english": 14028,
    "n_french": 395,
    "pct_french": 2.7,
    "en_lexicon_canadian_hits": 8026,
    "fr_lexicon_canadian_hits": 168,
    "fr_lexicon_world_hits": 4682,
    "canada_share_of_world_french": 3.6
  },
  "polysemy": {
    "hits_alone": {
      "reproducibility": 43392,
      "\"peer review\"": 21234,
      "\"open access\"": 6609,
      "\"open science\"": 1925
    },
    "hits_alone_and_on_topic": {
      "reproducibility": 362,
      "\"peer review\"": 795,
      "\"open access\"": 634,
      "\"open science\"": 325
    },
    "topic_space_precision_pct": {
      "reproducibility": 0.8,
      "\"peer review\"": 3.7,
      "\"open access\"": 9.6,
      "\"open science\"": 16.9
    },
    "disciplined_lexicon_hits": 8026,
    "worst_term": "reproducibility"
  },
  "canadian_linkage": {
    "by_affiliation": 14873,
    "by_funder": 1331,
    "about_canada": 5704,
    "about_canada_no_affiliation": 3964,
    "funder_works": {
      "Canadian Institutes of Health Research": 194681,
      "Natural Sciences and Engineering Research Council of Canada": 433090,
      "Social Sciences and Humanities Research Council of Canada": 46913,
      "Canada Foundation for Innovation": 16753
    },
    "sshrc_works": 46913,
    "nserc_works": 433090,
    "nserc_to_sshrc_ratio": 9.2,
    "affiliation_noise": {
      "University of London": 494,
      "Impact": 475
    }
  },
  "capture_recapture_fails": {
    "route1_topic": 14873,
    "route2_naive_lexical": 77583,
    "overlap": 2468,
    "observed_union": 89988,
    "lincoln_petersen_estimate": 467541,
    "entire_topic_space_all_countries": 793883,
    "canada_observed_share_pct": 1.9,
    "canada_implied_share_pct": 58.9,
    "estimator_void": true
  },
  "openalex_is_metered": {
    "observed_retry_after_s": 40268,
    "observed_ratelimit_limit": 1000,
    "observed_free_tier_usd": 0.1,
    "observed_cost_per_call_usd": 0.0001,
    "frame_size_works": 4299418,
    "per_page_max": 200,
    "calls_for_one_pass": 21498,
    "days_on_free_tier_per_pass": 10,
    "prepaid_cost_per_pass_usd": 2.15
  },
  "screening_cost": {
    "measured_from": "pilot/screening/chunks/*.json (6-field), pilot/screening/haiku/p8_guided/chunk_*.json (8-field), protocol/rubric.md; not asserted",
    "chars_per_token_assumed": 4,
    "tokens_per_work": 312,
    "tokens_per_work_six_field_deviation": 256,
    "payload_inflation_8_over_6": 1.22,
    "costed_at_the_rubric_payload_not_the_deviation": true,
    "tokens_rubric": 1876,
    "tokens_per_label": 37,
    "batch_works_per_call": 155,
    "frame_size": 4299418,
    "grant_usd_approx": 2900,
    "naive_cost_charging_rubric_per_work_usd": 30608,
    "corrected_cost_two_screeners_usd": 6567,
    "cost_overstatement_x": 4.7,
    "cost_full_rubric_whole_frame_cheap_usd": 1094,
    "cost_full_rubric_whole_frame_sonnet_usd": 3283,
    "cost_second_screener_on_sample_usd": 15,
    "second_screener_n": 20000,
    "total_no_prefilter_usd": 1110,
    "left_for_human_coder_usd": 1790,
    "prefilter_needed": false,
    "prefilter_design_total_usd": 1004,
    "prefilter_saving_usd": -106,
    "prefilter_deleted_because": "It is a RETRIEVAL STEP, in a project whose central finding is that retrieval destroys these maps (finding 12: the topic route finds 12% of the field). It existed only because the rubric was miscosted at once per WORK rather than once per CALL, overstating the alternative 5.1x. With the arithmetic right it saves almost nothing and costs the thesis. Deleted.",
    "pilot_works_screened": 6202,
    "frame_to_pilot_ratio": 693,
    "method_that_scales": "batch inference, not agent fan-out",
    "supersedes": "an earlier version charged the rubric once per work, reported $24,379 for the full-frame two-screener design, called it 'eight times the grant', and used that to justify a cheap prefilter. The rubric is a system prompt sent once per CALL, and the pilot's own chunks batch 155 works per call. DEVIATIONS.md D7.",
    "caveat": "Token counts use a 4-chars-per-token approximation and list prices as of 2026-07; both will move, and the conclusion is robust to +/-25% in either. Screening the frame with a cheaper model than the pilot used makes the CHOICE OF MODEL more consequential, not less: finding 10 shows two screeners already imply base rates a factor of two apart. That is precisely why the second screener and the screener-swap range are reported, and why the human audit is the study."
  },
  "audit_power": {
    "problem": "A simple random sample of the screened-out stratum cannot measure screening sensitivity: the works the screen wrongly rejected are a vanishing fraction of a 3.2M-record rejected mass.",
    "screened_out_pool": 4243096,
    "screened_out_is_the_screens_rejects": true,
    "audit_screened_out_budgeted": 600,
    "expected_hits_at_95_recall": 0.4,
    "codings_needed_for_20_hits_at_95_recall": 30134,
    "coder_hours_needed": 2009,
    "coder_hours_budgeted": 65,
    "naive_audit_is_powered": false,
    "disputed_in_boundary": 30,
    "disputed_in_settled_rejects": 6,
    "misses_concentrate_near_threshold": true,
    "blind_spot": "Score-stratified oversampling finds the works the screener ALMOST caught; it is blind to the ones it rejected CONFIDENTLY. WHICH works those are is a MECHANISM, not a measurement: the rubric says judge on the title alone when the abstract is missing, and the rubric also says T2 work may use none of the field's vocabulary, so a work with neither is rejected confidently and sits deep in the settled rejects. An earlier version cited a 3.6x differential from finding 11 as if this were measured. It is not, and that figure is withdrawn (DEVIATIONS.md D6). The venue instrument is how the prediction gets tested rather than asserted.",
    "blind_spot_is_a_mechanism_not_a_measurement": true,
    "instrument_1": "Measure any filter's recall against the 5737 works that already carry full-rubric labels, exactly as finding 12 scored the topic route. Free, and it needs no needle-hunting in the discarded mass.",
    "instrument_2": "Known-item recall on an external criterion: VENUE. A Canadian-authored paper in Social Studies of Science is T2 by where it was published, whatever its abstract is about. Venue is immune to aboutness, which is what defeats topic retrieval (finding 12) and title-only screening (finding 11), so it is the only instrument that can see into the blind spot.",
    "reference_venues": [
      "Social Studies of Science",
      "Scientometrics",
      "Quantitative Science Studies",
      "Research Integrity and Peer Review",
      "Journal of the Association for Information Science and Technology",
      "Research Evaluation",
      "Accountability in Research",
      "PLOS ONE (metaresearch collection)",
      "Recherches qualitatives",
      "Documentation et bibliotheques"
    ],
    "n_labelled_works": 5737,
    "n_in_scope": 75,
    "caveat": "The recall grid assumes the screen's misses are uniform in the rejected mass, which the pilot shows they are not (they concentrate at the boundary). That makes the naive design LESS hopeless than the grid implies but does not save it, and it does nothing at all about the confident-reject blind spot. Known-item recall on a venue reference set is a non-probability estimate: it bounds and diagnoses recall on the hard cases, it does not replace the design-weighted population estimate."
  },
  "label_limits": {
    "route_recall_vs_screener_a_pct": 12,
    "route_recall_vs_screener_b_pct": 7,
    "route_recall_a_ci": [
      5.6,
      21.6
    ],
    "route_recall_b_ci": [
      2.5,
      14.3
    ],
    "positives_screener_a": 75,
    "positives_screener_b": 88,
    "instrument_ii_is_model_dependent": true,
    "instrument_ii_caveat": "Finding 14's instrument (ii) scores a filter against the 5,737 MACHINE labels. That measures agreement with a machine, not accuracy. Swap the machine and the topic route's recall moves from 12% to 7%. The conclusion (the route finds a small fraction) survives and strengthens; the NUMBER is not a measurement against truth.",
    "french_records_in_pilot": 81,
    "french_in_scope_in_pilot": 1,
    "french_records_needed_for_20_positives": 1620,
    "audit_budget_records": 1000,
    "french_stratum_is_powered": false,
    "french_power_depends_on": "the Erudit harvest, which the pilot did NOT run (it verified the endpoint: 379 live sets)",
    "caveat": "(A) is a limit on every recall number this project quotes against machine labels, including its own headline. (B) is a limit on the inclusiveness promise: French sensitivity cannot be estimated in an OpenAlex-only frame, because Erudit matches zero OpenAlex sources and the francophone literature is therefore largely absent from the frame rather than merely sparse in it. Both are stated in the proposal rather than left for a reviewer."
  },
  "agent_variance": {
    "n_works": 1290,
    "base_rate_sonnet_pct": 1.06,
    "base_rate_gpt_pct": 2.37,
    "base_rate_haiku_pct": 1.27,
    "agreement_haiku_sonnet_pct": 98.1,
    "jaccard_sonnet_gpt_pct": 54,
    "jaccard_sonnet_haiku_pct": 16,
    "jaccard_gpt_haiku_pct": 12,
    "wjaccard_sonnet_gpt_pct": 37,
    "wjaccard_sonnet_haiku_pct": 10,
    "wjaccard_gpt_haiku_pct": 6,
    "sonnet_positives": 58,
    "haiku_agrees_on": 12,
    "agent_rates_raw_pct": {
      "agent-1": 1.6,
      "agent-2": 1.25,
      "agent-3": 3.85
    },
    "stratum_mix_differs_by_agent_p": 1.34e-17,
    "arm1_cmh_p": 0.0056,
    "arm1_permutation_p": 0.0275,
    "arm1_raw_spread_x": 3.1,
    "arm2_cmh_p": 0.0152,
    "arm2_permutation_p": 0.0075,
    "arm2_raw_spread_x": 5.2,
    "agent_order_replicates": false,
    "spread_weighted_x_leverage_sensitive": 13.2,
    "between_model_spread_x": 2.2,
    "within_at_least_matches_between": true,
    "pilot_chunks": 37,
    "pilot_agents_finding_zero": 5,
    "pilot_between_agent_p": 0.113,
    "pilot_underpowered_not_homogeneous": true,
    "caveat": "The first draft's between-agent test was CONFOUNDED: the stratum mix differs by agent (p = 1.3e-17), and the draft asserted a verification that did not exist (DEVIATIONS.md D13). The tests above condition on stratum, and the heterogeneity survives in both arms. The 13.2x design-weighted spread the draft led with rests on five high-weight events and is demoted to a recorded, leverage-sensitive descriptive. THE INFERENCE IS SCOPED: there are three agents per arm, assigned consecutive chunk blocks without randomisation or a run-time manifest, so these p-values license 'these runs are not exchangeable', not a population claim about agents in general; that is exactly enough to break a budget that assumed exchangeability, and the full study assigns agents randomised, manifest-logged, fixed-size chunks with a duplicate-agent reliability arm. The pilot's own agents give p = 0.113 on ~2 expected events per chunk: underpowered, so the pilot is uninformative on agent homogeneity, not exonerated. Haiku was tested on the six-field payload (the pilot's own deviation, D1) and on a guided eight-field arm, so the defensible conclusion is 'not shown to be an interchangeable measurer, and unstable in the arms tested', not 'cannot screen'. An eight-field neutral-prompt arm is not used at all: one agent claimed six label files it never wrote (D11), so no payload effect is reported from any arm. The guided arm is used ONLY for the between-agent contrast, which its shared prompt leaves internally valid."
  },
  "retraction_record": {
    "source": "Retraction Watch (Crossref-licensed), joined by bare lowercased DOI",
    "frame_works_with_doi": 3690953,
    "openalex_is_retracted_flags": 1584,
    "matched_in_retraction_watch": 1052,
    "openalex_misses": 143,
    "outright_retractions_missed": 49,
    "expressions_of_concern": 52,
    "missed_by_nature": {
      "Expression of concern": 52,
      "Retraction": 49,
      "Correction": 32,
      "Reinstatement": 10
    },
    "top_reasons": {
      "Investigation by Journal/Publisher": 335,
      "Unreliable Results and/or Conclusions": 259,
      "Concerns/Issues about Data": 233,
      "Investigation by Third Party": 169,
      "Concerns/Issues about Referencing/Attributions": 151,
      "Concerns/Issues about Results and/or Conclusions": 122,
      "Concerns/Issues about Peer Review": 109,
      "Investigation by Company/Institution": 101
    },
    "openalex_has_eoc_field": false,
    "is_a_frame_route": false,
    "caveat": "This is an ATTRIBUTE, not a frame route. A retracted cardiology paper is retracted cardiology, not metaresearch, and admitting works on the strength of a retraction would let an interesting signal masquerade as the estimand. The DOI join can only see works that HAVE a DOI, and OpenAlex flags some works Retraction Watch does not match, which may be DOI drift rather than disagreement; the asymmetry reported here is one-directional on purpose (what RW adds), because that is the direction the join can support."
  },
  "funder_route_recall": {
    "external_criterion": "CIHR's own project database (44,190 projects), which owes nothing to OpenAlex",
    "cihr_projects": 44190,
    "cihr_distinct_pis": 27536,
    "cihr_funder_id": "https://openalex.org/F4320334506",
    "frame_works": 4299418,
    "frame_works_tagged_cihr": 178133,
    "tagged_publications_per_funded_project": 4.03,
    "papers_per_grant_is_a_plausible_rate_not_a_defect": true,
    "expectation_i_wrote_before_running_and_that_was_false": "that OpenAlex under-tags CIHR so badly it falls below one paper per grant. It is 4.03 per grant, a plausible rate. See DEVIATIONS.md D14.",
    "works_ca_fund_rescues_alone": 166743,
    "frame_works_with_any_funder": 1239950,
    "pct_frame_with_any_funder": 28.8,
    "pct_frame_with_no_funder": 71.2,
    "ca_aff_works": 2734192,
    "ca_aff_works_with_no_funder": 1802605,
    "pct_ca_aff_with_no_funder": 65.9,
    "top_recorded_funders": {
      "Natural Sciences and Engineering Research Council of Canada": 294401,
      "Canadian Institutes of Health Research": 178133,
      "National Institutes of Health": 81262,
      "National Natural Science Foundation of China": 67358,
      "National Science Foundation": 62497,
      "Canada Research Chairs": 35113,
      "European Commission": 34039,
      "Social Sciences and Humanities Research Council of Canada": 33473
    },
    "is_an_aggregate_not_a_record_level_join": true,
    "caveat": "CIHR's CSV carries no DOIs and no publication links, so this is an AGGREGATE reconciliation, not a record-level known-item join, and NO RECALL POINT ESTIMATE is claimed. It establishes a CEILING on CA-FUND (the route cannot see a funder OpenAlex never recorded), which is a bound, not a measurement. The papers-per-grant ratio is reported because I ran it, and it REFUTES the hypothesis I wrote before running it: at 4.03 per grant it is a plausible publication rate and shows no CIHR under-tagging at all. It is also the wrong instrument, for the same reason the retracted 32.4% coverage figure was (D3): its numerator and denominator are not linked record to record, so the quotient has no estimand behind it. Record-level linkage is finding 21."
  },
  "abstract_cascade": {
    "frame_works": 4299418,
    "frame_works_no_abstract": 1003117,
    "pct_frame_no_abstract": 23.3,
    "pct_dropped_by_type": {
      "book-chapter": 61.6,
      "letter": 52.1,
      "editorial": 43.3,
      "review": 29.5,
      "article": 22.1,
      "book": 21.6,
      "other": 21.1,
      "report": 18.6,
      "preprint": 14,
      "dataset": 8.2,
      "dissertation": 4.3
    },
    "pct_dropped_by_language": {
      "fr": 21.6,
      "en": 23.7
    },
    "abstracts_only_is_a_selection_on_the_outcome": true,
    "sampled": 500,
    "sources": "PubMed (Entrez) -> Europe PMC (REST) -> Crossref (REST)",
    "recovered": 189,
    "pct_gap_recovered": 37.8,
    "recovered_by_source": {
      "pubmed": 180,
      "europepmc": 7,
      "crossref": 2
    },
    "hypothesis_crossref_would_be_load_bearing": false,
    "crossref_recovered": 2,
    "europepmc_recovered": 7,
    "pubmed_recovered": 180,
    "no_discipline_agnostic_rescue_exists": true,
    "the_gap_is_structural_not_a_metadata_failure": true,
    "recovery_pct_by_type": {
      "review": 91.2,
      "article": 40.5,
      "preprint": 38.5,
      "book-chapter": 6.2,
      "letter": 0
    },
    "recovery_pct_english": 38.8,
    "recovery_pct_french": 15.4,
    "residual_pct_frame_title_only": 14.5,
    "caveat": "Run on a 500-work hash-ordered sample of the no-abstract stratum, not the frame: the cascade is rate-limited and a million lookups is days. The recovery rate is an estimate with sampling error, and it is an estimate of a CEILING (an abstract that EXISTS is recoverable; it does not follow the screen then classifies the work correctly). Only works with a DOI can be looked up, so the DOI-less part of the stratum is untouched and its size bounds what any cascade can do. PubMed and Europe PMC are biomedical; Crossref is not, and it is in the chain for exactly that reason: a cascade of biomedical indexes would close the gap unevenly and make the residual bias MORE discipline-shaped while appearing to improve coverage. That reasoning was right and the remedy is not available: Crossref recovered 2 of 189 and Europe PMC 7, because publishers largely do not deposit abstracts to Crossref, so no discipline-agnostic rescue exists (D15). Restricting screening to abstract-bearing works remains a DECLARED EXCLUSION with a measured cost, not a scoping convenience, and the audit keeps a sampling floor in the excluded stratum so that cost stays estimable."
  },
  "preprint_coverage": {
    "external_criterion": "the bioRxiv/medRxiv details API, which enumerates the servers' own corpus and owes nothing to OpenAlex",
    "window": "2023-01-01 to 2025-12-31",
    "preprints_enumerated": 705,
    "indexed_by_openalex": 702,
    "missing_from_openalex": 3,
    "pct_indexed": 99.6,
    "sampled_with_canadian_author": 45,
    "of_those_present_in_frame": 45,
    "frame_preprints_total": 156086,
    "separate_ingest_needed": false,
    "caveat": "The bioRxiv API exposes no author country, so the sample is mostly non-Canadian and the clean quantity is INDEX coverage (does OpenAlex hold the preprint at all?), not Canadian recall: a preprint the index lacks cannot enter any frame by any route, so index coverage is the binding upper bound. The Canadian sub-count is small and is reported as a check, not as an estimate. arXiv is NOT tested here (its OAI endpoint pages differently); the frame carries 11,647 arXiv works and that claim remains untested against arXiv itself."
  },
  "trial_linkage": {
    "reference_standard": "ClinicalTrials.gov: completed trials with a Canadian location, and the RESULT publications the sponsors themselves reported",
    "why_not_a_frame_route": "A trial registration is not a publication and not metaresearch. Registrations contribute NO records to the frame; the registry is a reference standard, not a source.",
    "why_it_matters": "Every other recall number in this project is scored against MACHINE labels (finding 15). A registry knows a trial happened independently of any pipeline, so it cannot be wrong in the pipeline's favour. This is the only instrument here that measures the frame against a world that exists without it.",
    "trials_retrieved": 1000,
    "trials_with_result_publication": 123,
    "pct_trials_with_result_publication": 12.3,
    "known_result_pmids": 596,
    "resolvable_to_doi": 304,
    "present_in_frame": 160,
    "naive_frame_recall_pct": 52.6,
    "naive_recall_is_an_artifact": true,
    "naive_recall_ci": [
      46.9,
      58.4
    ],
    "missing_total": 145,
    "missing_no_canadian_author": 137,
    "missing_route_gap_canadian_author": 8,
    "missing_not_in_openalex": 0,
    "claimable_population": 168,
    "adjusted_recall_pct": 95.2,
    "adjusted_recall_ci": [
      90.8,
      97.9
    ],
    "is_metaresearch_recall": false,
    "caveat": "This measures FRAME recall (does the Canadian frame hold the publication at all?), NOT metaresearch recall: trial reports are primary research and the rubric screens them OUT. It is the precondition for screening, not the screen. The reference standard is the sponsor's OWN reported result publications, so it is incomplete in a known direction: sponsors under-report, which means the true set of trial publications is LARGER than the standard and this recall figure is measured only on the ones we can see. Trials are matched by Canadian LOCATION, which is not the same as Canadian authorship, so some result publications may have no Canadian author and legitimately fall outside the frame; that direction is not controlled here and it bounds the interpretation. Only PMIDs resolvable to a DOI can be looked up."
  },
  "three_model_screen": {
    "frame": "the real 4.3M-work Canadian frame (all 482 OpenAlex partitions)",
    "payload": "the rubric's FULL eight fields, including venue (repairs D1)",
    "sample": "1,000 works, stratified with known selection probabilities, French oversampled",
    "models": "Claude Opus 4.8; GPT-5.6 (high effort); Grok 4.5 (medium effort)",
    "harness": "chunks randomized and manifest-logged before any model ran; the harness writes label files, never the model (repairs D11); every arm reconciled against the manifest (repairs D2)",
    "n_labelled_by_all_three": 5600,
    "tranche_homogeneity_p": 0.63,
    "tranches_pool": true,
    "base_rate_weighted_pct": {
      "opus": 3.81,
      "gpt": 2.92,
      "grok": 2.54
    },
    "between_model_spread_x": 1.5,
    "jaccard_opus_gpt": 50,
    "jaccard_opus_grok": 50,
    "jaccard_gpt_grok": 56,
    "n_about_research_at_all": {
      "opus": 391,
      "gpt": 325,
      "grok": 274
    },
    "n_in_scope": {
      "opus": 224,
      "gpt": 163,
      "grok": 148
    },
    "spread_about_research_x": 1.43,
    "spread_in_scope_x": 1.51,
    "variance_is_in_the_rubric_not_the_models": true,
    "called_in_scope_by_any": 274,
    "unanimous_in_scope": 104,
    "pct_unanimous_of_any": 38,
    "in_scope_by_one_model_only": 117,
    "pct_single_model_of_any": 43,
    "contested_by_stratum": {
      "about_only": 67,
      "venue_new": 65,
      "residual": 64,
      "aff_core": 62,
      "fund_new": 61,
      "aff_about": 59,
      "french": 54
    },
    "tier_disagreement_patterns": {
      "OUT/T2": 77,
      "T1": 65,
      "OUT/T1": 57,
      "T2": 30,
      "T1/T3": 11,
      "T2/T3": 10,
      "T1/T2": 9,
      "OUT/T1/T2": 8,
      "OUT/T1/T3": 3,
      "OUT/T2/T3": 3
    },
    "gpt_schema_violations_first_pass": 18,
    "gpt_violation_note": "GPT-5.6 (high) wrote GENRE values ('empirical', 'conceptual') into the TIER field on 18 of 1,000 records in its first pass, in 3 of 20 chunks. The validator caught it because the harness reconciles files against a manifest rather than trusting the model's report. Those chunks were RE-RUN, not repaired: coercing a model's output to the schema is fitting the instrument to the data.",
    "deliverable": "pilot/screening/frame1k/disagreement_dossier.json: every work any model called in-scope, with all three labels. This, not the base rate, is what the criteria must be written against.",
    "caveat": "These are MACHINE labels and none of them is truth (finding 15). The unanimity rate is not accuracy: three models sharing training data can be wrong together, and they are most correlated exactly on the boundary cases the field's definition turns on. What this measures is where the RUBRIC is underspecified, which is a property of the instrument and is exactly what a criteria document needs. Base rates are design-weighted from a stratified sample, so they estimate the frame; the Jaccard and unanimity figures are unweighted set quantities over the sample and are NOT frame estimates."
  },
  "instrument_contradicts_itself": {
    "field": "genre",
    "rubric_vocabulary": [
      "empirical",
      "conceptual",
      "editorial/commentary",
      "policy",
      "infrastructure/announcement",
      "other"
    ],
    "schema_vocabulary": [
      "empirical",
      "review",
      "methods",
      "commentary",
      "editorial",
      "protocol",
      "dataset",
      "software",
      "other"
    ],
    "shared_values": [
      "empirical",
      "other"
    ],
    "n_shared": 2,
    "only_in_rubric": [
      "conceptual",
      "editorial/commentary",
      "policy",
      "infrastructure/announcement"
    ],
    "only_in_schema": [
      "review",
      "methods",
      "commentary",
      "editorial",
      "protocol",
      "dataset",
      "software"
    ],
    "arms": [
      "opus",
      "gpt",
      "grok"
    ],
    "n_labels": [
      5600,
      5600,
      5600
    ],
    "n_distinct_values_by_arm": [
      13,
      6,
      12
    ],
    "pct_legal_against_schema": [
      90.8,
      73.1,
      79.1
    ],
    "pct_legal_against_rubric": [
      86.1,
      100,
      99.8
    ],
    "validator_checked_tier": true,
    "validator_checked_genre": false,
    "labels_repaired": false,
    "found_by": "An Opus screening agent mentioned it in one clause of a report about something else, while working chunks it had been given for an unrelated reason. It was not looking for this, no check was watching for it, and it had already survived 6,000 labels across three models.",
    "caveat": "The genre variable from this screen is reported as UNUSABLE and is used for nothing. It is not remapped to a common vocabulary: the three arms resolved the contradiction differently, and harmonising them after the fact would destroy the only evidence that they did."
  },
  "zero_probability_region": {
    "full_frame": 4299418,
    "unscreenable_excluded": 44008,
    "sampling_frame": 4255410,
    "reachable_under_shipped_design": 3706040,
    "orphaned_predicate_false": 366856,
    "invisible_predicate_null": 182514,
    "zero_probability_works": 549370,
    "pct_of_sampling_frame": 12.9,
    "aff_and_about_cell": 328912,
    "strata_after_repair": 7,
    "strata_sum_after_repair": 4255410,
    "partition_holds": true,
    "found_by": "An adversarial model asked to attack the classifier design. Its first move was to add up the five design weights in a summary table I had handed it: 2000x1119 + 1000x664.2 + 750x536.8 + 750x310.9 + 500x335.8 = 3,705,875, against a frame of 4,299,418. I had never added them up.",
    "caveat": "The repair does not retro-fix numbers produced under the broken design; those estimated a 3.7M subpopulation and were reported under the frame's name, and saying so IS the finding. Every design-weighted figure is now re-derived against the seven-stratum design. The five original predicates are kept byte-for-byte because 5,000 works had already been drawn from them by hash order, and widening a stratum silently re-draws it."
  },
  "canadian_linkage_misnames_itself": {
    "ca_aff_works": 2714734,
    "ca_aff_only_institution_is_artifact": 17466,
    "artifact_strings_tested": [
      "Impact",
      "Discovery Air (Canada)",
      "Musée de la Civilisation",
      "Encana (Canada)",
      "Kellogg's (Canada)",
      "The Alberta Paraplegic Foundation"
    ],
    "artifact_count_is_a_lower_bound": true,
    "ca_aff_non_official_languages": [
      8734,
      8463,
      5289,
      5160,
      4708,
      1200
    ],
    "about_ca_pct_in_about_strata_opus": [
      1.8,
      3.5
    ],
    "about_ca_pct_in_about_strata_gpt": [
      1,
      2
    ],
    "about_ca_pct_in_about_strata_grok": [
      0.8,
      1.2
    ],
    "n_screened": 5600,
    "about_ca_and_in_scope": 39,
    "about_ca_and_out_of_scope": 26,
    "about_ca_nearly_collinear_with_tier": true,
    "found_by": "Screening agents, reporting records they were given for an unrelated reason. Four of them independently reported that the ABOUT-CA route and the rubric's about_ca field are different constructs, and all four proposed the same repair without having seen each other's reports.",
    "caveat": "The artifact count is a LOWER BOUND, and deliberately reported as one: the strings tested are only those agents noticed by eye. No sweep of the OpenAlex institution vocabulary has been done, so the true CA-AFF precision is unknown, not merely unmeasured. That is the honest state and it is why the human audit samples the retrieved stratum as well as the non-retrieved one: precision is measured, not assumed."
  },
  "distillation_ceiling": {
    "n_three_way_labelled": 5600,
    "student_vs_own_teacher_jaccard": [
      0.176,
      0.173,
      0.17
    ],
    "teacher_vs_teacher_jaccard": [
      0.5,
      0.5,
      0.563
    ],
    "bridging_gain": [
      -0.3483,
      -0.3482,
      -0.3375
    ],
    "selftrain_rounds": [
      0,
      1,
      2,
      3
    ],
    "selftrain_train_positives": [
      224,
      424,
      424,
      424
    ],
    "selftrain_pool_positive_rate_pct": [
      1,
      1,
      1,
      1
    ],
    "selftrain_french_share_pct": [
      6.5,
      6.5,
      6.5,
      6.5
    ],
    "selftrain_drift_positive_rate_pts": 0,
    "selftrain_drift_french_share_pts": 0,
    "my_shrinkage_prediction_was_refuted": true,
    "stratifier_top_decile_recall_pct": 48.2,
    "stratifier_lift_vs_blind": 4.8,
    "used_to_produce_any_estimate": false,
    "caveat": "The student is TF-IDF word+char n-grams with a cross-validated logistic head: the cheap classifier the question was actually about. A fine-tuned multilingual encoder would raise the student-vs-teacher number and change none of the argument, because the ceiling is set by the LABELS, not by the model class. The self-training loop's non-collapse is CONDITIONAL on class weighting and should not be read as a general safety result: it says the collapse is avoidable, not that the loop is informative. And nothing here produces a prevalence estimate; the classifier is a stratifier, and the human audit is the instrument."
  }
}
```

