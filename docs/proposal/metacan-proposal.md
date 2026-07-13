---
title: "MétaCan: an open, provenance-tracked, coverage-audited map of Canadian metaresearch"
subtitle: "Ahmad Sofi-Mahmudi · code, data, corrections: github.com/choxos/CaRN-data-challenge"
---

## What you get on 27 October

A **works-level dataset over a frozen frame of 4,299,418 works Canadian by any of four checkable metadata routes**, in which
every record carries: **why it was retrieved** (route provenance), **which sense of "Canadian" it satisfies**, language, **its
category** (`metaresearch`, `metaepidemiology`, and the traditions the call names, each defined from its own literature), the
**Ioannidis domain** for metaresearch works, **study design**, **data and code links**, and a **confidence**. Plus the summaries a
landscape is for: **counts and trends by category, year, language, province, institution and funder, with
design-based intervals**. With it: the **cited inclusion criteria and the census they came from**; a **preregistered bilingual
human audit** giving prevalence, sensitivity, and **differential error by language, source and abstract availability**; every
prompt, label and disagreement; and a **bilingual explorer, live at `metacan.xera.ac`**.

The frame is **built, not sampled**: all **482 partitions** of a pinned OpenAlex snapshot, each work exactly once; the pilot below
is done, public, and re-derivable offline.

## Don't search for metaresearch. Search for Canada, then screen.

Retrieve what *looks* like metaresearch and the field's boundary becomes a property of your keyword list, and the map is
unauditable. I inverted it: the frame is **Canadian research as four checkable metadata
routes see it** (affiliation, funder country, venue, aboutness), owing nothing to my notion of metaresearch, and membership
becomes a **classification** over that frame, not a **retrieval** over the literature. Retrieval fails both ways, measured: the best topic route **finds 12% of the field**, because OpenAlex files a work by
what it is *about*, so metaresearch about cardiology reads as cardiology (**the problem is aboutness, not vocabulary**); and it
wrongly *admits*: **17,466 works** enter on six **suspect institution assignments** (parse failures, real organizations on
unrelated papers), flagged for audit. **1,565,226 works (36.4%) carry no Canadian affiliation at
all**, so an affiliation-only frame never sees them.

## The criteria, derived rather than asserted

Three frontier models screened the same **5,600 works**, drawn with known probabilities, against one locked rubric.

> **Rate agreement is not set agreement.** Of the **274** works *any* model called metaresearch, only **104 (38%)** were called
> metaresearch by **all three**; **117 (43%)** rest on a single model's opinion; pairwise overlap is about **50%**. At a ~1% base
> rate the settled rejects buy near-total agreement for free. **The boundary is not a line the models share; it is a region they
> each cut differently**, stable at n = 1,000, 2,000 and 5,600.

**The field has no consensus definition either, and says so in print:** Puljak et al. analysed **175 information sources**, found
*"definitions varied"*, and called for consensus (J Comp Eff Res 2020); Kataoka et al. **publicly dispute them** (J Clin Epidemiol
2023;154:219); Stevens & Laynor report there is **no MeSH heading** for meta-research (J Med Libr Assoc 2023). Those are claims about
humans; mine are about models under one rubric; **only the human audit closes the gap.**

So I made the *why* measurable. A separate masked adjudicator (**a fourth model, not one of the arms**;
opinions shown as A/B/C, no model names) adjudicated **all 179 contested works**, naming for each
**which seam of the rubric produced the split**. No arm preference is detected (p = 0.49). Its verdict: **the rubric was silent on
159 of the 179 (89%)**; only **17** splits were a screener misapplying a rule that existed.

That turns adjudication into a **frequency-weighted census of the sentences the rubric was missing**. I **published the census, wrote
the revision against it, and locked it before re-screening**, so it could not be tuned to the numbers.
**Re-screened by the same three models: 96 of 179 (54%) are now unanimous; pairwise overlap moves 0.19 to 0.36.** Those works were
*selected for disagreement*, so this is not a frame-wide claim; the full re-screen is the unbiased test. **This is
the call's "inclusion and exclusion criteria to define the community", derived rather than asserted**, with the residual **83
works** released as the ones all three models still split on.

