---
title: "MétaCan: an open, provenance-tracked, coverage-audited map of Canadian metaresearch"
subtitle: "Ahmad Sofi-Mahmudi · code, data, corrections: github.com/choxos/CaRN-data-challenge"
---

I once benchmarked a pipeline linking funded trials to their publications against a dual-reviewer standard. On records that
reached the matcher it was accurate (PPV 94.3%), but sensitivity was **44.5%**: half the publications the humans found were
never *retrieved*, and no internal check would have caught it. **Every MétaCan record will show why it was found and why it
counts as Canadian, and a human audit will quantify what the pipeline missed.** I built the first stage, then attacked it. **It
broke repeatedly, including the sampling design, my own instrument, and my best result.**

## Don't search for metaresearch. Search for Canada, then screen.

The usual design retrieves what *looks* like metaresearch, then asks whether it is Canadian. The field's boundary becomes a
property of your keyword list, and the map is unauditable: you cannot measure what a lexicon never showed you. I inverted it.
The frame is **all Canadian research**, an external, checkable criterion, and it is **built, not estimated**: I harvested all
**482 partitions** of a pinned OpenAlex snapshot and enumerated **4,299,418 works**, each exactly once. **1,565,226 (36.4%)
carry no Canadian affiliation at all**; an affiliation-only frame never sees them. Membership is then a *classification* over
that frame, not a *retrieval* over the literature.

So I ran the classification honestly: **three frontier models (Opus 4.8, GPT-5.6, Grok 4.5) screened the same 5,600 works**,
drawn with known selection probabilities, against one locked rubric, on byte-identical prompts, with labels written by the
harness and reconciled against a manifest by set equality.

> **Rate agreement is not set agreement.** Design-weighted base rates span **2.54% to 3.81%**, which looks like ordinary
> noise. It is not. Of the **274** works *any* model called metaresearch, only **104 (38%)** were called metaresearch by **all
> three**, and **117 (43%) rest on a single model's opinion**; pairwise overlap is about **50%**. At a ~1% base rate the settled rejects buy
> near-total agreement for free. **The field's boundary is not a line the models share. It is a region
> they each cut differently**, and it is stable at n = 1,000, 2,000 and 5,600.

The obvious next move is to declare a consensus and move on. Instead I asked *why* they disagree, and made it measurable. An
independent judge (**Fable 5, not one of the three arms**, and **blind**: it saw the three opinions as A/B/C in random order,
with no model names) adjudicated **all 179 contested works**, and had to name, for every one, **which seam of the rubric
produced the split**. Its verdict:

> **The rubric is silent on 159 of the 179 contested works (89%).** Only **17** splits were a screener misapplying a rule that
> actually existed. **The field's boundary was being set by the screener, not by the instrument**, and each model was privately
> inventing the missing sentence. The judge shows **no arm preference** (spread 1.16×, p = 0.49), so it is not a fourth vote
> for one of the screeners.

That converts adjudication from a tiebreak into a **frequency-weighted census of the sentences the rubric is missing**
(`methods_dev_vs_study` **39** works, `lis_sts_asymmetry` **26**, `history_of_science` **19**, `workforce_boundary` **19**). I
**published the census, wrote v2 against it, and locked v2 before re-screening**, so it could not be tuned until the numbers
improved. Two rules carry most of it: *developing or validating a technique for a domain is OUT; only methods **as
practiced** are T1*, and *the STS, LIS and history bullets apply only where the object is science or research, **at any
period***. That second rule deletes one word, "contemporary", **an unexamined adverb that was silently excluding the entire
history of Canadian science.**

> **Re-screened under v2 by the same three models: 96 of the 179 (54%) are now unanimous, and pairwise overlap of the in-scope
> sets moves 0.19 to 0.36.** Scope stated rather than blurred: those works were *selected for disagreement*, so this shows the
> rules resolve the cases they were written for; it is not a frame-wide agreement claim. The unbiased test, a full re-screen of
> all 5,600, is prespecified and is what the funded work runs.

