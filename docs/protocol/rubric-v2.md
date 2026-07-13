# MétaCan screening rubric (v2.1)

**Status: LOCKED, 2026-07-13. Supersedes v1.0 for all screening from this date.**

> **v2.0 → v2.1, same day, recorded rather than quietly patched.** v2.0 mandated `insufficient_payload` as "a flag distinct from OUT" while `screening-schema.json`'s tier enum was `[T1, T2, T3, OUT]`: **v2.0 demanded a value its own output contract could not express.** That is exactly the defect v2 was written to fix (D20), committed by the document that fixes it, and the build guard aimed at that defect did not catch it because it was hardcoded to read v1's file. A screening agent found it, in a footnote, while doing something else. The schema now carries the value; the guard now reads the current rubric and checks both directions. See `DEVIATIONS.md` D25. **The 179-work re-screen ran under v2.0**, so its three `insufficient_payload` records were coded `OUT` with the flag in the reason string; that is stated rather than silently corrected.

**v1.0 is not deleted and is not corrected.** It remains in `docs/protocol/rubric.md`, byte for byte, because 5,600 works were screened against it and every number in the pilot is attributable to that text. A rubric edited after the data are seen is a rubric that can no longer say what any past number means. See `DEVIATIONS.md` D25.

---

## Why v2 exists, and how its sentences were chosen

Not by taste. **By census.**

Three frontier models screened 5,600 works against v1. They split on 179 of them. An independent judge, from outside the panel and blind to which model said what, adjudicated all 179 and was required to name, for every work, *which seam of the rubric produced the split*.

Its verdict on v1:

> **The rubric is silent on 159 of the 179 contested works (89%).** Only 17 splits were a screener misapplying a rule that actually existed.

The field's boundary was being set by the screener, not by the instrument. Every model was left to invent the missing sentence privately, and none of them invented the same one.

The seams, weighted by the works they actually cost:

| seam | works | % of contested |
|---|---:|---:|
| `methods_dev_vs_study` | **39** | 21.8% |
| `lis_sts_asymmetry` | **26** | 14.5% |
| `history_of_science` | 19 | 10.6% |
| `workforce_boundary` | 19 | 10.6% |
| *(screener error; the rubric was fine)* | 17 | 9.5% |
| `bibliometrics_contradiction` | 12 | 6.7% |
| `instrument_validation` | 10 | 5.6% |
| `insufficient_payload` | 8 | 4.5% |
| `knowledge_translation` | 8 | 4.5% |
| `guidelines_standards` | 7 | 3.9% |
| `t3_unscoped_genre` | 6 | 3.4% |
| `research_governance` | 5 | 2.8% |
| `peer_review_artifact` | 3 | 1.7% |

**Two judges worked disjoint batches with no contact. They named the same top seam, and they independently proposed nearly the same missing sentence.** That convergence is why the two rules below are stated first and stated hardest: they are not the ones I found most interesting, they are the ones that cost the most agreement.

---

## The two rules that carry the most weight

Everything else in this document is detail. These two sentences resolve, between them, roughly **36% of every disagreement three frontier models had about this field.**

### RULE 1 (resolves `methods_dev_vs_study`, `instrument_validation`, and much of `guidelines_standards`)

> **A work is T1 on methods only if its object is methods *as used, reported, or performed by researchers*. Developing, deriving, validating, or teaching a technique for use in a domain is OUT, however generic the technique and however rigorously its properties are established.**

The discriminator, which the rubric already almost states in its error 2: *if this paper is right, what do we now know more about: a scientific question, or the practice of science?*

- A new high-breakdown estimator in a statistics journal → **OUT.** It *is* a contribution to research practice; it is not a *study* of it.
- Psychometric validation of a depression scale → **OUT.** Same reason. `validation` was flagged as a polysemy trap in v1 and never resolved; it is resolved here.
- A demonstration that feature-selection bias inflates the classification accuracies *published in a literature* → **T1.**
- A review of how 200 network meta-analyses handled inconsistency → **T1.**
- A COSMIN-style study of how a field *chooses* what to measure → **T1.**

The same confusion wears three different hats, and this one sentence removes all three: **an instance of a research practice is not a study of it.** That is v1's own error 1 ("a study that uses a method is not a study of the method"), extended to cover *building* the method as well as *using* it.

### RULE 2 (resolves `lis_sts_asymmetry` and `history_of_science`)

> **The STS, LIS, history and philosophy of science bullets apply only where the object is science, research, or the research ecosystem. That condition governs all of them equally, at any period.**

v1's LIS bullet said "information behaviour **of researchers**". The STS bullet directly above it carried no such qualifier, so STS-shaped work on non-science technology (municipal smart-city governance, public opinion on GMOs) had nothing in the text to stop it entering T2.

