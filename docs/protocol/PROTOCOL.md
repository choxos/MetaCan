# MétaCan: study protocol

**An open, provenance-tracked, coverage-audited map of Canadian metaresearch**

Ahmad Sofi-Mahmudi · Independent researcher · ahmad.pub@gmail.com
Repository: <https://github.com/choxos/CaRN-data-challenge>

**Status: preregistration draft.** To be registered on OSF **before the frame is built and before any retrieval
is run**. Registration date, OpenAlex snapshot version, and Érudit harvest date will be stamped into
`RELEASE.md` at v1.0 and cannot be revised afterwards.

---

## 1. Rationale

Mapping a research community with bibliographic metadata invites a specific failure: the map records what the
retrieval could see, then quietly presents itself as a map of the field. The gap between the two is rarely
measured, and where it is measured it is often large. In earlier work I benchmarked automated publication linkage
for funded trials against a manual reference standard built by two independent reviewers. Conditional on a
candidate reaching the matcher, it performed well (sensitivity 92.2%, PPV 94.3%); unconditionally, its sensitivity
was **44.5%**. The failure was in retrieval, and it was invisible to every internal quality check.

MétaCan is built so that the same failure, if it occurs, is measured rather than concealed. Two commitments
follow, and they drive every design decision below:

1. **Provenance.** Each record states which route(s) retrieved it and which sense of "Canadian" it satisfies.
2. **A measured gap.** A human audit samples the records the pipeline did *not* retrieve, so that retrieval
   sensitivity is estimated rather than assumed.

## 2. Preliminary work (complete, and reported in the proposal)

The pilot analyses are reproducible via `make pilot` and re-derivable offline from archived responses via
`make pilot-offline`. The authoritative list, with every value, is **`pilot/results/FINDINGS.md`**, which is
*generated* from `pilot/results/findings.json`; neither the list nor its COUNT is restated here, because a
hand-maintained copy of a generated table is a stale table waiting to happen. This protocol previously carried a
seven-row version of it, which was already wrong by the time anyone read it, and then a hand-typed count, which
went stale one sentence away from this warning.

The five that determine the design:

| # | Result | Design consequence |
|---|---|---|
| 12 | Scored against the rubric, the best topic route retrieves **12%** of Canadian metaresearch (95% CI 5.6 to 21.6), at 60% precision. It misses **66 of 75**. OpenAlex files a work by what it is *about*, so metaresearch about cardiology reads as cardiology. | **The field is invisible to topic retrieval precisely because it is about other fields.** Retrieval is demoted to provenance; screening over a Canadian frame is the gate. |
| 10 | Swap which model is "the screener" and the base rate moves from **1.06% to 2.37%** (design-weighted, same 1,290 records): 37,032 vs 83,022 works. The published binomial CI contains neither. | Machine agreement is a **process metric**, not accuracy. The screener-swap range, not the binomial interval, is the honest uncertainty. The human audit is the study. |
| 11 | **31.5%** of the frame has no abstract, and the screen finds 0.78% metaresearch there against 1.55% where one exists (p = 0.023; robust to adjustment for year and language). An earlier version of this table also claimed the blindness was **differential** (T2 losing 3.6x against T1's 1.4x). **That cell holds four works and the interaction is not significant (p = 0.141). WITHDRAWN** (DEVIATIONS.md D6). | A third of the frame is screened on its title alone and the screen finds half as much there. The audit stratifies on abstract availability. It is **not** evidence of differential blindness by tradition, and this protocol no longer says it is. |
| 14 | A simple random sample of the screened-out mass **cannot measure screening sensitivity**: 600 records return an expected **0.4** misses; twenty would need **2,009 coder-hours** against 65 budgeted. | The two-phase audit as first specified was impossible. **See §6.0 and §6.1.** |
| 16 | Haiku lands near Sonnet's base rate (1.27% vs 1.06%, 98.1% agreement) but their in-scope sets overlap **16%** unweighted, **10%** design-weighted; of Sonnet's 58 positives Haiku confirms **12**. And agents of ONE model on ONE prompt disagree beyond chance after conditioning on what they were shown (CMH p = **0.0056**, replicated at **0.015**), with the agents' ordering flipping between arms. | **Rate agreement is not set agreement, and no machine pass measures this field.** The machine screen is demoted to a **stratifier** for the audit: design weights stay unbiased under a noisy stratifier, only efficiency suffers, and power is computed at Haiku-realistic concentration. Machine tiers are released marked provisional; every reported prevalence is design-weighted human coding. |
| D1 | **The pilot screen did not obey this rubric.** It was sent 6 of the 8 fields §5 mandates: **venue, OpenAlex topic and field, Canadian affiliations and funders were all withheld.** Every pilot number came from a title-and-abstract screen. | The most serious defect in the project. The full screen sends the rubric's complete payload and reports the difference as a finding. **See DEVIATIONS.md D1.** |

Also established: 0 of 4,516 OpenAlex topics name the field; 64% of works in the topic space have no raw
affiliation string; Érudit matches 0 OpenAlex sources but exposes 379 harvestable OAI-PMH sets; `reproducibility`
alone returns 43,392 Canadian works at 0.8% on-topic; NSERC carries 9.2x SSHRC's linked works; naive
capture-recapture implies Canada produces 59% of world metaresearch against an observed 1.9%, and is **abandoned**;
the OpenAlex API is now metered, so the frame is read from a pinned S3 snapshot; and screening the frame with the
full rubric twice costs **~$4,767** on the Batch API (§7). An earlier version of that estimate charged the rubric once
per WORK rather than once per CALL, reported $24,379, and used it to justify a cheap TRIAGE in front of the screen. The
triage is a retrieval step, in a study whose central finding is that retrieval destroys these maps. With the arithmetic
corrected it saves $110, so **it is deleted**: every work in the frame is read against the full rubric. (DEVIATIONS.md
D7.)

## 3. Estimand (prespecified)

The field boundary is contestable. That is a reason to decide in advance and be explicit, not a reason to defer.

**Primary estimand: Canadian-*produced* metaresearch.** A work is in scope if it is classified T1 or T2 (§5.2)
**and** satisfies at least one of:
- **CA-AFF**: ≥1 authorship with an institutional affiliation whose country is Canada, **or** whose
  OpenAlex-parsed authorship country is Canada even where the institution is unresolved (the second clause exists
  because finding 2 shows 64% of the topic space carries no resolvable affiliation);
- **CA-FUND**: ≥1 funder whose OpenAlex `country_code` is Canada. This is an **external criterion, not a curated
  list**: an earlier version of this clause named four funders (CIHR, NSERC, SSHRC, CFI), and that list failed
  twice: three of its four hardcoded IDs pointed at *other funders*, and even corrected it missed Canada Research
  Chairs (42,824 works), the Government of Canada, NRC, Mitacs, Genome Canada, and every provincial agency.
  OpenAlex knows **2,182** Canadian funders; `R/pin_entities.R` pins them, and the pinned list ships with the data.

The two components are **reported separately as well as jointly**, because pilot finding 6 shows CA-FUND is
skewed against the social sciences, and a pooled figure would hide that.

**Secondary estimand: metaresearch *about* the Canadian research system**, irrespective of author location,
identified by screening rather than by keyword.

**Descriptive attributes, NOT inclusion criteria.** Recorded on every record, never used to admit one:
- **CA-VENUE**: published in a Canadian venue (incl. Érudit-hosted);
- **CA-PERSON**: an author with a known prior Canadian affiliation, at any time.

*Rationale for the exclusion:* a work by someone who once held a Canadian post, written abroad, with no Canadian
funding, affiliation, subject matter, or venue, is not self-evidently Canadian metaresearch. Nor is a globally
generic paper that happens to appear in a Canadian journal. These are interesting covariates and poor gatekeepers.

**Prespecified alternative rules** (to test the consequences of the primary decision, not to replace it):
- **ALT-1 (strict):** CA-AFF only.
- **ALT-2 (broad):** primary ∪ CA-VENUE ∪ CA-PERSON.

Only these two alternatives will be reported. We will not enumerate all combinations of the five flags: that is
researcher degrees of freedom wearing the costume of a sensitivity analysis.

## 4. Frame (F)

**F is defined and frozen before screening, and every claim in this study is bounded to F.**

**The design inverts the usual one.** The obvious approach retrieves what *looks like* metaresearch and then asks
whether it is Canadian. That makes the field boundary a property of the retrieval strategy, and it is why such
maps cannot be audited: a lexicon cannot show you what it never surfaced, so there is nothing left to measure the
miss against.

Here the frame is **all Canadian research**: an external, checkable criterion that owes nothing to our notion of
metaresearch. Field membership then becomes a **classification** question over an enumerable universe, not a
**retrieval** question over the literature. That is what makes "what did we miss?" answerable at all, and it is
what produced the base rate (§2, finding 9) that replaces the failed coverage estimator.

**F IS NO LONGER A HYPOTHESIS. IT IS BUILT.** All 482 partitions of the pinned snapshot were streamed and filtered:
**F holds 4,299,418 works**, each appearing exactly once (finding 23). For most of this project's life F was
"about 3.5M", an **extrapolation from a single partition** that sat hardcoded in six scripts; **the estimate was 18%
low**, and every cost, audit-power and field-size figure computed against it has moved. `R/frame_size.R` now reads
the size from the artifact the harvest writes, so no script can hardcode it again.

**Sources that CONTRIBUTE RECORDS to F.**
- A **pinned OpenAlex snapshot** (release stamped; not the live API, which is metered and mutable. See finding 8:
  1,000 credits per ~11h window, and 8.2 days per pass. A study behind a meter that resets every eleven hours cannot
  be re-run by a reviewer).
- A **pinned Érudit OAI-PMH harvest** (`https://oai.erudit.org/oai/`, 379 sets; harvest date stamped).

**Sources that DO NOT contribute records, and must not.** Retraction Watch, ClinicalTrials.gov, and the CIHR project
database are used, and **none of them admits a work to F**. A retracted cardiology paper is retracted *cardiology*; a
trial registration is not a publication; a grant is not a work. Admitting them would let an interesting signal
masquerade as the estimand, which is the error this protocol exists to prevent. They enter as:
- **Record attributes.** Retraction Watch supplies the post-publication state (finding 17): OpenAlex's `is_retracted`
  is a *boolean over a four-value space* (retraction, expression of concern, correction, reinstatement), so it
  expresses one and silently reports the rest as false. RW is joined by DOI and its state and reasons ship with F.
- **Reference standards.** ClinicalTrials.gov knows a Canadian trial happened *independently of any pipeline*, so it
  cannot be wrong in the pipeline's favour. It is the only reference standard here **not made of machine labels**
  (finding 21), and §6.1 uses it for known-item recall alongside the venue set.
- **Enrichment.** PubMed / Europe PMC / Crossref supply abstracts OpenAlex lacks (finding 19). **Preprints are
  already in F** and need no ingest: measured against bioRxiv and medRxiv's own API, OpenAlex indexes 99.6% of what
  the servers hold (finding 20).

**Window.** Publication years 2000–2025 inclusive.

**Membership.** A record enters F if it carries **any identifiable Canadian signal**: CA-AFF · CA-FUND · Canada named
in title, abstract or keywords (EN/FR) · published in a Canadian venue · is an Érudit record. Every record stores
**which routes admitted it**. **1,565,226 works (36.4% of F) carry no Canadian affiliation at all**: an
affiliation-only frame would hold 2,734,192 works and would never see them. That is the empirical case for the union
of routes, and for provenance on every record.

**Limitations, stated up front.**
- A work whose Canadian link is invisible to the metadata (no affiliation, no funder, no textual mention, no Canadian
  venue) cannot enter *any* Canadian frame, by any method. That is a hard boundary of the data, not of this design.
- Scholarship indexed by neither OpenAlex nor Érudit is **not estimated** here, and no claim about it will be made.
- **Both clauses of the primary estimand rest on sparse metadata.** 64% of the metaresearch topic space carries no
  raw affiliation string (finding 2), and **71.2% of F carries no funder metadata at all** (finding 18). CA-FUND
  cannot admit a work whose funder OpenAlex never recorded; that is a hard ceiling on the route, and it is why the
  audit must sample the works **no route reached**.

## 5. Screening (retrieval is demoted to provenance)

Every record in F is **classified**, not retrieved. Retrieval routes still run (candidate topics and venues;
bilingual lexical and semantic similarity to the seed corpus; citation neighbours of curated seeds), and every
record stores the set of routes that surfaced it. But those routes are **provenance, not the gate**: they answer
"how would a conventional search have found this?", which is exactly the question the coverage audit needs, and
they are never allowed to decide membership.

Route overlap and incremental yield are reported descriptively. They are **not** used to estimate the unseen
population (§6.3).

### 5.2 Inclusion tiers
- **T1 (core):** the work's object of study is research itself: its methods, reporting, reproducibility,
  integrity, evaluation, funding, workforce, communication, or infrastructure.
- **T2 (adjacent):** empirically or conceptually grounded work on science as a social system (STS, library and
  information science, research infrastructure studies) that is not framed as metaresearch but studies it.
- **T3 (contextual):** policy documents, editorials, commentary, announcements. **Mapped and released, never
  pooled into the analytic corpus.**
- **Excluded:** everything else.

### 5.3 Genre label
`empirical` · `conceptual` · `editorial/commentary` · `policy` · `infrastructure/announcement` · `other`.
Assigned by the classifier because OpenAlex's `type` is unreliable and this field is unusually commentary-heavy.

### 5.4 Classifier
Multilingual sentence embeddings (cross-lingual by construction) over title + abstract, plus an LLM screening
pass with **published prompts** and temperature 0. The decision **threshold is locked before evaluation** and
recorded in the protocol registration.

**The classifier plays no part in constructing the reference standard against which it is judged** (§6.2). No LLM
output is shown to the human coders.

## 6. Validation: two-phase stratified probability audit

The core of the study, and the thing the field usually skips.

### 6.0 The design this replaces, and why it could not work

An earlier version of this protocol said: partition F into screened-in and screened-out, draw a probability sample
from both, human-code them, and estimate sensitivity with design weights. That is the textbook two-phase audit and
it is **arithmetically incapable of doing the job here.** Finding 14 does the sum.

The works a screen wrongly rejects are a vanishing fraction of the rejected mass. At 95% screen recall, the ~3.2M
screened-out records contain ~2,300 missed works: a density of **0.07%**. A sample of 600 screened-out records
therefore returns an **expected 0.4 of them**, and you cannot estimate a rate from zero events. Seeing twenty
would take **30,134** human codings, about **2,009 coder-hours** against the ~65 this study can buy.

So the central promise of the project (a human audit that quantifies what the pipeline missed) was, as first
specified, impossible. It is recorded here rather than quietly fixed, because a preregistration that hides its own
false starts is not a preregistration.

### 6.1 Design: three instruments, not one

**(i) Score-stratified probability sampling of the screened-out set.** This is salvageable, and only because the
misses **concentrate**. The pilot measured where: of the 37 works screener B pulled into scope that screener A
rejected, **30 sit in the contested boundary and only 6 in the settled rejects**. So:

- Partition **F** into **screened-in** (T1/T2) and **screened-out**.
- Draw a **stratified probability sample from both**, with **known, recorded selection probabilities**. Strata
  cross: `language (EN/FR/other)` × `source (OpenAlex/Érudit)` × `partition` × `screener score` ×
  `abstract availability`.
- Oversample heavily: the **contested boundary** (where the pilot shows the misses concentrate); French records;
  Érudit records; adjacent STS/LIS material; **records with no abstract** (finding 11); under-represented provinces
  and genres.
- Sample size set to achieve a target half-width on screening sensitivity within the French stratum, the scarcest
  and therefore binding cell. Computed and fixed at registration.

**Why stratification is binding rather than decorative:** at a ~1.3% base rate a uniform sample spends its whole
budget confirming obvious exclusions. Without stratification the audit is uninformative at any feasible n.

**(ii) Recall against already-labelled data, not against the haystack.** Any filter's recall (the topic route, the
lexical route, the cheap triage in finding 13) is measured directly against the **5,737 works that already carry
full-rubric labels**: run the filter over them and count what it drops. This is exactly how finding 12 scored the
topic route at 12%. It costs nothing and needs no needle-hunting in the discarded mass. **No filter enters the
pipeline without its recall measured this way first.**

