---
title: "MétaCan: an open, provenance-tracked, coverage-audited map of Canadian metaresearch"
subtitle: "Ahmad Sofi-Mahmudi · code, data, corrections: github.com/choxos/CaRN-data-challenge"
---

## What you get on 27 October

A **works-level dataset over a frozen frame of all 4,299,418 Canadian works**, in which every record carries: **why it was
retrieved** (route provenance), **which sense of "Canadian" it satisfies**, language, **its category** (`metaresearch`,
`metaepidemiology`, and the traditions the call names, each defined from its own literature), the **Ioannidis domain** for
metaresearch works, **study design**, **data and code links**, and a **confidence**. With it: the **cited inclusion criteria and the
census they were derived from**; a **preregistered bilingual human audit** giving prevalence, retrieval sensitivity and
**differential error by language, source and abstract availability**; every prompt, label and disagreement; and a **bilingual
explorer, already live at `metacan.xera.ac`**.

The frame is **built, not sampled**: all **482 partitions** of a pinned OpenAlex snapshot, each work exactly once. The pilot below
is done, public, and re-derivable offline with no network.

## Don't search for metaresearch. Search for Canada, then screen.

Retrieve what *looks* like metaresearch and the field's boundary becomes a property of your keyword list; the map is then
unauditable, because you cannot measure what a lexicon never showed you. I inverted it: the frame is **all Canadian research**, an
external checkable criterion, and membership becomes a **classification** over that frame rather than a **retrieval** over the
literature. Retrieval fails both ways and we measured both. The best topic route **finds 12% of the field**, because OpenAlex files
a work by what it is *about*, so metaresearch about cardiology reads as cardiology: **the problem is not vocabulary, it is
aboutness.** And it wrongly *admits*, with **17,466 works** entering on a Canadian "institution" that does not exist. **1,565,226
works (36.4%) carry no Canadian affiliation at all**, so an affiliation-only frame never sees them.

## The criteria, derived rather than asserted

Three frontier models screened the same **5,600 works**, drawn with known selection probabilities, against one locked rubric, on
identical prompts, with labels written by the harness and reconciled by set equality.

> **Rate agreement is not set agreement.** Of the **274** works *any* model called metaresearch, only **104 (38%)** were called
> metaresearch by **all three**; **117 (43%)** rest on a single model's opinion; pairwise overlap is about **50%**. At a ~1% base
> rate the settled rejects buy near-total agreement for free. **The boundary is not a line the models share; it is a region they
> each cut differently**, stable at n = 1,000, 2,000 and 5,600.

**The field has no consensus definition either, and says so in print.** Puljak et al. analysed **175 published sources**, found
*"definitions varied"*, and concluded the *"research community would benefit from consensus"* (J Comp Eff Res 2020); Kataoka et al.
**publicly dispute them** (J Clin Epidemiol 2023;154:219); Stevens & Laynor report there is **no MeSH heading** for meta-research
(J Med Libr Assoc 2023). **Those are claims about humans. Mine are claims about models. I do not conflate them:** the literature
says the field lacks consensus; my pilot says three models cut one rubric differently. Consistent, not identical, and **only the
human audit closes the gap.**

So I asked *why* they split, and made it measurable. An independent judge (**a fourth model, not one of the three arms**, and
**blind**: opinions shown as A/B/C in random order, no model names) adjudicated **all 179 contested works** and had to name, for
each, **which seam of the rubric produced the split**. It shows **no arm preference** (p = 0.49). Its verdict: **the rubric was
silent on 159 of the 179 (89%)**; only **17** splits were a screener misapplying a rule that existed.

That turns adjudication into a **frequency-weighted census of the sentences the rubric was missing**. I **published the census,
wrote the revision against it, and locked the revision before re-screening**, so it could not be tuned until the numbers improved.
**Re-screened by the same three models: 96 of 179 (54%) are now unanimous; pairwise overlap moves 0.19 to 0.36.** Those works were
*selected for disagreement*, so this shows the rules resolve the cases they were written for; it is **not** a frame-wide claim, and
the unbiased test, a full re-screen, is prespecified. **This is the call's "inclusion and exclusion criteria to define the
community", derived rather than asserted**, with the residual **83 works** released as the ones all three models still split on.

**What broke, and what now runs.** My sampling design **could not reach 12.9% of the frame**. `sum(N_h) = N` is the one identity a
stratified design rests on and I never checked it, so **549,370 works had inclusion probability exactly zero**, including **328,912**
Canadian-affiliated works *about* Canada, which is **the secondary estimand's own cell**. Nothing failed; every stratum returned
exactly the *n* it asked for. It was found by a model I asked to attack the design. Seven strata now **partition** the frame by
construction, asserted on every build. **`DEVIATIONS.md` carries all twenty-six entries; every one produced output that looked
correct, and none threw.**

## 1. Methodology

**No category is defined from memory.** Two are **locked and cited**: `metaresearch` is Ioannidis's definition verbatim, with his
five thematic areas as a per-record `domain` (PLoS Biol 2015;13:e1002264); `metaepidemiology` is coded under **both** published
definitions (Murad 2017; Kataoka 2023) **and flagged where they disagree**. Bibliometrics, STS, scholarly communication, open
science and research integrity are **categories, not "adjacent"**, and are **locked in Week 1 from their own literatures**. That
word was the bug: **"adjacent" is defined by negation**, and a category meaning only *near the important one* cannot be applied
consistently, which is exactly why **OUT-vs-adjacent was our largest confusion at every sample size.** The models were not failing;
**the category was empty.** It was also a judgment I had no standing to make: STS is a field with its own founding literature.

