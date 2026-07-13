---
title: "MétaCan: an open, provenance-tracked, coverage-audited map of Canadian metaresearch"
subtitle: "Ahmad Sofi-Mahmudi · code, data, corrections: github.com/choxos/CaRN-data-challenge"
---

I once benchmarked a pipeline linking funded trials to their publications against a dual-reviewer standard. It was accurate on
records that reached the matcher (PPV 94.3%), but sensitivity was **44.5%**: half the publications the humans found were never
*retrieved*, and no internal check would have caught it. **Every MétaCan record will show why it was found and why it counts as
Canadian, and a human audit will quantify what the pipeline missed.** I built the first stage, then attacked it. **It broke
repeatedly: the sampling design, my own instrument, and my best result.**

## Don't search for metaresearch. Search for Canada, then screen.

The usual design retrieves what *looks* like metaresearch, then asks whether it is Canadian. The field's boundary becomes a
property of your keyword list, and the map is unauditable: you cannot measure what a lexicon never showed you. I inverted it. The
frame is **all Canadian research**, an external checkable criterion, and it is **built, not estimated**: all **482 partitions** of
a pinned OpenAlex snapshot, **4,299,418 works**, each exactly once. **1,565,226 (36.4%) carry no Canadian affiliation at all**;
an affiliation-only frame never sees them. Membership is then a *classification* over that frame, not a *retrieval* over the
literature. Retrieval fails both ways: the best topic route **finds 12% of the field** (OpenAlex files a work by what it is
*about*, so metaresearch about cardiology reads as cardiology; **the problem is not vocabulary, it is aboutness**), and it also
wrongly *admits*, with **17,466 works** entering on a Canadian "institution" that does not exist.

So I ran the classification honestly: **three frontier models (Opus 4.8, GPT-5.6, Grok 4.5) screened the same 5,600 works**,
drawn with known selection probabilities, against one locked rubric, on identical prompts, with labels written by the harness and
reconciled against a manifest by set equality.

> **Rate agreement is not set agreement.** Design-weighted base rates span **2.54% to 3.81%**, which looks like ordinary
> noise. It is not. Of the **274** works *any* model called metaresearch, only **104 (38%)** were called metaresearch by **all
> three**, and **117 (43%) rest on a single model's opinion**; pairwise overlap is about **50%**. At a ~1% base rate the settled rejects buy
> near-total agreement for free. **The field's boundary is not a line the models share. It is a region
> they each cut differently**, and it is stable at n = 1,000, 2,000 and 5,600.

The obvious next move is to declare a consensus and move on. Instead I asked *why*, and made it measurable. An independent judge
(**Fable 5, not one of the three arms**, and **blind**: it saw the opinions as A/B/C in random order, no model names) adjudicated
**all 179 contested works** and had to name, for each, **which seam of the rubric produced the split**. Its verdict:

> **The rubric is silent on 159 of the 179 contested works (89%).** Only **17** splits were a screener misapplying a rule that
> actually existed. **The field's boundary was being set by the screener, not by the instrument**, and each model was privately
> inventing the missing sentence. The judge shows **no arm preference** (spread 1.16×, p = 0.49), so it is not a fourth vote
> for one of the screeners.

That converts adjudication from a tiebreak into a **frequency-weighted census of the sentences the rubric is missing**. I
**published the census, wrote v2 against it, and locked v2 before re-screening**, so it could not be tuned until the numbers
improved. Two rules carry most of it: *developing or validating a technique for a domain is OUT; only methods **as practiced**
are T1*, and *the STS, LIS and history bullets apply only where the object is science or research, **at any period***. That
second rule deletes one word, "contemporary", **an unexamined adverb that was silently excluding the entire history of Canadian
science.**

> **Re-screened under v2 by the same three models: 96 of the 179 (54%) are now unanimous, and pairwise overlap of the in-scope
> sets moves 0.19 to 0.36.** Scope stated rather than blurred: those works were *selected for disagreement*, so this shows the
> rules resolve the cases they were written for; it is not a frame-wide agreement claim. The unbiased test, a full re-screen of
> all 5,600, is prespecified and is what the funded work runs.

