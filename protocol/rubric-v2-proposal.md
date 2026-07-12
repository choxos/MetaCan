# Rubric v2: the seams five independent screeners found, and what to do about them

**Status: PROPOSED. Not locked, not applied.** The v1 rubric (`protocol/rubric.md`) is the instrument the pilot ran
under, and changing it after seeing the data would be fitting the instrument to the data. This document is the
**evidence for a revision**, to be locked *before* the full screen and recorded in `DEVIATIONS.md` as a versioned
change.

---

## Where this evidence comes from, and why it is unusual

Ten Opus screening agents classified 2,000 works from the real frame against the locked v1 rubric. They worked
**independently**, on **disjoint chunks**, with **no knowledge of each other**, and were asked, at the end, which
boundary cases recurred.

**They converged.** Not loosely: five agents, seeing different works, independently reported the *same* underspecified
distinctions, often naming the same axis in the same terms. That convergence is what makes this evidence rather than
opinion. A distinction that ten frontier models, reading one rubric, cannot apply consistently **is not a distinction.
It is a wish**, and the disagreement it produces is not noise to be averaged away: it is the field's boundary showing
you where it actually is.

Finding 22 measured the consequence: of the works *any* model called metaresearch, only **37% were called metaresearch
by all three models**, and the largest confusion pattern was **OUT-vs-T2** — the adjacent traditions (STS, LIS) the
inclusiveness criterion exists to protect.

---

## The seams, ranked by how many independent screeners raised them

### 1. Measurement and psychometrics (raised by 5 of 5)

The single largest source of low-confidence calls. Instrument-validation studies recur constantly: a MoCA norms
paper, a TAS-20 refinement, a French-Quebec CCC-2 adaptation, a systematic review of minimal important differences
for patient-reported outcomes.

**Is validating a measurement instrument "research methods and their properties" (T1), or is it domain research whose
object is a clinical construct (OUT)?**

Every screener invented a line, and **they invented compatible but unstated lines**: single-instrument validation in a
domain → OUT; methodological work about *how instruments get built or should be chosen* (COSMIN-style, core outcome
sets, cross-instrument reviews) → T1.

> **Proposed rule.** Validation of a *specific instrument for a domain construct* is **OUT**. Work whose object is
> *instrument development methodology*, *cross-instrument comparison*, *core outcome set methodology*, or *how a field
> chooses what to measure* is **T1**. State it, with both worked examples.

### 2. Domain methodology vs. research methods (5 of 5)

T1 says "research methods and their properties". Read one way that covers every methods paper in every field: a SNP
caller benchmark, a GIS framework, a neuroimaging pipeline, a photoionization model. Read another way it covers only
cross-cutting research practice.

Screeners independently converged on: **"results depend on the analytic choice" studies → T1; building a tool for a
domain task → OUT.** A paper showing feature-selection bias inflates published classification accuracy is T1. A paper
applying a new model to patient satisfaction is OUT.

> **Proposed rule.** T1 covers methods whose object is *research practice across a literature* (reporting, bias,
> synthesis methodology, statistical practice, analytic-choice sensitivity). It does **not** cover development of a
> technique for a domain task. The discriminator: *does the finding generalise to how research is done, or to what the
> domain now knows?*

### 3. T3's document-type bullet is unscoped (4 of 5)

T3 lists "news, obituaries, corrections, letters" **without saying the item must be about research**. Taken literally
it sweeps in every clinical case letter and every domain erratum. Screeners split: a reviewer-acknowledgement list is
T3 (its object *is* peer review); an erratum on a clinical trial is OUT (its object is a trial).

> **Proposed rule.** **T3 requires the item's object to be research or the research ecosystem**, not merely its genre.
> A letter about a domain result is OUT. A letter about peer review is T3.

### 4. "Workforce" is read as any workforce (4 of 5)

T1's workforce bullet ("careers, equity, training, capacity") reliably pulls in nursing retention, teacher CPD,
law-student wellbeing, interprofessional education, classroom pedagogy. These are professional and student
populations, not the research workforce, and screeners flagged this as **the most common near-miss after the polysemy
trap**.

> **Proposed rule.** Say **"the *research* workforce"** explicitly, and add an exclusion note: professional (non-
> research) workforce, and classroom or clinical pedagogy, are **OUT**.

### 5. Tools, software, infrastructure (4 of 5)

