---
title: "MétaCan: an open, provenance-tracked, coverage-audited map of Canadian metaresearch"
subtitle: "Ahmad Sofi-Mahmudi · code, data, corrections: github.com/choxos/CaRN-data-challenge"
---

I once benchmarked a pipeline linking funded trials to their publications against a dual-reviewer standard. On records
that reached the matcher it was accurate (PPV 94.3%), but sensitivity was **44.5%**: half the publications the humans found
were never *retrieved*, and no internal check would have caught it. **Every MétaCan record will show why it was found and
why it counts as Canadian, and a human audit will quantify what the pipeline missed.** I built the first stage, then
attacked it. **It broke in five places, including that promise and my own instrument.**

## Don't search for metaresearch. Search for Canada, then screen.

The usual design retrieves what *looks* like metaresearch, then asks whether it is Canadian. The field boundary becomes a
property of your keyword list, and the map is unauditable: you cannot measure what a lexicon never showed you. I inverted
it. The frame is **all Canadian research**, an external, checkable criterion, and it is **built, not estimated**: I
harvested all **482 partitions** of a pinned OpenAlex snapshot and enumerated **4,299,418 works** (2000–2025), each
exactly once. **1,565,226 of them (36.4%) carry no Canadian affiliation at all** — an affiliation-only frame never sees
them. Membership then becomes a *classification* over that frame, not a *retrieval* over the literature. **I screened
5,737 unfiltered Canadian works** against a locked rubric with two machine screeners (Claude Sonnet 4.6; GPT-5.6, blind
to it). Claude puts metaresearch at **1.31%**: ~**56,206 works**. Breakages #2 and #5 say what that is worth.

> **1. The best topic-based route finds 12% of the field** (95% CI 5.6–21.6%, 60% precision). **It missed 66 of the 75
> metaresearch works in my sample.** OpenAlex files a work by what it is *about*, so metaresearch about cardiology reads
> as cardiology: **the field is invisible to topic retrieval precisely because it is about other fields. The problem is
> not vocabulary. It is aboutness.** (Against the *second* screener: **7%**.)

> **2. Swap which model is "the screener" and the field doubles.** On the 1,290 records **both** screeners saw, design-weighted,
> Claude gives **1.06%** and GPT **2.37%**: **45,397 vs 101,776 works**. They
> agree on 98.4% of the frame, dominated by the settled rejects; GPT pulls **37** in that Claude excluded, against **7**
> the reverse. The ±0.3pp binomial interval around 1.31% is uncertainty about *how many labels one
> model emits*, not about the field. **The honest interval is 45k–102k, and no machine screening narrows it.**

> **3. My audit could not measure what an audit exists to measure.** Sampling the screened-out stratum for the screen's
> misses is arithmetically hopeless: the misses are a vanishing fraction of a 3.2M-record rejected mass, so **600 sampled
> records return an expected 0.4 of them**, and seeing twenty needs **2,009 coder-hours against the 65 budgeted.** §1
> replaces it with three instruments.

