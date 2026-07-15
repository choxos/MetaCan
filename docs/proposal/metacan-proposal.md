---
title: "MétaCan: an open, provenance-tracked, coverage-audited map of Canadian metaresearch"
subtitle: "Ahmad Sofi-Mahmudi · code, data, corrections: github.com/choxos/CaRN-data-challenge"
---

## What you get on 27 October

A **works-level dataset over a frozen frame of 4,299,418 works Canadian by any of four checkable metadata routes**, in which every
record carries: **why it was retrieved** (route provenance), **which sense of "Canadian" it satisfies**, language, **its
categories** (multi-label, each cited to its own literature), the **Ioannidis domain**, **data and code links**, and, per field, a
**validation status**: human-verified, gated label, or **score only**. On it, the summaries a landscape is for: **counts and trends by
category, year, language, province, institution and funder, with design-based intervals**. With it: the **cited inclusion criteria
and the census they came from**; a **preregistered bilingual human audit** giving prevalence, sensitivity and **differential error
by language, source and abstract availability**; every prompt, label and disagreement; and a **bilingual explorer, live at
`metacan.xera.ac`**.

The frame is **built, not sampled**: all **482 partitions** of a pinned OpenAlex snapshot, each work once. The pilot below is done
and re-derivable offline.

## Don't search for metaresearch. Search for Canada, then screen.

Retrieve what *looks* like metaresearch and the field's boundary becomes a property of your keyword list, and the map is
unauditable. I inverted it: the frame is **Canadian research as four checkable metadata routes see it** (affiliation, funder
country, venue, aboutness), owing nothing to my notion of metaresearch, so membership becomes a **classification** over that frame,
not a **retrieval** over the literature. Retrieval fails both ways, measured. The best topic route recovers **12% of the works our
screen calls metaresearch** (7% under the other screener), because OpenAlex files a work by what it is *about*: metaresearch about
cardiology reads as cardiology, so **the problem is aboutness, not vocabulary**. And it wrongly *admits*: **17,466 works** enter on
six **suspect institution assignments** (parse failures, real organizations on unrelated papers), flagged for audit. **1,565,226
works (36.4%) carry no Canadian affiliation at all**, so an affiliation-only frame never sees them.

## The criteria, derived rather than asserted

Three frontier models screened the same **5,600 works**, drawn with known probabilities, under one locked rubric.

> **Rate agreement is not set agreement.** Of the **274** works *any* model called metaresearch, only **104 (38%)** were called
> metaresearch by **all three**; **117 (43%)** rest on one model's opinion; pairwise overlap is about **50%**. At a ~1% base rate
> the settled rejects buy near-total agreement for free. **The boundary is not a line the models share; it is a region they each
> cut differently**, stable at n = 1,000, 2,000 and 5,600.

**The field has no consensus definition either, and says so in print:** Puljak et al. analysed **175 information sources**, found
*"definitions varied"*, and called for consensus (J Comp Eff Res 2020); Kataoka et al. **publicly dispute them** (2023;154:219);
there is **no MeSH heading** for meta-research (Stevens & Laynor 2023). Those are claims about humans, mine about models under one
rubric; **only the human audit closes the gap.**

So I made the *why* measurable. A separate masked adjudicator (**a fourth model, not one of the arms**; opinions shown as A/B/C, no
model names) adjudicated **all 179 contested works**, naming **which seam produced each split**. No arm preference is detected
(p = 0.49). Its verdict: **the rubric was silent on 159 of them (89%)**; only **17** splits were a screener misapplying a rule.

That turns adjudication into a **frequency-weighted census of the sentences the rubric was missing**. I **published the census,
wrote the revision against it, and locked it before re-screening**, so it could not be tuned to the numbers. **Re-screened: 96 of
179 (54%) are now unanimous; pairwise overlap moves 0.19 to 0.36.** Those works were *selected for disagreement*, so the full
re-screen is the unbiased test. **These are the call's "inclusion and exclusion criteria", written against measured evidence of
where they fail** rather than asserted, and **the community's own criteria are what the audit and the released disagreements put
up for challenge**. The residual **83 works** ship contested.

## 1. Methodology

**No category is defined from memory.** Six are **quoted verbatim** from a source that defines the field, committed to the
repository: `metaresearch` (Ioannidis, PLoS Biol 2015;13:e1002264, his five areas becoming a per-record `domain`); `bibliometrics`
(Mingers & Leydesdorff 2015); `sts` (Jasanoff 2004; Latour); `scholarly_communication` (Borgman 2007); `open_science` (UNESCO
2021); and `metaepidemiology`, coded under **both** published definitions (Murad 2017; Kataoka 2023) **and flagged where they
disagree**, because a live dispute is a boundary to be *measured*, not settled. **The seventh is weaker and the rubric says so:**
Fanelli and COPE define *misconduct* and *publication ethics*, **not the field that studies them**, so `research_integrity` is
defined by its **object** and the gap is on the record. **The screen is multi-label**: a bibliometric study of citation distortion
is *both*, and forcing the choice was the bug. **"Adjacent" was bounded by negation**, its edge *not-core*, which is why
**OUT-vs-adjacent was our largest confusion at every sample size**. The build **fails** if the schema allows a category the rubric
never defines, **or if a quotation marked verbatim is not a substring of its cited PDF** (it caught one: v3.0 quoted Murad with a
word he did not write, D29).

**Estimand, prespecified.** *Primary:* Canadian-**produced** metaresearch (≥1 Canadian affiliation **or** funder); **71.2% of the
frame carries no funder metadata**, so **both clauses of the primary** rest on sparse metadata, and every record carries
**provenance**. *Secondary:* metaresearch **about** the Canadian research system, **prespecified but pilot-constrained**: the route
named "about Canada" and the rubric's *about the research system* are **different constructs** (only **39 of 5,600** works are both
in scope and about Canada), so v3.1 **splits the field in two** and the secondary estimate ships only if the redesigned fields
survive the audit. **44,008 paratext and short-title records (1.0%) are excluded by declaration**, shipped flagged, outside every
estimate.