**(iii) Known-item recall on an external criterion, because (i) is blind exactly where the bias is.**

Score-stratified sampling finds the works the screener *almost* caught. It is structurally blind to the ones it
rejected *confidently*, and finding 11 identifies precisely which those are: T2 material (STS, LIS, the
humanities) with no abstract, rejected on a title carrying none of the field's vocabulary. Such a work is not near
the threshold. It is deep in the settled rejects, where (i) never looks. **An instrument that is blind where the
bias lives is worse than no instrument, because it returns a confident number.**

So a third instrument, on a criterion no screener can be blind to: **venue**. A reference set of Canadian-authored
articles in *Social Studies of Science*, *Scientometrics*, *Quantitative Science Studies*, *Research Integrity and
Peer Review*, JASIST, *Research Evaluation*, *Accountability in Research*, *Recherches qualitatives*,
*Documentation et bibliothèques*. **A Canadian-authored paper in *Social Studies of Science* is T2 by where it was
published, whatever its abstract is about.**

Venue is immune to *aboutness*, which is the single thing that defeats topic retrieval (finding 12) and title-only
screening (finding 11) alike. This is the frame flip applied a second time: replace "does this look like
metaresearch?" with an external, checkable criterion. It is the only instrument that can see into the blind spot.

**What (iii) is and is not.** Known-item recall on a venue reference set is a **non-probability** estimate. It
bounds and diagnoses recall on the hard cases; it does **not** replace the design-weighted population estimate
from (i). Both are reported, separately, and neither is presented as the other.