**This is the answer to the question the call asks:** not a dataset with a boundary asserted, but **the criteria, derived from a
census of where the boundary empirically fails, with the improvement measured**, and the residual **83 works** released as the
field's contested core. The largest confusion, at every sample size, is **OUT vs T2**: the adjacent traditions the inclusiveness
criterion exists to protect. *A second, prettier claim did not replicate when the sample grew; **withdrawn** (D23).*

**What broke, and what I did about it.**

> **1. My sampling design could not reach 12.9% of the frame, and no weight fixes that.** A stratified design rests on one
> identity, `sum(N_h) = N`. I never checked it. **549,370 works had inclusion probability exactly zero**: one stratum excluded
> everything *about* Canada while another excluded everything *affiliated with* Canada, so works that were **both** fell between
> them. Nothing failed; every stratum returned exactly the *n* it asked for. The design drew a clean textbook sample **of 87% of
> the frame** while every number said "the frame". **The deleted cell was the secondary estimand's own**: 328,912
> Canadian-affiliated works *about* Canada. Now seven strata that **partition** the frame by construction, asserted on every
> build. **Found by a model I asked to attack the design, adding up five weights I had handed it.**

> **2. My locked instrument contradicted itself.** The rubric and the schema named **two different vocabularies for the same
> field**; every screener was handed both and obeyed both privately, and the validator was checking a *different* field, so
> **16,800 labels passed every check that ran.** **A codebook is code; it gets a test.**

`DEVIATIONS.md` carries **all twenty-six entries**. **Every one produced output that looked correct; none threw.** A project
whose thesis is *measure what you missed* must survive its own instrument. **Mine did not, and the record is public.**

## 1. Methodology

**The definition is the field's, not mine.** T1 is anchored to Ioannidis's five domains (*methods, reporting, reproducibility,
evaluation, incentives*; PLoS Biol 2018;16:e2005468) and every T1 record carries which, so a reviewer checks the instrument
against a citation rather than my judgment. **But the five are not the whole map**: they are a *metascience* definition, and the
call names bibliometrics, STS, scholarly communication and open science as traditions in their own right. Narrowing to the five
would delete exactly those, and **OUT-vs-T2 is already our largest confusion**, so the five are T1's spine, **T2 keeps the
traditions the call names**, and both are mapped while only T1 is pooled. **The estimand is prespecified.** *Primary:*
Canadian-**produced** metaresearch: ≥1 authorship with a Canadian affiliation **or** a Canadian funder. *Secondary:* metaresearch
**about** the Canadian research system. One decision, not thirty-two combinations called a sensitivity analysis. **71.2% of the frame carries no funder metadata**: both clauses rest on sparse metadata, which is
why the frame unions four routes, every record carries **provenance**, and the audit samples what none reached. The secondary
clause needed repair: `about_ca` fired on **1.8% to 3.5%** of the strata built for it, because it cannot be true unless a work is
*already* about research. **v2 splits it**: one boolean cannot separate "Canadian data, universal claim" from "a claim about
Canada".

**Screening stratifies; it never measures.** Machine tiers ship *provisional* and are **never reported as the field**.
Design-weighted estimates from known selection probabilities are **unbiased however noisy the stratifier is**; noise costs
efficiency, never validity. A classifier trained on the model labels earns its place as a **stratifier** and nothing more
(**48.2%** of in-scope works in its top decile, a **4.8×** lift on human effort): **it decides where humans look; it never
supplies a label.**