**What broke, and what now runs.** Adversarial review found my sampling design **could not reach 12.9% of the
frame**: unchecked `sum(N_h) = N`, so **549,370 works had inclusion probability exactly zero**, including **328,912** that are **the secondary
estimand's own cell**. Seven strata now **partition** the frame by
construction, asserted on every build. **`DEVIATIONS.md` carries all thirty entries; every one produced output that looked correct,
and none threw.**

## 1. Methodology

**No category is defined from memory. All seven are locked and cited**, each quoted verbatim from a source committed to the
repository: `metaresearch` (Ioannidis, PLoS Biol 2015;13:e1002264, with his five thematic areas as a per-record `domain`);
`bibliometrics` (Mingers & Leydesdorff 2015); `sts` (Jasanoff 2004; Latour); `scholarly_communication` (Borgman 2007);
`open_science` (UNESCO 2021); `research_integrity` (Fanelli 2009; COPE). `metaepidemiology` is coded under **both** published
definitions (Murad 2017; Kataoka 2023) **and flagged where they disagree**: a live dispute between named researchers is a boundary
to be *measured*, not settled by fiat. **The screen is multi-label**: a bibliometric study of citation distortion is *both*, and
forcing the choice was the bug. **"Adjacent" was bounded by negation**, its edge *not-core*, which is why
**OUT-vs-adjacent was our largest confusion at every sample size**. The build **fails** if the schema allows a category the rubric never defines, **or if a
quotation marked verbatim is not a substring of its cited PDF**; the latter caught one (v3.0 quoted Murad with a word he did not
write; corrected before any screening ran, D29).

**Estimand, prespecified.** *Primary:* Canadian-**produced** metaresearch (≥1 Canadian affiliation **or** funder). *Secondary:*
metaresearch **about** the Canadian research system. **71.2% of the frame carries no funder metadata**, so both clauses rest on
sparse metadata: the frame unions four routes, every record carries **provenance**, and the audit samples what none reached.
**44,008 paratext and short-title records (1.0%) are excluded by declaration**, shipped flagged, outside every estimate.

**Screening stratifies; it never measures.** Machine labels ship *provisional*. Design-weighted estimates survive a noisy
stratifier **only while every record keeps a nonzero selection probability**, the condition **my own design violated** above; and weights correct **selection only**, so coder error is measured, not assumed away. The classifier
**decides where humans look and never supplies a label**; its **4.8×** lift is toward *machine* labels, unvalidated until humans
code.

**Annotation, gated on measurement.** The LLM labels ~**10,000** works, a classifier trains on those, and inference over 4.3M is
cheap. **The risk is not cost, it is validity**, measured: a classifier distilled from our
*metaresearch* labels matched **its own teacher at Jaccard 0.17**; shipping that across 4.3M works would publish 4.3M confident
errors. So **study design ships only where it can be checked.** MEDLINE publication types are an external NLM standard,
**human-indexed until April 2022, automated with human curation since**, so design labels are validated on held-out data **per
era, reported separately**, and released only for classes clearing a prespecified threshold (**31,442** Canadian *Randomized
Controlled Trial*-typed works; a live count, re-derived against the frame). **MEDLINE is
biomedical**: outside it those works carry a **score, not a label**, marked unvalidated. **The dataset states, per field, which of
its own annotations it has earned the right to assert.**