### 6.1a A note on why agreement statistics are stratified
With a 1.3% positive rate, two screeners that both label the obvious 98% as OUT achieve high raw agreement and an
unstable κ: the statistic is dominated by the cell where agreement is free. This is the well-known κ paradox with
skewed marginals. Agreement is therefore reported **per stratum** and reconstructed with design weights, never read
off a pooled 2×2. The pilot already shows why this matters: agreement is 99% in the settled stratum but 95% at
the boundary.

### 6.2 Coding
- **Two HUMAN coders, independent, blinded** to the machine labels and to each other.
- A **locked rubric** (`docs/protocol/rubric.md`, versioned) with worked examples and explicit edge cases.
- Disagreements adjudicated against the rubric; adjudication decisions logged.
- Agreement reported (Cohen's κ / Krippendorff's α) **as a property of the coding, not as evidence of classifier
  validity**: an agreement coefficient measures coders, not the instrument.
- **Dependency, declared:** the second coder must be bilingual (FR/EN) for the French stratum. To be recruited and
  **compensated** in Week 1 via CaRN, ACFAS, CAIS-ACSI, CARL. **If no francophone coder is recruited, the
  French-stratum estimates are withdrawn, not imputed.**

### 6.2a What the machine screen does, and what it cannot do
One full-frame LLM pass (a cheap model) labels every work in F against the locked rubric; a second model relabels
a 20,000-record stratified sample. Disagreements are recorded and routed to the human audit. Inter-model agreement
is published and **reported as a process metric**.