**Estimand, prespecified.** *Primary:* Canadian-**produced** metaresearch (≥1 Canadian affiliation **or** funder). *Secondary:*
metaresearch **about** the Canadian research system. **71.2% of the frame carries no funder metadata**, so both clauses rest on
sparse metadata: the frame unions four routes, every record carries **provenance**, and the audit samples what none reached.

**Screening stratifies; it never measures.** Machine labels ship *provisional*. Design-weighted estimates are unbiased however noisy
the stratifier is **only while every record keeps a nonzero selection probability**, a condition **my own design violated for 12.9%
of the frame** before it was repaired and made a build check. The classifier therefore **decides where humans look and never supplies
a label**; its **4.8×** lift is lift toward *machine* labels, and is not validated efficiency until the humans code.

**Annotation, gated on measurement.** The LLM never touches 4.3M works: it labels ~**10,000**, a classifier trains on those, and
inference over the frame is cheap. **The risk is not cost, it is validity**, and we measured it once already: a classifier distilled
from our *metaresearch* labels matched **its own teacher at Jaccard 0.17**. **Shipping that across 4.3M works would publish 4.3M
confident errors.** So **study design ships only where it can be checked.** MEDLINE publication types are **human-indexed by NLM**
(**31,442** Canadian works tagged *Randomized Controlled Trial*), so design labels are **validated against NLM's indexers on
held-out data** and released only for classes clearing a prespecified threshold. **MEDLINE is biomedical**: outside it no such
standard exists, so those works carry a **score, not a label**, marked unvalidated. **The dataset states, per field, which of its own
annotations it has earned the right to assert.**

**Validation**, because machine screening cannot establish accuracy and sampling a 3.2M rejected mass for its misses returns an
expected 0.4 of them. **(i) A stratified probability sample with guaranteed floors** (machine score, **between-model disagreement**,
language, source, abstract availability), with a baseline draw from **every** stratum so every record keeps a **known nonzero**
selection probability; two humans code independently, blind to machine labels. **(ii) Known-item recall on external criteria**:
venue, registries, and MEDLINE publication types, all immune to the aboutness that defeats topic retrieval.

**Sample:** n ≈ 1,000, dual-coded. **The second coder is the single largest delivery risk and is not optional**: I recruit and pay a
bilingual (FR/EN) coder in Week 1 via CaRN, ACFAS, CAIS-ACSI and CARL; **if none is found the French claim is withdrawn, not
fudged.** **Feasibility, after costing it wrong twice** (D7): the stratifier reads every work against the full rubric (**$1,094**)
plus a 20,000-record second pass (**$15**). **Total $1,110, leaving ~$1,790 for the coder, who *is* the study.**

## 2. Openness, transparency, reproducibility

The repository is **public** and the committee can run it today. `make pilot-offline` re-derives **every figure above** from archived
responses **with no network**; `make proposal` **fails the build if this page quotes a number the pilot does not produce** (it caught
three while this page was being written, including a round number I had invented); `make lint` fails if the strata do not partition
the frame or if the codebook contradicts its schema. **Each guard exists because that failure already happened.** Extraction is from
a **pinned S3 snapshot**, not the metered API (8.2 days per pass).

**One reproducibility claim I will not make:** temperature 0 does not make an LLM deterministic and these versions will be retired,
so I release the **exact prompts and raw outputs** but do **not** claim the labels are reproducible. Each release carries a Zenodo
DOI: dataset (Frictionless, CC-BY-4.0), code (MIT), Docker, lockfiles, **every rubric version**, **labels with their disagreements**,
the **seam census**, validation results *including the errors*, a **Datasheet**, `DEVIATIONS.md`. Preregistered on **OSF**.

## 3. Diversity, assumptions, limitations, bias

I am a solo applicant working in English. I do **not** claim to represent the field's diverse traditions; that needs collaborators I
do not have, and I once claimed to have *measured* how badly I serve them and **withdrew it** (four records, p = 0.141). What I can
do is stop defining anyone by their distance from me: **each tradition is defined from its own literature, and cited.**

**Érudit, the main francophone Canadian platform, matches 0 OpenAlex sources** (OAI-PMH live, 379 sets): the francophone literature
is not *thin* here, it is largely **absent**. French power comes from the **Érudit harvest**, verified but not yet run. Funder
metadata skews against the traditions the call asks me to include (**NSERC carries 9.2× SSHRC's linked works**), and **31.5% of the
frame has no abstract**, where the screen finds half as much metaresearch (p = 0.023).

**Assumptions named.** The base rate rests on machine labels: **a hypothesis with a denominator, not a result.** Coverage holds
*within the frame*, not over all Canadian metaresearch. **Governance:** no sensitive identity is inferred; where Indigenous-governed
data are implicated no derived labels are released; OCAP® without an Indigenous partner is compliance theatre. I submit as an
independent researcher with no affiliation: **one of the people this dataset cannot see.**

## 4. Work plan (1 Aug to 27 Oct)

**W1–2** Source the remaining category definitions from their own literatures; **lock the rubric**; preregister (OSF); **recruit and
pay the bilingual coder**. · **W3–5** Freeze the Érudit harvest; screen the full frame; **report the version-to-version
difference**. · **W6–8** Stratified sample from screened-in **and** screened-out; dual blinded coding; adjudication. · **W9–10**
Design-weighted estimation; the differential bias report; annotation validated against MEDLINE. · **W11–12** Release; deploy;
plenary.