**This is the answer to the question the call asks:** not a dataset with a boundary asserted, but **the criteria, derived from a
census of where the boundary empirically fails, with the improvement measured**, and the residual **83 works** released as the
field's contested core. The largest confusion, at every sample size, is **OUT vs T2**: the adjacent traditions (STS, LIS,
history of science) the inclusiveness criterion exists to protect. *A second, prettier claim from this screen did not replicate
when the sample grew; **withdrawn** (D23).*

**What broke, and what I did about it.**

> **1. My sampling design could not reach 12.9% of the frame, and no weight fixes that.** A stratified design rests on one
> identity, `sum(N_h) = N`. I never checked it. **549,370 works had inclusion probability exactly zero**: one stratum excluded
> everything *about* Canada while another excluded everything *affiliated with* Canada, so works that were **both** fell between
> them, and SQL three-valued logic swallowed 182,514 more. Nothing failed; every stratum returned exactly the *n* it asked for.
> The design drew a clean textbook sample **of 87% of the frame** while every number said "the frame". **The deleted cell was
> the secondary estimand's own**: 328,912 Canadian-affiliated works *about* Canada. Now seven strata that **partition** the
> frame by construction, asserted on every build, and 600 new works drawn and screened. **It was found by a model I asked to
> attack the design, adding up five weights I had handed it.**

> **2. My locked instrument contradicted itself.** The rubric and the schema named **two different vocabularies for `genre`**,
> overlapping on 2 values of 13; every screener was handed both and obeyed both privately. The validator checked `tier` and had
> never been asked to look at `genre`, so **16,800 labels passed every check that ran**. The labels are **not** repaired:
> harmonizing the arms after seeing how they diverged destroys the only evidence that they did. **A codebook is code; it gets a
> test.**

> **4. Retrieval fails in both directions.** The best topic route **finds 12% of the field** (95% CI 5.6 to 21.6%): OpenAlex files
> a work by what it is *about*, so metaresearch about cardiology reads as cardiology. **The problem is not vocabulary; it is
> aboutness.** It also wrongly *admits*: `Impact` is not an institution, it is a parse failure with an institution id, attached to
> a Spanish COVID essay, and **at least 17,466 works** enter the frame on an institution that does not exist.

`DEVIATIONS.md` carries **all twenty-five entries**, written before submission. **Every one of them produced output that looked
correct; none threw.** A project whose thesis is *measure what you missed* must survive its own instrument. **Mine did not, and
the record is public.**

## 1. Methodology

**A prespecified estimand.** *Primary:* Canadian-**produced** metaresearch: ≥1 authorship with a Canadian affiliation **or** a
Canadian funder. *Secondary:* metaresearch **about** the Canadian research system. One decision, not thirty-two combinations
called a sensitivity analysis. **71.2% of the frame carries no funder metadata**: both clauses rest on sparse metadata, which is
why the frame unions four routes, every record carries **provenance**, and the audit samples what none of them reached. The
secondary clause needed repair too: `about_ca` fired on **1.8% to 3.5%** of the strata built for it, because it cannot be true
unless a work is *already* about research. **v2 splits it**: one boolean cannot separate "Canadian data, universal claim" from
"a claim about Canada".

**Screening stratifies; it never measures.** Machine tiers ship *provisional* and are **never reported as the field**. That
demotion is what the disagreement buys: design-weighted estimates from known selection probabilities are **unbiased however noisy
the stratifier is**; noise costs efficiency, never validity. A classifier trained on the model labels earns its place as a
**stratifier** (**48.2% of in-scope works in its top decile**, a **4.8× lift**) and nothing more: it matches **its own teacher**
at Jaccard **0.17**. **It decides where humans look; it never supplies a label.**