And **"contemporary" is deleted** from the history/philosophy bullet. In v1 it silently excluded the entire history of Canadian science: a history of the Canadian archival profession, the transatlantic transfer of experimental pedagogy to Quebec, how cybernetics spread through Latin America. For a project whose inclusiveness criterion is about *traditions*, deleting a whole tradition on an unexamined adverb is the worst available outcome. If a date restriction is wanted it belongs in the **estimand**, not smuggled into one tier bullet.

---

## The unit

Unchanged from v1. One work, identified by its OpenAlex ID. You see title, abstract, year, language, venue, OpenAlex topic and field, Canadian institutional affiliations, funders.

## The question

**Is the object of study *research itself*?**

Metaresearch studies how research is done, reported, funded, evaluated, disseminated, or governed. The test is what the work is *about*, not what field it appears in and not what vocabulary it uses.

A cardiology trial is not metaresearch. A study of *how cardiology trials report their outcomes* is.

**v1 named six verbs and operationalized four.** `disseminated` and `governed` had no tier bullet at all, so knowledge translation and research ethics had nowhere to land and screeners coded them OUT while saying they were unsure. Both now have homes (T1 and T2 below). A definition that promises six things and delivers four is not a strict instrument; it is an instrument with two undefended doors.

---

## Tier

Assign exactly one. **The object decides the tier. Genre never does.** (This single principle retires `guidelines_standards` and `t3_unscoped_genre`; see T3.)

### T1: Core metaresearch

The primary object of study is research itself.