**Validation: three instruments**, because machine screening cannot establish accuracy and sampling a 3.2M rejected mass for its
misses returns an expected 0.4 of them. **(i) A stratified probability sample with guaranteed floors** (machine score,
**between-model disagreement**, language, source, abstract availability), with a baseline draw from **every** stratum so every
record keeps a **known nonzero** selection probability; two humans code independently, blind to machine labels, and design weights
give prevalence, sensitivity and **differential error by language, source and abstract availability**. **(ii) Recall against
labelled data, not the haystack.** **(iii) Known-item recall on external criteria**: **venue** (a Canadian paper in *Social
Studies of Science* is T2 by where it was published) and **registries** (ClinicalTrials.gov knows a Canadian trial happened
independently of any pipeline), both immune to the aboutness that defeats topic retrieval.

**Sample:** n ≈ 1,000, dual-coded ≈ 65 coder-hours. **The second coder is not optional**: I recruit and pay a bilingual (FR/EN)
coder in Week 1 via CaRN, ACFAS, CAIS-ACSI and CARL. **Feasibility, after costing it wrong twice** (D7): the stratifier reads
every work against the full rubric (**$1,094**, batched) plus a 20,000-record second pass (**$15**). **Total $1,110, leaving
~$1,790 for the coder, who *is* the study.**


## 2. Openness, transparency, reproducibility

The repository is **public** and the committee can run it today. `make pilot-offline` re-derives **every figure above** from
archived responses **with no network**; `make proposal` **fails the build if this page quotes a number the pilot does not
produce**; `make lint` fails if the strata do not partition the frame or the codebook contradicts its schema. **Each guard exists
because that failure already happened.** Extraction is from a **pinned S3 snapshot**, not the metered API (8.2 days per pass).

**One reproducibility claim I will not make:** temperature 0 does not make an LLM deterministic and these versions will be
retired, so I release the **exact prompts and raw outputs** but do **not** claim the labels are reproducible. Each release carries
a Zenodo DOI: dataset (Frictionless, CC-BY-4.0), code (MIT), Docker, lockfiles, **both rubrics**, **labels with their
disagreements**, the **seam census**, validation results *including the errors*, a **Datasheet**, `DEVIATIONS.md`. On **OSF**.

## 3. Diversity, assumptions, limitations, bias

I am a solo applicant working in English. I do **not** claim to represent the field's diverse traditions; that needs
collaborators I do not have, and I once claimed to have *measured* how badly I serve them and **withdrew it** (four records,
p = 0.141). What remains I state as a condition, not a promise. **Érudit, the main francophone Canadian platform, matches 0 OpenAlex
sources** (OAI-PMH live, 379 sets): the francophone literature is not *thin* here, it is largely **absent**. French power comes
from the **Érudit harvest**, verified but not yet run; **if it does not deliver, the French claim is withdrawn, not fudged.**
Funder metadata skews against the traditions the call asks me to include (**NSERC carries 9.2× SSHRC's linked works**), and
**31.5% of the frame has no abstract**, where the screen finds half as much metaresearch (p = 0.023).

**Assumptions named.** The base rate rests on machine labels: a hypothesis with a denominator, not a result. Coverage holds
*within the frame*, not over all Canadian metaresearch. **Governance:** no sensitive identity is inferred; where
Indigenous-governed data are implicated no derived labels are released; OCAP® without an Indigenous partner is compliance
theatre. I submit as an independent researcher with no affiliation: **one of the people this dataset cannot see.**

## 4. Work plan (1 Aug to 27 Oct)

**W1–2** Lock estimand and rubric; preregister (OSF); **recruit and pay the bilingual coder**. · **W3–5** Freeze the Érudit
harvest; screen the full frame under v2 and **report the v1-to-v2 difference frame-wide**. · **W6–8** Stratified sample from
screened-in **and** screened-out; dual blinded coding; adjudication. · **W9–10** Design-weighted estimation; bias report. ·
**W11–12** Release; deploy; plenary.

**Outputs:** a versioned works-level dataset (provenance, linkage flags, language, *provisional* tier, **Ioannidis domain**,
confidence, **data/code availability links** from Crossref and DataCite, so the map is usable *for* metaresearch and not only
*about* it); **the inclusion criteria and the seam census behind them**; the disagreement dossier; the audit and bias report;
everything in §2; a **bilingual explorer**, live at `metacan.xera.ac`.