It is not, and will not be presented as, an accuracy estimate, and after finding 16 it is not presented as a
*measurement* of anything. Agreement fails twice. First, two language models share training data, lexical priors
and failure modes; their errors are correlated, and most correlated precisely on the boundary cases the field's
definition turns on. Second, finding 16: **rate agreement is not set agreement**. The cheap model matches Sonnet's
base rate within a fraction of a point and agrees with it on 98.1% of the frame, while their in-scope sets overlap
16% (10% design-weighted); and agents of one model, on one rubric and prompt, disagree beyond chance after
conditioning on what each was shown, in two arms, with their ordering flipping between arms. **This is not
"duplicate screening"**: that term's warrant comes from independent *human* judgement, and borrowing it for two
models would be a misrepresentation of method. The accuracy claim rests on §6.2 and nowhere else.

What the machine pass *does* contribute is real and, after finding 16, precisely bounded: **stratification**
(a noisy stratifier costs the audit efficiency, never validity, because design weights use known selection
probabilities), an empirically located boundary (the disagreements), and the throughput to organize 4.3M works
for sampling at all. **Machine tiers are released marked provisional. Every prevalence this study reports is
design-weighted human coding. No machine number is reported as the field.** The pilot's machine base rate (§2,
finding 9) stands as the motivating hypothesis the audit tests, not as a result the audit inherits.

