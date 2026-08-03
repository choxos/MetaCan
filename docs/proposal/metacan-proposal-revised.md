---
title: "MétaCan: an open, provenance-tracked, coverage-audited map of Canadian metaresearch"
subtitle: "Ahmad Sofi-Mahmudi (independent researcher) · Revised 27 July 2026 · Explorer: metacan.xera.ac · Code and data: github.com/choxos/MetaCan"
---

## Summary: the infrastructure proposed in July is now built

MétaCan is an open, works-level dataset and bilingual explorer that maps Canadian metaresearch. Since the original
submission, the core infrastructure has been built. The dataset covers a frozen frame of **4,299,418 works (2000-2025)**
linked to Canada in a pinned OpenAlex snapshot, constructed from all 482 snapshot partitions with each work entering
once. Every record shows why it was retrieved, which sense of "Canadian" it satisfies, and, where available, its
language and subject categories, each field labeled with the evidence behind it. The explorer is live in English and
French at **metacan.xera.ac** (queryable interface documented at metacan.xera.ac/en/api-docs). The code, screening
rubrics, labels, model disagreements, and a dated log of my own design errors are public at
**github.com/choxos/MetaCan**; components added after mid-July accompany the next tagged release. The end product is
the summaries a landscape study exists for: counts and trends by category, year, language, province, institution, and
funder, with design-based intervals. What remains, and what this proposal asks the Challenge to support, is the part
machines cannot supply: a preregistered bilingual human validation study, and the francophone coverage work.

## Why the dataset starts from Canada, not from "metaresearch"

Searching for metaresearch directly would make the field's boundary a property of my keyword list. The field has no
consensus definition, and says so in print: Puljak et al. reviewed 175 information sources and found definitions varied
(J Comp Eff Res 2020); Kataoka et al. dispute their account (2023;154:219); there is no MeSH heading for meta-research
(Stevens and Laynor 2023). So the design is inverted. The frame is Canadian research as four checkable metadata routes
see it: affiliation, funder country, venue, or a mention of Canada in title or abstract. It owes nothing to any notion
of metaresearch, so membership in metaresearch becomes a **classification over an enumerable frame**, which can be
validated by sampling, rather than a retrieval from the open literature, which cannot. The pilot measured why retrieval
fails: the best topic-based route recovers only **12%** of the works our screen identifies as metaresearch
(metaresearch about cardiology is filed as cardiology), and **36.4% of frame works carry no Canadian affiliation**, so
an affiliation-only frame would never see them.

## 1. Methodology

**Definitions are cited, not asserted.** Each category is defined by verbatim quotation from a source that defines the
field: metaresearch (Ioannidis 2015, his five areas becoming a per-record domain), bibliometrics (Mingers and
Leydesdorff 2015), science and technology studies (Jasanoff 2004), scholarly communication (Borgman 2007), open science
(UNESCO 2021), and meta-epidemiology under both published definitions (Murad 2017; Kataoka 2023), coded to show where
they disagree. The build fails if the coding scheme allows a category the rubric never defines, or if a quotation
marked verbatim does not match its cited source.

**The estimand is prespecified.** Primary: Canadian-produced metaresearch, meaning at least one Canadian affiliation or
Canadian funder; 71.2% of the frame carries no funder metadata, so every record shows which clause admitted it.
Secondary, prespecified but pilot-constrained: metaresearch about the Canadian research system. The metadata route
"mentions Canada" and the rubric's "about the research system" are different constructs (only 39 of 5,600 screened
works satisfied both), so the secondary estimate ships only if the redesigned fields survive validation. 44,008
paratext and short-title records are excluded by declaration and shipped flagged.

**Screening criteria were derived from measured disagreement.** Three frontier language models screened the same 5,600
works, drawn with known probabilities, under one locked rubric. They disagreed instructively: of the 274 works any
model called metaresearch, only 38% were called metaresearch by all three. A masked fourth model adjudicated all 179
contested works and traced 89% of the splits to sentences the rubric was missing, not to screener error. The rubric was
revised against that evidence and locked before re-screening; 96 of the 179 became unanimous. Because those works were
selected for disagreement, this measures the rubric repair, not frame-wide agreement, and the 83 still contested ship
as contested.