> **4. My screen did not obey my own locked rubric.** It says the screener sees *"title, abstract, year, language,
> **venue, OpenAlex topic and field, Canadian affiliations, funders**."* The harness **withheld the last five**; **venue
> was never extracted at all.** The pilot ran as a *title-and-abstract* screen, measurably: **31.5%** of works have **no
> abstract**, and there the screen finds **0.78%** metaresearch against **1.55%** (p = 0.023). *An earlier draft called
> this* **differential** *(T2 losing 3.6× against T1's 1.4×) and made it my whole inclusiveness answer.* **Four works;
> interaction p = 0.141; withdrawn.** Not repaired by editing the rubric to match the harness.

> **5. And the worst: the noise *inside* one model is the size of the swap *between* models.** I re-screened the 1,290
> works with the cheap model my budget rested on. It lands near Claude's rate (**1.27%** vs 1.06%) and agrees with it on
> **98.1%** of the frame; **their in-scope sets overlap 16%**. Of Claude's 58 positives it confirms **12**. **Rate
> agreement is not set agreement**: at a ~1% base rate the settled rejects buy that 98.1% for free. Deeper: agents of
> **one** model, on **one** rubric and prompt, disagree beyond chance *after conditioning on what each was shown* (CMH
> p = **0.0056**; an independent arm replicates at **0.015**), and their ordering **flips** between arms. So #2's swap, my
> "honest uncertainty," measured the *smaller* term. **No machine pass measures this field at any price.** One arm is
> unreported: its agent described, in detail, six label files it never wrote. Agents get verified against the filesystem,
> not their reports.

`DEVIATIONS.md` carries all thirteen entries, written before submission. **A project whose thesis is *measure what you
missed* must survive its own instrument. Mine did not, and the record is public.**

## 1. Methodology

**A prespecified estimand.** *Primary:* Canadian-**produced** metaresearch: ≥1 authorship with a Canadian affiliation
**or** a Canadian funder. *Secondary:* metaresearch **about** the Canadian research system, whoever wrote it. Canadian
venue and past residence are **descriptive attributes, not inclusion criteria**. One decision, not thirty-two
combinations called a sensitivity analysis. The frame above, plus a **pinned Érudit harvest**. **64%** of the
metaresearch topic space carries *no affiliation string* and **71.2% of the frame carries no funder metadata**: both
clauses of the estimand rest on sparse metadata, which is why the frame unions four routes and the audit samples what
none of them reached.

**Screening as stratification, not measurement.** Each work is classified **T1 core** / **T2 adjacent** (STS, LIS,
infrastructure) / **T3 contextual** (mapped, never pooled) / out, against the locked rubric (`protocol/rubric.md`), which
names the three errors the pilot proved decisive: *polysemy* (`reproducibility` alone returns 43,392 Canadian works,
**0.8%** on-topic); *using* a method vs *studying* it; **not requiring the vocabulary**, so an STS ethnography is caught.
Routes run and carry per-record provenance, but are **not the gate**. Because of #5, **machine tiers are never
reported as the field**: released marked *provisional*, they exist to **stratify the human audit**. That demotion is what
#5 buys: design-weighted estimates from known selection probabilities are **unbiased however noisy
the stratifier**; noise costs efficiency, never validity. **The full screen sends the rubric's full eight-field payload and
reports the difference against the pilot's six-field run: what the withheld metadata was worth.**

**Validation: three instruments.** Machine screening cannot establish accuracy (#2, #5), and sampling the rejected mass
for the misses does not work (#3). So:

**(i) A stratified probability sample with guaranteed floors.** Strata: machine score, **between-pass disagreement**,
language, source, abstract availability, with a **baseline random draw from every stratum, settled rejects included**, so
every record keeps a known nonzero selection probability. Two humans code each record independently, blind to the machine
labels; **design weights** then give prevalence, sensitivity and **differential error by language, source and abstract
availability**, powered at the *measured* concentration (#5's 16% overlap), not the optimistic one. **(ii) Recall against labelled data, not the haystack:** any filter's recall is measured free on the **5,737 works
already carrying rubric labels**, exactly as #1 scored the topic route; those labels are a machine's, so it bounds a
filter rather than validating it. Only (i) and (iii) reach truth.
**(iii) Known-item recall on external criteria.** Stratified sampling finds what the screener *almost* caught and is
blind to what it rejected *confidently*. So: **venue** (a Canadian paper in *Social Studies of Science* is T2 by where it
was published, whatever its abstract is about) and **registries** (ClinicalTrials.gov knows a Canadian trial happened
independently of any pipeline). Both are immune to the aboutness that defeats topic retrieval and title-only screening:
**the frame flip applied again**, and the only instruments that see into the blind spot.

**Sample:** n ≈ 1,000 (400 in, 600 out), dual-coded ≈ 65 coder-hours, plus the reference sets; prevalence
**bias-corrected** for classifier error. **The second coder is not optional**: I recruit and pay a bilingual (FR/EN)
coder in Week 1 via CaRN, ACFAS, CAIS-ACSI and CARL. Because of #5, agents get **randomized, manifest-logged chunks**, a
**duplicate-agent reliability arm**, and completeness checks that fail loudly on any unreturned record.

**Feasibility, after I costed it wrong twice** (`pilot/13`; measured: 312 tokens/work at the full eight-field payload).
First error: I charged the rubric (a system prompt, sent once per **call**; my chunks batch **155 works per call**) once
per *work*, overstating the bill five-fold, and used that to justify a **cheap triage**: a retrieval step, in a proposal
whose central finding is that retrieval destroys these maps. **Deleted** (D7). Second error: I priced the screen at the
*six-field* payload, costing the deviation instead of the plan. Corrected, and costed against the **enumerated** frame,
the stratifier pass reads **every work against the full rubric** (**$1,094**, batched), plus a second pass on a
**20,000-record stratified sample**
(**$15**) for the disagreement stratum and the swap range. **Total $1,110, leaving ~$1,790 for the coder, who is the
study. No prefilter, so no retrieval recall to defend; no machine number
reported as the field.**

## 2. Openness, transparency, reproducibility

The repository is **public now** and the committee can run it today. `make pilot-offline` re-derives every figure above
from archived responses **with no network**, and `make proposal` **fails the build if this page quotes a number the pilot
does not produce** — a guard that exists because a retracted figure once shipped, and which blocked six stale numbers when
the frame grew. We extract from a **pinned S3 snapshot**, not the now-**metered** API (one pass = 17,537 cursor calls,
**8.2 days**): an API study at this scale is not reproducible; the snapshot is free and byte-identical forever.

**One reproducibility claim I will not make:** temperature 0 does not make an LLM deterministic and these model versions
will be retired, so I release the **exact prompts and raw outputs** but do **not** claim the labels are reproducible. Each
release carries a Zenodo DOI: dataset (CSV + Parquet, Frictionless, CC-BY-4.0), code (MIT), `targets` DAG, Docker,
lockfiles, **rubric**, **machine labels with disagreements**, validation results *including the errors*, **Datasheet**,
`DEVIATIONS.md`. Preregistered on **OSF**.

## 3. Diversity, assumptions, limitations, bias

I am a solo applicant working in English. I do **not** claim to represent the field's diverse traditions; that needs
collaborators I do not have. **I tried to claim I had *measured* how badly I serve them, and I withdraw it**: four
records, p = 0.141.

What remains is a condition I state rather than promise. **Of my 75 in-scope works, exactly one is French**, so
estimating French *sensitivity* needs ~**1,620** coded French records against an audit budget of 1,000: **French
performance is not estimable in an OpenAlex-only frame at any feasible n** — a fact about the pipeline, not Canadian
scholarship. **Érudit matches 0 OpenAlex sources** (OAI-PMH live, **379** sets), so the francophone literature is not
*thin* here; it is largely *absent*. French power comes from the **Érudit harvest**, which the pilot verified but did not
run; **if it does not deliver, the French claim is withdrawn, not fudged.**

**Assumptions and biases, named.** The base rate rests on machine labels: a hypothesis with a denominator, not a result,
and #5 says even the swap range understates its uncertainty. Unresolved, in the repo: the sample implies ~11,241 works on
the topic route where the API returned 14,873; and the harness **silently dropped 465 of 6,202 records (7.5%), biased on
abstract availability** (p = 0.00013), the very covariate #4 turns on. Coverage holds within the frame, not over all
Canadian metaresearch, and funder metadata skews against the traditions the call asks me to include: NSERC carries
**9.2×** SSHRC's linked works.
**Governance:** no sensitive identity is inferred; where Indigenous-governed data are implicated, no derived labels are
released; OCAP® without an Indigenous partner is compliance theatre. I submit as an independent researcher with no affiliation: one of the people this dataset structurally
cannot see. Hence, in part, the funder clause.

## 4. Work plan (1 Aug to 27 Oct)

**W1–2** Lock estimand, rubric; preregister (OSF); **recruit and pay the bilingual coder**. · **W3–5** Freeze the Érudit
harvest; screen the frame in full on the rubric's full payload. · **W6–8** Stratified sample from screened-in **and
screened-out**; reference sets; dual blinded coding; adjudication. · **W9–10** Design-weighted, bias-corrected
estimation; the bias report. · **W11–12** Release; deploy; plenary. **Outputs:** a versioned works-level dataset
(per-record provenance, linkage flags, language, genre, *provisional* tier, confidence); the preregistered audit and bias
report; everything in §2; a bilingual explorer on the XeraDB stack I run.