**What broke, and what now runs.** Design weights survive a noisy stratifier **only while every record keeps a nonzero selection
probability**, and **my own design violated exactly that**: I never checked `sum(N_h) = N`, so **549,370 works (12.9%) had
inclusion probability zero**, including **328,912** in **the secondary estimand's own cell**. Adversarial review found it; seven
strata now **partition** the frame, asserted on every build. **`DEVIATIONS.md` carries all thirty-six entries; every one produced
output that looked correct, and none threw.**

**One annotation contract, and no layer borrows another's authority.** The LLM reads **every** work under the full v3.1 rubric
(**$1,261**: the screen is affordable, so there is no prefilter and no distilled substitute), and that output is **provisional,
machine, per-field**. The classifier trains on those labels and **never asserts a category**: distilled from our *metaresearch*
labels it reproduced **its own teacher's positive set at Jaccard 0.17**, a fact about the *boundary* rather than an error rate, and
disqualifying either way. What it is *for* is what another LLM pass cannot buy: a **calibrated score** the audit stratifies on, a
**frame-wide map of where the three models would disagree** (running all three over 4.3M costs 3× and 25 days; a 5,600-work sample
predicts it), and **rubric revisions testable in minutes, not one $1,261 pass each**. **Labels ship only where checked**:
human-verified, or gated against MEDLINE publication types by NLM's **record-level `IndexingMethod`** rather than a year cutoff,
with **class-specific calendar eligibility**, because *Observational Study* enters the vocabulary in 2014 and *Systematic Review*
in 2019, so their absence before that is **not a negative**. Everything else is a **score**. **The dataset states, per field, which
annotations it has earned the right to assert.**

**Validation**, because a simple sample of the 4,243,096 rejects returns an expected **0.4** misses. **(i) A stratified probability
sample with floors** (machine score, **between-model disagreement**, language, source, abstract availability), drawn from **every**
stratum at known nonzero probabilities; two humans code independently, blind to machine labels, **on the full-text cascade rather
than the models' own payload** (blinding does not create missing information); an **`unresolved` outcome exists** and estimates are
**conditional on ascertainment**. **(ii) Known-item recall on external criteria**: venue, registries, MEDLINE types, all immune to
aboutness.

**Sample:** n ≈ 1,000, dual-coded. **The second coder is the largest delivery risk and is not optional**: recruited in Week 1 via
CaRN, ACFAS, CAIS-ACSI and CARL; **if none is found the French claim is withdrawn, not fudged.** **Costs, after costing them wrong
three times** (D7, D30): **$1,279** all in. **The call's CAD $4,000 covers travel and participation, in its own words, so no
research cost assumes it**: compute is self-funded, and the coder is paid from the award only if the organizers confirm
eligibility, otherwise via in-kind support.

## 2. Openness, transparency, reproducibility

The repository is **public** and the committee can run it today. `make pilot-offline` re-derives **every figure above** from the
archived artifacts **with no network** (frame inputs come from a **pinned S3 snapshot**, not the metered API's 8.2-day pass);
`make proposal` **fails if this page quotes a number the pilot does not produce or declare**; `make lint` fails if the strata do
not partition the frame, the codebook contradicts its schema, or a quotation drifts from its source. **Each guard exists because that
failure happened**, the newest of them after a reviewer noticed this page claimed a check nobody ran (D31).

**One reproducibility claim I will not make:** temperature 0 does not make an LLM deterministic and these versions will be retired,
so I release the **exact prompts and raw outputs** but do **not** claim the labels reproduce. Each release carries a Zenodo DOI:
data (CC-BY-4.0), code (MIT), Docker, lockfiles, **every rubric version**, **labels and disagreements**, the **seam census**,
validation results *with the errors*, a **Datasheet**, `DEVIATIONS.md`. Preregistered on **OSF**.

## 3. Diversity, assumptions, limitations, bias

I am a solo applicant working in English. I do **not** claim to represent the field's diverse traditions; that needs collaborators
I do not have, and I once claimed to have *measured* how badly I serve them and **withdrew it** (four records, p = 0.141). What I
could stop doing was defining anyone by their distance from me; §1 is that repair.

**Érudit, the main francophone Canadian platform, matches 0 OpenAlex sources by name** (OAI-PMH live, 379 sets); whether OpenAlex
holds its corpus under other source records is **unmeasured until the ISSN/DOI crosswalk runs (W3)**, and the verified harvest
supplies the rest. Funder metadata skews against the traditions the call asks me to include (**NSERC carries 9.2× SSHRC's**), and
**23.3% of the frame (1,003,117 works) has no abstract**; one historical model assigned positive labels at 0.78% there versus
1.55% with abstracts (p = 0.023). This measures model behaviour, not accuracy or field prevalence.

**Assumptions named.** The base rate rests on machine labels: **a hypothesis with a denominator, not a result**, and coverage holds
*within the frame*. No sensitive identity is inferred; no derived labels where Indigenous-governed data are implicated; OCAP®
without an Indigenous partner is compliance theatre. I submit as an independent researcher with no affiliation: **one of the people
this dataset cannot see.**

## 4. Work plan (1 Aug to 27 Oct)

**W1–2** Preregister; **recruit the coder**. · **W3–5** Érudit harvest; full-frame screen; version difference. · **W6–8**
Stratified sample, in **and** out; dual blinded coding; adjudication. · **W9–10** Estimates; bias report; MEDLINE validation. ·
**W11–12** Release; deploy; plenary talk.