**Machine labels are provisional signals, never results.** Since July, two models have independently labeled a
stratified probability sample of **10,348 works**, and a statistical classifier trained on those labels, reading title,
abstract, and venue, now scores all 4.3 million works. On held-out data it agrees with the two screening models more
often than the first-generation classifier on 16 of 22 label fields; this measures imitation of the machine screeners,
not human validity. Decision flags are support-gated: only 4 of 11 binary fields have enough design-weighted sample
support to justify flags at all, and even those remain provisional machine signals pending human validation; the other
fields carry scores only. One model is also relabeling every frame work directly, about 70% complete. Prevalence claims
in the released dataset will come from the design-weighted sample with confidence intervals, never from raw
machine-label counts.

**Validation is a two-coder human study with design weights.** A stratified probability sample of about 1,000 works is
drawn from every stratum at known nonzero probability, with minimum allocations for French, no-abstract, and
high-disagreement works; stratification is essential because a simple random sample of the rejected records would be
expected to contain only 0.4 missed positives. The instrument under evaluation is the locked classifier decision rule,
thresholds frozen before coding; the reference standard is the coders' adjudicated decision. Two coders label
independently, masked to machine output, on full text where available; an unresolved outcome exists and estimates are
conditional on ascertainment. Design weighting yields prevalence with intervals; sensitivity and subgroup contrasts by
language, source, and abstract availability are reported only where prespecified event-count criteria are met, and the
French-stratum estimate is explicitly conditional on the Érudit harvest improving yield. External known-item checks
(venue, trial registries, MEDLINE publication types) probe for confidently missed records that probability sampling
rarely encounters. The bilingual second coder is the largest delivery risk and is not optional: recruited in week 1
through CaRN, ACFAS, CAIS-ACSI, and CARL, paid from the award only if the organizers confirm eligibility, otherwise via
in-kind support. Machine screening cost about $1,279 all in; compute is self-funded.

## 2. Openness, transparency, reproducibility

The repository is public: **github.com/choxos/MetaCan** carries the code, every rubric version, all labels and
disagreements, machine-readable citation metadata, and `DEVIATIONS.md`, a dated log of design errors, each of which
looked correct until it failed. The frame comes from a pinned snapshot rather than a live API, and `make pilot-offline`
re-derives the pilot numbers with no network. Build checks refuse a category the rubric never defines, a sampling plan
whose strata fail to partition the frame, and any number in this document that no pilot output or declared source
produces. One reproducibility claim I refuse to make: language-model output is not exactly repeatable even at fixed
settings, and these model versions will be retired; I release exact prompts and retained raw outputs, and I do not
claim the labels replay. The final release will ship with a Zenodo DOI, a Datasheet for Datasets, and an OSF
registration filed before the validation data are seen.

## 3. Diversity of traditions and languages; assumptions, limitations, bias

The explorer and dataset are bilingual, but a bilingual interface is not bilingual coverage. Érudit, the main
francophone Canadian platform, matches zero OpenAlex sources by name; whether its corpus appears under other records is
unmeasured until the journal-identifier crosswalk (ISSN and DOI) runs in week 3, with a verified OAI-PMH harvest
supplying the remainder. Funder metadata skews against the traditions the call asks me to include: NSERC-linked works
outnumber SSHRC-linked almost nine to one in the frozen frame. 23.3% of the frame has no abstract, and the screen finds
about half as much metaresearch there (p = 0.023); the validation study estimates these distortions instead of ignoring
them. A researcher layer built from the same snapshot adds authorships and a collaboration network deliberately
restricted to Canadian-affiliated authorships; its construction rules are printed on the page, works without authorship
records are counted and flagged, and OpenAlex affiliation errors are a named limitation. I am a solo applicant working
in English and do not claim to represent the field's diverse traditions; I claim to measure how well the pipeline
serves them. No sensitive identity is inferred, and no derived labels are released where Indigenous-governed data are
implicated. I submit as an independent researcher with no institutional affiliation: one of the people
affiliation-based metadata cannot see.

## 4. Work plan (1 August to 27 October)

**W1-2** OSF registration; recruit and train the paid bilingual coder. **W3-5** Érudit crosswalk and harvest; complete
the direct full-frame relabeling; lock the classifier decision rule and thresholds. **W6-8** Dual masked coding;
adjudication. **W9-10** Design-weighted estimates; differential bias report; known-item checks against MEDLINE types
and registry linkage. **W11-12** Zenodo release with datasheet; explorer update; plenary preparation.