T3's "announcements of infrastructure, tools" is, read literally, every bioinformatics software paper in existence.
Screeners drew the line at **purpose**: tools built to evaluate research artifacts (a benchmark suite, a REDCap
release for a research consortium) → T3; domain analysis software (a phylogenetics search, a PCR tiler) → OUT.

> **Proposed rule.** T3 infrastructure means **research-ecosystem** infrastructure. Domain analysis software is OUT.

### 6. LIS and STS are scoped asymmetrically (3 of 5)

T2's LIS bullet says "information behaviour **of researchers**". The STS bullet carries **no equivalent qualifier**,
which makes STS-styled work on non-science technology (network neutrality) genuinely undecidable, and lets general
library-service evaluation drift in under "be generous".

> **Proposed rule.** Qualify both bullets the same way: the object must be **science, research, or the research
> ecosystem**. This is the seam that produces the OUT-vs-T2 confusion finding 22 measured, so it matters most for the
> inclusiveness criterion.

### 7. Bibliometrics: two rubric lines contradict each other (3 of 5)

T1 lists "bibliometrics and scientometrics applied to a research literature". The worked example sends a bibliometric
map of a domain literature to **T2**. **Both cannot be right**, and screeners followed different ones.

> **Proposed rule.** Pick one and delete the other. Recommended: a bibliometric/scoping study that *characterises a
> literature* (who publishes, where the gaps are) is **T2**; one that *studies research practice through bibliometric
> means* (citation distortion, reporting trends) is **T1**.

### 8. Records with no judgeable content (3 of 5)

The frame carries bare-DOI titles, `.mat` filenames, "Additional file 3 of…", GBIF occurrence downloads, Crossref
persistence boilerplate (which is *literally text about persistent identifiers*, a scholarly-infrastructure keyword
trap), an SEO spam page, a hockey podcast, a woodworking magazine.

These are all coded OUT/low today, which **inflates the low-confidence rate and pollutes the adjudication queue** with
records that have nothing to adjudicate.

> **Proposed rule.** Add an **`insufficient_payload`** flag, distinct from OUT. It is not a screening judgment; it is
> a statement that the record cannot be screened. It must be *reported*, not silently dropped: the size of this class
> is a finding about OpenAlex, and the audit samples it.

### 9. Supplements should inherit their parent (2 of 5)

"Additional file N of *[a scoping review of airway registries]*" has no content of its own. Screeners judged the
implied parent, which is sensible and is **nowhere in the rubric**.

> **Proposed rule.** State it: a supplement inherits its parent's tier, or is flagged `insufficient_payload` when the
> parent cannot be identified.

### 10. `about_ca` for items that are not studies (2 of 5)

`about_ca` is defined as "the Canadian research system is a **substantive object of study**". T3 items are not
studies, so the definition does not apply to them, and screeners diverged on an NRC audit plan and a Canadian
Historical Review editorial.

Also flagged: **a Canadian institution as *setting* is not `about_ca`.** A Quebec COVID cohort is not about the
Canadian research system; an analysis of Canadian law faculties' tenure norms is.

> **Proposed rule.** Extend the definition to non-study genres ("substantive object", not "object of study"), and add
> the setting-vs-object exclusion with both worked examples.

---

## Two further polysemy traps, found in the wild

v1 names `reproducibility`, `peer review`, `open access`, `open science`. The screeners hit more:

- **`validation` / `evaluation`**: institutional policies on *student* assessment, clinical *instrument* validation,
  health-professions competence assessment.
- **`audit`**: financial audit, audit fees, clinical audit.
- Plus the observed traps: `"peer reviewed: yes"` as a repository artifact; judicial *standard of review*; prison
  *misconduct*; managerial *reporting*; and, memorably, **"Canada dry" as a French idiom**.

---

## What this does NOT license

**This document does not change the pilot's numbers, and must not.** Every figure in the proposal was produced under
v1, and re-screening under v2 to get a better number would be exactly the failure this project exists to object to.

The correct sequence, and the one the protocol commits to:

1. Lock v2 **before** the full screen, with this evidence attached.
2. Record the change in `DEVIATIONS.md` as a versioned rubric revision.
3. Re-screen the 2,000-work sample under v2 and **report the difference against v1 as a finding**: *what did
   specifying these ten seams actually change?* That is a measurement nobody normally makes, and it is available only
   because the ambiguity was documented before it was resolved.