- **research methods as practiced**: bias, reporting, statistical practice, study design, analytic-choice sensitivity — **subject to RULE 1**
- **reproducibility**, replication, data and code sharing
- **research integrity**: misconduct, retraction, questionable research practices, authorship
- **peer review** and editorial process *as objects of study* — **but a peer-review artifact whose content is a domain paper (a published referee report, an open-review record, a "Discussion of") is an INSTANCE, not a study: OUT.** It is RULE 1 again.
- **research evaluation**, metrics, rankings, funding allocation
- **scholarly communication**: publishing models, open access, preprints *as objects of study*
- **bibliometrics and scientometrics** that study **research practice** through bibliometric means (citation distortion, reporting trends, retraction citation) — *see the bibliometrics rule below*
- the **research workforce**: careers, equity, training, capacity — **subject to the workforce rule below**
- **evidence synthesis methodology** (work *about* how syntheses are done, not an individual review's clinical answer)
- **research ethics and governance as an object of study** — *new in v2; the definition promised "governed" and v1 delivered nothing*
- **reporting and measurement standards** (COBIDAS, core outcome sets, a Delphi harmonizing definitions so results can be compared across centres) — **T1 by object, even though a position statement by form**

### T2: Adjacent

Empirically or conceptually grounded work on science as a social system that is not framed as metaresearch but studies it. **All bullets are subject to RULE 2.**

- **science and technology studies**: social studies of scientific knowledge, practice, controversy — *where the knowledge or practice studied is research*
- **library and information science**: information behaviour of researchers, repositories, discovery
- **research infrastructure** studies: platforms, data repositories, identifiers, standards — *scholarly infrastructure; a domain instrument or analysis package is OUT*
- **history and philosophy of science** where the object is science or research practice — **at any period**
- **research policy** analysis grounded in evidence
- **knowledge translation and implementation science** where the object is the **uptake of research findings** — *new in v2; health-service delivery that merely involves an intervention is OUT*
- **bibliometric or scoping studies that characterize a literature** (who publishes, where the gaps are)

T2 is where the field's diversity lives. Be generous here: a paper does not have to call itself metaresearch to be studying research.

### T3: Contextual

Relevant to the ecosystem, mapped and released, but **never pooled into the analytic corpus**.

> **Every T3 bullet requires the item's OBJECT to be research or the research ecosystem, not merely its genre.** A letter about a domain result is OUT. A letter about peer review is T3. An erratum on a metallurgy paper is OUT. A reviewer-acknowledgement list is T3.

- editorials, commentaries, opinion pieces **about research practice**
- policy documents and position statements **about research** *(but a reporting/measurement standard is T1, by object; see above)*
- announcements of **research-ecosystem** infrastructure, tools, or initiatives *(a bioinformatics package for a domain task is OUT)*
- news, obituaries, corrections, letters **about research or the research ecosystem**

### OUT: Not metaresearch

Everything else. Including, and these remain the most common errors:

- **A study that uses a method is not a study of the method.** A meta-analysis answering a clinical question is OUT. A study of how meta-analyses handle heterogeneity is T1.
- **A work that BUILDS a method is not a study of the method either.** (RULE 1. New in v2, and it is the single largest source of disagreement in the field.)
- **Mentioning a metaresearch term is not studying it.** A lab paper reporting "assay reproducibility", a methods section saying "peer reviewed", a licence note saying "open access": all OUT.
- **Domain research that happens to be bibliometric in method**, but whose object is the domain.

---

## The bibliometrics rule (v1 contradicted itself here)

v1's T1 bullet said "bibliometrics applied to a research literature". v1's worked example sent a bibliometric map of a domain literature to **T2**, using the T1 bullet's own criterion as the reason. **Both could not be right, and screeners followed different ones.**

Resolved:

- A bibliometric study that **characterizes a literature** (who publishes, where the gaps are, how a field grew) → **T2**.
- A bibliometric study that **studies research practice** through bibliometric means (citation of retracted work, reporting trends over time, citation distortion) → **T1**.

## The workforce rule

"The **research** workforce" was always the wording; the failure was at the boundary of the role, not in the words.

- The **research** workforce: careers, equity, training, capacity → **T1**.
- **Academics acting in a teaching role** (student evaluation of teaching, faculty development for clinician teachers), **higher-education studies** (participation policy, university writing centres), and **professional or clinical training** (nursing retention, surgical curricula) → **OUT**.

## Records that cannot be screened

New in v2. Use **`insufficient_payload`**, a flag distinct from OUT.

The frame carries scraping artifacts as titles (`178 PUBLICATIONS 2,994 CITATIONS`), thesis licence boilerplate, DOAJ and Crossref persistence boilerplate in the abstract field (which is *literally text about scholarly infrastructure*, a keyword trap), records whose title and abstract belong to different papers, and outright spam.

**It is not a screening judgment. It is a statement that the record cannot be screened.** It must be *reported*, not silently dropped: the size of this class is a finding about OpenAlex, and the audit samples it.

A supplement (`Additional file 3 of...`) **inherits its parent's tier**, or is flagged `insufficient_payload` when the parent cannot be identified.

---

## Canadian linkage

**Split in two. v1's single boolean could not separate "Canadian data, universal claim" from "a claim about Canada", and four screening agents independently proposed exactly this repair.**

- `CA_AFF`: at least one author affiliated with a Canadian institution.
  **Warning, measured:** OpenAlex invents Canadian affiliations. `Impact` is not an institution; it is a parse failure with an institution id, and it is attached to a Spanish COVID essay. At least 17,466 works enter the frame on an institution that does not exist (finding 27), and that is a lower bound. A Canadian affiliation is *evidence*, not proof.
- `CA_FUND`: funded by CIHR, NSERC, SSHRC, or CFI.
- **`ABOUT_CA_SYSTEM`**: the Canadian **research system or academy** is a substantive object (not a passing mention, not one country among forty). *A Canadian institution as **setting** is not this.* A Quebec COVID cohort is not about the Canadian research system; an analysis of Canadian law faculties' tenure norms is.
- **`ABOUT_CA_TOPIC`**: Canada is a substantive subject of the work, whether or not research is the object. *(Prairie drought, the 2006 federal election, BC grizzly bears.)*

**Why this matters and is not bookkeeping:** in v1, `about_ca` could only be TRUE once a work was *already* about research, so it was nearly collinear with tier and carried almost no independent information **in the very stratum built to carry it**. The secondary estimand could not be estimated from the stratum designed for it (finding 27).

## Genre

**One vocabulary. This document is the only place it is defined, and `docs/protocol/screening-schema.json` now QUOTES this list rather than paraphrasing it.**

`empirical` · `review` · `methods` · `commentary` · `editorial` · `protocol` · `dataset` · `software` · `other`

In v1 the rubric and the schema named **two different vocabularies for this field, overlapping on two values out of thirteen**, and every screener was handed both and told to obey both. Two models followed the rubric and were therefore a quarter illegal against the schema; one drew from both lists at once and emitted thirteen distinct values. The validator checked `tier` and had never been asked to look at `genre`, so 16,800 labels passed every check that ran (D20, finding 24). **A codebook is code. It gets a test**, and `pilot/check_instrument.R` now fails the build on any contradiction between this document and the schema.

## Confidence

- `high`: the rubric decides this cleanly.
- `medium`: the rubric decides, but a reasonable coder could differ.
- `low`: genuinely on the boundary, or the abstract is missing/too thin to judge.

**The rule, stated once, here, and quoted verbatim by the schema:** if the abstract is missing, judge on the title alone and set confidence to **`low` unless the title is unambiguous**.

In v1 the schema *misquoted* this, saying `low` was required *whenever* the abstract was missing. Since `low` is what routes a record to human adjudication, and a third of the frame has no abstract, the contradiction silently changed **which records a human ever looks at** (D24).

**`low` is a legitimate answer and is not a failure.** A screener that never says `low` is not being careful; it is being confident.

---

## Worked examples

| Title (abridged) | Tier | Why |
|---|---|---|
| "Data sharing practices in 500 randomised trials" | **T1** | The object is reporting practice. |
| "Reproducibility of a Western blot protocol" | **OUT** | Assay reproducibility. Polysemy trap. |
| **"A new high-breakdown estimator for multivariate location"** | **OUT** | **RULE 1.** Builds a method; does not study one. Generic ≠ metaresearch. |
| **"Psychometric validation of a Persian self-injury inventory"** | **OUT** | **RULE 1.** Validating an instrument for a domain construct. |
| **"A systematic review of the measurement properties of instruments for X"** | **T1** | Object is how the field measures, not one instrument. |
| "Trends in citation of retracted papers" | **T1** | The literature's own behaviour. |
| **"COBIDAS: best practices for reporting neuroimaging"** | **T1** | Object is how research should be reported. A position statement by form; **the object decides.** |
| **"A published referee report on a hydrology manuscript"** | **OUT** | **RULE 1.** An instance of peer review, not a study of it. |
| **"Reviewer acknowledgement list, volume 12"** | **T3** | Its object *is* peer review. |
| **"Correction to: binder-jet metallurgy of Inconel 718"** | **OUT** | T3 genre, but the object is metallurgy. **The object decides.** |
| "Laboratory life in a Canadian genomics centre: an ethnography" | **T2** | STS, object is research. |
| **"Sidewalk Labs and urban socio-technical imaginaries in Toronto"** | **OUT** | **RULE 2.** STS in method; the object is corporate urbanism, not science. |
| **"How cybernetics spread through Latin America, 1955-1975"** | **T2** | **RULE 2.** History of science; "contemporary" is deleted. |
| **"A history of the Canadian archival profession"** | **T2** | **RULE 2.** Research ecosystem, historical. |
| "How do researchers discover datasets? A survey" | **T2** | LIS, information behaviour of researchers. |
| **"Des services pensés pour tous" (inclusive library services)** | **OUT** | **RULE 2.** LIS by venue; the object is library service users, not researchers. |
| "Effectiveness of statins: a network meta-analysis" | **OUT** | Uses a synthesis method to answer a clinical question. |
| "How network meta-analyses handle inconsistency: a review of 200 reviews" | **T1** | Object is the method. |
| "Bibliometric analysis of diabetes research 2000-2020" | **T2** | Characterizes a literature. *(v1's T1 bullet said T1. The contradiction is resolved: this is T2.)* |
| **"Citation distortion in the amyloid literature"** | **T1** | Studies research practice *through* bibliometrics. |
| **"Bias in student evaluation of teaching"** | **OUT** | Academics in a **teaching** role. Not the research workforce. |
| **"Career reconversion of doctoral graduates"** | **T1** | The research workforce. |
| **"Barriers to uptake of a clinical guideline in Ontario hospitals"** | **T2** | Knowledge translation: object is the uptake of research. *(v1 had nowhere to put this.)* |
| "Announcing the Canadian Research Data Repository" | **T3** | Research-ecosystem infrastructure. |
| **"OSeMOSYS Global: an open electricity-system model generator"** | **OUT** | A tool, but for a domain task. |
| "Open access mandates are failing early-career researchers" (editorial) | **T3** | Commentary about research practice. |
| **"178 PUBLICATIONS 2,994 CITATIONS"** | **`insufficient_payload`** | A scraping artifact, not a title. Reported, not silently dropped. |
| "Le libre accès dans les revues québécoises : état des lieux" | **T1** | Scholarly communication. French. |

---

## Instructions to the screener

Read the title and abstract. Apply the rubric. Do not use outside knowledge of the authors or the journal's reputation. If the abstract is missing, judge on the title alone and set confidence to `low` unless the title is unambiguous.

**When in doubt, ask RULE 1's question:** *if this paper is right, what do we now know more about: a scientific question, or the practice of science?*

Return the schema in `docs/protocol/screening-schema.json`. One object per work. No prose, no preamble.

---

## What v2 does not claim

It has not been shown to work. **It has been shown to be written against the right questions**, which is not the same thing, and the difference is the next experiment.

The 5,600-work sample will be re-screened under v2 and the **v1-to-v2 difference reported as a finding**: *what did specifying these seams actually change?* That measurement is available only because the ambiguity was enumerated, adjudicated, and published **before** it was resolved. If v2 does not move the agreement numbers, that is a result, and it will be reported as one.