**Agent-level controls, because finding 16 and D11 demand them:** agents receive randomized, fixed-size chunks
recorded in an assignment manifest at run time; a duplicate-agent reliability arm re-screens a common subsample;
and completeness checks verify every output file against the filesystem and fail loudly on any unreturned record,
because one pilot agent reported six label files it never wrote.

### 6.3 Estimation
Using **design weights** (inverse selection probability):
- **retrieval sensitivity within F**: the headline quantity, and the answer to "what did we miss?";
- screening **precision and recall**, with confusion-matrix counts;
- **eligible count within F**, with a confidence interval;
- **differential error by language, source, tradition, genre, and linkage type**: i.e. *for whom* the pipeline
  fails, not merely how often.

All reported with confusion-matrix counts and interval estimates, not bare percentages.

**Capture–recapture is not used, and this is a considered decision, not an oversight.** The routes are endogenous:
R3 depends on the seed set and any author-based expansion depends on authors surfaced by R1/R2. Log-linear
multi-list models cannot identify the all-zero cell without an untestable restriction on the highest-order
interaction, and with endogenously constructed lists that restriction is not credible. Nor is the estimate a safe
lower bound: depending on the dependence structure it may overstate the unseen population as readily as understate
it. Pilot finding 7 shows the naive estimator returning a figure that implies Canada produces the majority of the
world's metaresearch. The only unconditional lower bound on the population is **the number of eligible works
actually observed**, and that is what we will report. The two-phase audit replaces it because it samples the gap
instead of inferring it.

## 7. Analysis (secondary and exploratory)

Everything in this section is **descriptive, secondary, and explicitly labelled as such**. None of it defines the
field; the corpus is constructed and validated first, and only then described.

- Counts and trends by year, language, province, institution, genre, tier, and linkage type.
- Co-authorship and institutional collaboration structure (igraph; Louvain communities, betweenness, assortativity).
- Topic/thematic structure: **only** with an explicit stability assessment across seeds and preprocessing
  choices. Learned topics are not treated as ground truth, and if they are unstable that fact is reported rather
  than the prettiest run.
- Funding structure across CIHR / NSERC / SSHRC / CFI, reported with the SSHRC under-linkage of pilot finding 6
  stated alongside.

## 8. Outputs and release

1. **Dataset** (CSV + Parquet; Frictionless schema): one row per work, carrying route provenance, the five linkage
   flags, language, genre, tier, classifier score, and audit status.
2. **Validation report**: design-weighted estimates, confusion matrices, and the differential bias report,
   **including the errors**, not only the headline accuracy.
3. **Code**: the full pipeline, `targets` DAG, Docker image, lockfiles.
4. **Documentation**: Quarto site, a **Datasheet for Datasets**, and this protocol with its registration stamp.
5. **A bilingual explorer** for people who do not write code.

Versioned on GitHub; each release archived to **Zenodo with a DOI**. Public corrections accepted against a
transparent version history.

## 9. Ethics and governance

- The dataset describes **living people**. Individuals are represented only by what they have published.
- **No sensitive identity is inferred or released.** No gender, ethnicity, Indigeneity, or other protected
  characteristic is imputed from names, affiliations, or text.
- Where Indigenous-governed data or communities are implicated, **no derived labels are released**, and
  appropriate governance is sought rather than asserted. Invoking OCAP® without an Indigenous partner would be
  compliance theatre and this study does not do it.
- A public correction mechanism allows individuals to contest or amend records about them.

## 10. Reflexivity

I am an independent researcher with no institutional affiliation. I am therefore a member of the population this
dataset structurally cannot see: affiliation-based country assignment fails on precisely such records, and 64% of
the search space carries no affiliation string at all (pilot finding 2). The **CA-FUND** clause in the primary
estimand and the **non-retrieved stratum** in the audit exist because of that failure mode.

I am also, on the primary estimand, plausibly *in* the dataset. I will not code any record in the validation
sample that includes my own work, and any such record is routed to the second coder and an adjudicator.

## 11. Deviations

Any departure from this protocol will be recorded in `DEVIATIONS.md` with its date, its reason, and whether it was
made before or after the outcome data were seen. Silent revision is itself a research-integrity failure, and this
is a metaresearch project.