**Validation**, because machine screening cannot establish accuracy and sampling the 4,243,096-record rejected mass for its misses
returns an expected 0.4 of them. **(i) A stratified probability sample with guaranteed floors** (machine score, **between-model
disagreement**, language, source, abstract availability), a floor draw from **every** stratum (known nonzero probabilities); two humans code independently, blind to machine labels, **on the full-text cascade rather than
the models' own payload** (blinding does not create missing information); an **`unresolved` outcome exists**,
estimates are **conditional on ascertainment**, and the release is layered (human-verified / high-precision / provisional /
contested). **(ii) Known-item recall on external criteria**: venue, registries, and MEDLINE publication types, all immune to
aboutness.

**Sample:** n ≈ 1,000, dual-coded. **The second coder is the single largest delivery risk and is not optional**: I recruit and pay
a bilingual (FR/EN) coder in Week 1 via CaRN, ACFAS, CAIS-ACSI and CARL; **if none is found the French claim is withdrawn, not
fudged.** **Costs, after costing them wrong three times** (D7, D30): the full v3.1-instrument screen is **$1,279** ($1,261: every
work, full rubric; $18: a 20,000-record second pass). **The call's CAD $4,000 covers, in its own
words, travel and participation, so no research cost assumes it**: compute is self-funded; the coder is paid from the award only if
the organizers confirm eligibility, otherwise via in-kind support; the fallback is prespecified either way.

## 2. Openness, transparency, reproducibility

The repository is **public** and the committee can run it today. `make pilot-offline` re-derives **every figure above** from the
archived pilot artifacts **with no network** (artifacts ship with the release; frame inputs come from a **pinned S3 snapshot**, not
the metered API's 8.2-day pass); `make proposal` **fails the build if this page quotes a number the pilot
does not produce**; `make lint` fails if the strata do not partition the frame, the codebook contradicts its schema, or a
quotation drifts from its source. **Each guard exists because that failure already happened.**

**One reproducibility claim I will not make:** temperature 0 does not make an LLM deterministic and these versions will be retired,
so I release the **exact prompts and raw outputs** but do **not** claim the labels are reproducible. Each release carries a Zenodo
DOI: dataset (Frictionless, CC-BY-4.0), code (MIT), Docker, lockfiles, **every rubric version**, **labels and
disagreements**, the **seam census**, validation results *with the errors*, a **Datasheet**, `DEVIATIONS.md`. Preregistered
on **OSF**.

## 3. Diversity, assumptions, limitations, bias

I am a solo applicant working in English. I do **not** claim to represent the field's diverse traditions; that needs collaborators I do
not have; I once claimed to have *measured* how badly I serve them and **withdrew it** (four records, p = 0.141). What I
can do is stop defining anyone by their distance from me: **each tradition is defined from its own literature, and cited.**

**Érudit, the main francophone Canadian platform, matches 0 OpenAlex sources by name** (OAI-PMH live, 379 sets): whether OpenAlex holds its
corpus under other source records is **unmeasured until the ISSN/DOI crosswalk runs (W3)**; the verified **Érudit harvest**
supplies what OpenAlex lacks.
Funder metadata skews against the traditions the call asks me to include (**NSERC carries 9.2× SSHRC's linked works**), and
**23.3% of the frame (1,003,117 works) has no abstract**; in the pilot the screen finds half as much metaresearch there (p =
0.023).

**Assumptions named.** The base rate rests on machine labels: **a hypothesis with a denominator, not a result.** Coverage holds
*within the frame*, not over all Canadian metaresearch. **Governance:** no sensitive identity is inferred; no derived labels where
Indigenous-governed data are implicated; OCAP® without an Indigenous partner is compliance theatre. I submit as an
independent researcher with no affiliation: **one of the people this dataset cannot see.**

## 4. Work plan (1 Aug to 27 Oct)

**W1–2** Preregister (OSF); **recruit the coder**. · **W3–5** Érudit harvest; full-frame screen; **version difference reported**.
· **W6–8** Stratified sample, in **and** out; dual blinded coding; adjudication. · **W9–10** Design-weighted estimates; bias
report; MEDLINE validation. · **W11–12** Release; deploy; plenary.