**Validation: three instruments**, because machine screening cannot establish accuracy and sampling a 3.2M rejected mass for its
misses returns an expected 0.4 of them. **(i) A stratified probability sample with guaranteed floors** (machine score,
**between-model disagreement**, language, source, abstract availability), with a baseline draw from **every** stratum so every
record keeps a **known nonzero** selection probability; two humans code independently, blind to machine labels, and design
weights give prevalence, sensitivity and **differential error by language, source and abstract availability**. **(ii) Recall measured
against labelled data, not the haystack.** **(iii) Known-item recall on external criteria**: **venue** (a Canadian paper
in *Social Studies of Science* is T2 by where it was published) and **registries** (ClinicalTrials.gov knows a Canadian trial
happened independently of any pipeline). Both are immune to the aboutness that defeats topic retrieval: **the frame flip again.**

**Sample:** n ≈ 1,000, dual-coded ≈ 65 coder-hours. **The second coder is not optional**: I recruit and pay a bilingual (FR/EN)
coder in Week 1 via CaRN, ACFAS, CAIS-ACSI and CARL. **Feasibility, after costing it wrong twice** (D7): the stratifier reads
every work against the full rubric (**$1,094**, batched) plus a 20,000-record second pass (**$15**). **Total $1,110, leaving
~$1,790 for the coder, who *is* the study.**

## 2. Openness, transparency, reproducibility

The repository is **public** and the committee can run it today. `make pilot-offline` re-derives **every figure above** from
archived responses **with no network**; `make proposal` **fails the build if this page quotes a number the pilot does not
produce**; `make lint` fails if the strata do not partition the frame, if the codebook contradicts its schema, or if a known
statistical bug reappears. **Each of those guards exists because that failure already happened.** Extraction is from a **pinned
S3 snapshot**, not the metered API (one pass = 8.2 days).

**One reproducibility claim I will not make:** temperature 0 does not make an LLM deterministic and these versions will be
retired, so I release the **exact prompts and raw outputs** but do **not** claim the labels are reproducible. Each release
carries a Zenodo DOI: dataset (Frictionless, CC-BY-4.0), code (MIT), Docker, lockfiles, **both rubrics**, **labels with their
disagreements**, the **seam census**, validation results *including the errors*, a **Datasheet**, `DEVIATIONS.md`. Preregistered
on **OSF**.

## 3. Diversity, assumptions, limitations, bias

I am a solo applicant working in English. I do **not** claim to represent the field's diverse traditions; that needs
collaborators I do not have. I once claimed to have *measured* how badly I serve them, and **withdrew it** (four records,
p = 0.141). What remains is a condition I state rather than promise. **Érudit, the main francophone Canadian platform, matches 0 OpenAlex
sources** (OAI-PMH live, 379 sets): the francophone literature is not *thin* here, it is largely **absent**. French power comes
from the **Érudit harvest**, verified but not yet run; **if it does not deliver, the French claim is withdrawn, not fudged.**
Funder metadata skews against exactly the traditions the call asks me to include (**NSERC carries 9.2× SSHRC's linked works**),
and **31.5% of the frame has no abstract**, where the screen finds half as much metaresearch (p = 0.023).

**Assumptions named.** The base rate rests on machine labels: a hypothesis with a denominator, not a result. Coverage holds
*within the frame*, not over all Canadian metaresearch. **Governance:** no sensitive identity is inferred; where
Indigenous-governed data are implicated no derived labels are released; OCAP® without an Indigenous partner is compliance
theatre. I submit as an independent researcher with no affiliation: **one of the people this dataset structurally cannot see.**

## 4. Work plan (1 Aug to 27 Oct)

**W1–2** Lock estimand and rubric v2; preregister (OSF); **recruit and pay the bilingual coder**. · **W3–5** Freeze the Érudit
harvest; screen the full frame under v2 and **report the v1-to-v2 difference frame-wide**. · **W6–8** Stratified sample from
screened-in **and** screened-out; reference sets; dual blinded coding; adjudication. · **W9–10** Design-weighted estimation; the
differential bias report. · **W11–12** Release; deploy; plenary.

**Outputs:** a versioned works-level dataset (provenance, linkage flags, language, genre, *provisional* tier, confidence); **the
inclusion criteria and the seam census they came from**; the disagreement dossier; the preregistered audit and bias report;
everything in §2; a **bilingual explorer**, live at `metacan.xera.ac`.
