# Rubric v2: the seams fifteen independent screeners found, and what to do about them

**Status: PROPOSED. Not locked, not applied.** The v1 rubric (`docs/protocol/rubric.md`) is the instrument the pilot ran
under, and changing it after seeing the data would be fitting the instrument to the data. This document is the
**evidence for a revision**, to be locked *before* the full screen and recorded in `DEVIATIONS.md` as a versioned
change.

---

## Where this evidence comes from, and why it is unusual

Fifteen Opus screening agents classified 5,000 works from the real frame against the locked v1 rubric, in two
cohorts (five agents on works 1 to 2,000; ten agents on works 2,001 to 5,000). They worked **independently**, on
**disjoint chunks**, with **no knowledge of each other**, and were asked, at the end, which boundary cases recurred.

**They converged.** Not loosely: agents seeing entirely different works independently reported the *same*
underspecified distinctions, often naming the same axis in the same terms, and the second cohort reproduced the first
cohort's seams without having seen them. That convergence is what makes this evidence rather than opinion. A
distinction that fifteen frontier-model screeners, reading one rubric, cannot apply consistently **is not a
distinction. It is a wish**, and the disagreement it produces is not noise to be averaged away: it is the field's
boundary showing you where it actually is.

Finding 22 measured the consequence at the tier level. Finding 24 measured something worse: **the instrument
contradicts itself**, and the screeners found that too.

---

## Two facts about v1 that are not opinions

Before the seams, two defects that can be checked against the text rather than argued about.

**A. The rubric and the schema name different vocabularies for `genre`.** `docs/protocol/rubric.md` says
`empirical · conceptual · editorial/commentary · policy · infrastructure/announcement · other`.
`docs/protocol/screening-schema.json` says `empirical · review · methods · commentary · editorial · protocol · dataset ·
software · other`. **They overlap on two values out of thirteen.** Every screener was handed both and told to obey
both; each invented a private reconciliation, and they did not invent the same one. Four separate agents reported
this unprompted. See finding 24 and `DEVIATIONS.md` D20. It is now quarantined in `docs/protocol/known-defects.json` and
`make lint` fails on any *further* contradiction between the two documents.

**B. Two of the six verbs in the rubric's own definition have no tier bullet.** The definition says metaresearch
studies how research is *"done, reported, funded, evaluated, disseminated, or governed."* Four of those verbs map
onto T1 bullets. Two do not:

- **disseminated**: `scholarly communication` covers publishing models, open access and preprints, which is
  dissemination *of outputs into the literature*. Nothing covers **knowledge translation and implementation
  science**, i.e. how research reaches practice. Four agents flagged it, and all four coded such work OUT while
  saying they were unsure.
- **governed**: nothing in T1 covers **research ethics, human-subjects governance, or research-governance
  institutions**, though `governed` is the promise the definition makes.

A definition that names six objects and operationalizes four is not a strict instrument. It is an instrument with two
undefended doors.

---

## The seams, ranked by how many independent screeners raised them

### 1. Domain methodology vs. research methods, and its sharper form: *developing* a method vs. *studying* one (raised by 15 of 15)

The single largest source of disagreement, named by every screener in both cohorts.

T1 says "research methods and their properties (bias, reporting, statistical practice, study design)". Read one way
that covers every methods paper in every field: a SNP-caller benchmark, a neuroimaging pipeline, a photoionization
model, a thyroid-nodule segmentation network. Read another way it covers only cross-cutting research practice.

The second cohort sharpened it into a distinction the first cohort had not isolated. **The bullet never says whether
*proposing a new method* counts, or only *studying methods as they are used across a literature*.** A new
high-breakdown multivariate estimator in the *Canadian Journal of Statistics* is T1 by the letter and OUT by the
spirit; every worked example in the rubric is a study *of a literature*, so nothing anchors the line. Screeners
independently converged on the same rule and independently said they could not defend it from the text:

> "results depend on the analytic choice" studies → T1; building a tool for a domain task → OUT.

A paper showing feature-selection bias inflates published classification accuracy is T1. A paper applying a new
model to patient satisfaction is OUT. But a paper showing that a standard oceanographic estimator underestimates
respiration threefold *studies a method's properties across a literature* and its payoff is a domain claim, and
nothing in v1 decides it.

> **Proposed rule.** T1 covers work whose object is *research practice across a literature* (reporting, bias,
> synthesis methodology, statistical practice, analytic-choice sensitivity), **including method-comparison and
> method-critique studies whose finding generalizes to how research is done**. It does **not** cover development of
> a technique for a domain task, **nor the introduction of a new method as such**, unless the work's contribution is
> a claim about research practice. The discriminator, stated as the rubric's error 2 already almost states it:
> *if this paper is right, what do we now know more about: a scientific question, or the practice of science?*
> Add both worked examples, and add a new-method example explicitly.

### 2. Measurement and psychometrics (15 of 15)

Instrument-validation studies recur constantly: a MoCA norms paper, a TAS-20 refinement, a French-Quebec CCC-2
adaptation, a systematic review of minimal important differences for patient-reported outcomes, ActiGraph step-count
validity, ICD-10 code validation, external validation of six published prediction equations.

**Is validating a measurement instrument "research methods and their properties" (T1), or is it domain research whose
object is a clinical construct (OUT)?** The rubric flags `validation` as a polysemy trap *without saying how to
resolve it*, which is the worst of both worlds: it tells the screener the word is dangerous and then leaves the
danger.

Every screener invented a line, and **they invented compatible but unstated lines**: single-instrument validation in
a domain → OUT; methodological work about *how instruments get built or should be chosen* (COSMIN-style, core outcome
sets, cross-instrument reviews) → T1. One agent noted the hardest case: a validity review of a device *explicitly
justified by its use as a research reference standard*.

> **Proposed rule.** Validation of a *specific instrument for a domain construct* is **OUT**, even when the
> instrument is used in research. Work whose object is *instrument-development methodology*, *cross-instrument
> comparison*, *core outcome set methodology*, or *how a field chooses what to measure* is **T1**. State it, with
> both worked examples, and resolve `validation` explicitly in the polysemy section.

### 3. T3's document-type bullets are unscoped (13 of 15)

T3 lists "news, obituaries, corrections, letters" and "announcements of infrastructure, tools, or initiatives"
**without saying the item must be about research**. Only the *editorials* bullet carries the qualifier "about research
practice". Taken literally, T3 sweeps in every clinical case letter, every domain erratum, and every bioinformatics
software release in existence.

Screeners split, and said so: a reviewer-acknowledgement list is T3 (its object *is* peer review); an erratum on a
binder-jet metallurgy paper is OUT (its object is metallurgy). Under the literal reading both are T3, and T3 fills
with domain corrections.

> **Proposed rule.** **Every T3 bullet requires the item's object to be research or the research ecosystem**, not
> merely its genre. A letter about a domain result is OUT. A letter about peer review is T3. T3 infrastructure means
> **research-ecosystem** infrastructure: domain analysis software and scientific instruments are OUT. Move the
> "about research practice" qualifier from the editorials bullet up into T3's heading, where it governs all four.

### 4. Peer review *performed* is not peer review *studied* (5 of 15, and entirely new in cohort 2)

T1 covers peer review "as objects of study". The frame turns out to contain peer review **as an artifact**: published
referee reports, open peer-review records, PREreviews of preprints, "Discussion of" comments. OpenAlex even has a
`peer-review` record type.

These are *instances* of the review system whose content is dogwhelks, or hydraulic modeling, or a bacteriology
preprint. The rubric never says whether the review system's own outputs are in the map. Screeners split them from
reviewer-acknowledgement lists on instinct.

> **Proposed rule.** A peer-review artifact whose *content* is a domain paper is **OUT**; it is an instance, not a
> study, and this is the same rule as error 1 (a study that uses a method is not a study of the method). A
> peer-review artifact whose object is the review process itself is **T3**. Say so, because the frame is full of them
> and they are currently coded by coin-flip.

### 5. History of science falls into a hole the rubric dug (7 of 15)

T2 admits history and philosophy of science **only "when the object is contemporary research practice"**. The STS
bullet immediately above it carries **no such qualifier**. So a historical social study of scientific knowledge
satisfies one bullet and fails the other, and the screeners split on exactly that.

The consequence is not a rounding error. Coded strictly, **the history of Canadian science largely drops out of the
map**: the politicization of Ayurveda around Indian independence, how cybernetics spread through Latin America, how
the Université de Montréal built its psychiatry training from a 1962 survey of US programs, Penfield and Jasper, a
history of the Canadian archival profession. For a project whose inclusiveness criterion is about *traditions*, silently
excluding an entire tradition on an unexamined adverb is the worst available outcome.

> **Proposed rule.** **Delete "contemporary".** Qualify the STS and HPS bullets identically: the object must be
> **science, research, or the research ecosystem**, at any period. If a date restriction is wanted it belongs in the
> estimand, not smuggled into one tier bullet where it silently deletes a tradition.

### 6. LIS and STS are scoped asymmetrically (6 of 15)

T2's LIS bullet says "information behaviour **of researchers**". The STS bullet carries **no equivalent qualifier**,
which makes STS-styled work on non-science technology (network neutrality, Sidewalk Labs' urban socio-technical
imaginaries) genuinely undecidable, and lets general library-service evaluation drift in under "be generous".

> **Proposed rule.** Qualify both bullets the same way: the object must be **science, research, or the research
> ecosystem**. This is the seam that produces the OUT-vs-T2 confusion finding 22 measured, so it matters most for the
> inclusiveness criterion.

### 7. Bibliometrics: T1 and the worked example flatly contradict each other (6 of 15)

T1 lists "bibliometrics and scientometrics applied to a research literature". The worked example sends
"Bibliometric analysis of diabetes research 2000-2020" to **T2**, with the reasoning *"the object is a research
literature"*. **That is the T1 bullet's own criterion, used to justify T2.** Both cannot be right, and screeners
followed different ones.

> **Proposed rule.** Pick one and delete the other. Recommended: a bibliometric/scoping study that *characterizes a
> literature* (who publishes, where the gaps are) is **T2**; one that *studies research practice through bibliometric
> means* (citation distortion, reporting trends, retraction citation) is **T1**. Then fix the worked example so it
> stops contradicting the bullet.

### 8. The research workforce: the rubric says "research", the screeners still could not apply it (8 of 15)

**Correction to an earlier draft of this document, which claimed the rubric fails to say "research workforce". It
says it.** The bullet reads "the **research workforce**: careers, equity, training, capacity". The seam is real but
it is not the one I first wrote down, and it is worth being precise about, because misdescribing your own instrument
is how you come to fix the wrong thing.

The actual failure is at the **boundary of the role**, not the wording:

- Academics whose role spans **teaching and research** have no home: bias in student evaluation of teaching, faculty
  development for clinician teachers, a protocol for developing nursing academic leaders who lead both.
- **Higher-education studies** generally: participation policy, university writing centres, spending and student
  engagement across 18 Ontario universities.
- **Professional and clinical training**: nursing retention, medical-student debt, surgical curricula,
  interprofessional education. These are professional populations, not the research workforce, and screeners flagged
  them as the most common near-miss after the polysemy trap.

> **Proposed rule.** Keep "research workforce" and add the exclusion explicitly: *the professional (non-research)
> workforce, and classroom or clinical pedagogy, are OUT, including when the population is academics acting in a
> teaching role.* Add a worked example on each side of that line, because it is a line, not a wish, and it can be
> drawn.

### 9. Records with no judgeable content (6 of 15)

The frame carries bare-DOI titles, `.mat` filenames, "Additional file 3 of...", GBIF occurrence downloads, Crossref
persistence boilerplate (which is *literally text about persistent identifiers*, a scholarly-infrastructure keyword
trap), DOAJ open-access boilerplate in the abstract field (a false metaresearch signal), an SEO spam page, a hockey
podcast, a woodworking magazine. One agent found a record whose **title and abstract are about different papers**
(a body-image title with a bacterial-injectisome abstract).

These are all coded OUT/low today, which **inflates the low-confidence rate and pollutes the adjudication queue** with
records that have nothing to adjudicate.

> **Proposed rule.** Add an **`insufficient_payload`** flag, distinct from OUT. It is not a screening judgment; it is
> a statement that the record cannot be screened. It must be *reported*, not silently dropped: the size of this class
> is a finding about OpenAlex, and the audit samples it.

### 10. Knowledge translation and research governance are promised and never delivered (5 of 15)

See fact **B** above. The definition says research is "disseminated" and "governed"; no tier bullet covers knowledge
translation, implementation science, or research ethics and governance. Screeners consistently coded implementation
work OUT while saying the preamble seemed to want it in.

> **Proposed rule.** Decide, in the text, and say which way. Recommended: **knowledge translation and implementation
> science, where the object is the uptake of research findings, is T2**; *health-service delivery that happens to
> involve an intervention is OUT*. **Research ethics and governance as an object of study is T1.** Either add the
> bullets or remove the verbs from the definition, but do not keep promising six things and operationalizing four.

### 11. Guidelines, consensus standards, and reporting standards (4 of 15)

The COBIDAS neuroimaging best-practice report, a Delphi harmonizing surgical definitions *explicitly so results can
be compared across centres*, a core-outcome-set consensus statement. These are **reporting-standard work by
motivation** and **position statements by form**, so T1's methods bullet and T3's "position statements" bullet both
claim them.

> **Proposed rule.** A consensus standard whose object is **how research should be reported, measured, or compared**
> is **T1**, regardless of its genre being a position statement. A position statement about policy is T3. Genre does
> not decide tier; the object does. (This is the same principle as seam 3 and it should be stated once, globally.)

### 12. Supplements should inherit their parent (3 of 15)

"Additional file N of *[a scoping review of airway registries]*" has no content of its own. Screeners judged the
implied parent, which is sensible and is **nowhere in the rubric**.

> **Proposed rule.** State it: a supplement inherits its parent's tier, or is flagged `insufficient_payload` when the
> parent cannot be identified.

### 13. `about_ca` is near-degenerate, and it carries the secondary estimand (4 of 15, and measured)

`about_ca` is defined as "the Canadian research system is a **substantive object of study**". Three problems, and the
third is measured, not argued.

- T3 items are **not studies**, so the definition does not literally apply to them, and screeners diverged on an NRC
  audit plan and a *Canadian Historical Review* editorial.
- **A Canadian institution as *setting* is not `about_ca`.** A Quebec COVID cohort is not about the Canadian research
  system; an analysis of Canadian law faculties' tenure norms is. Screeners applied this correctly but it is nowhere
  written.
- **It fires on about 1% of the sample.** In the `about_only` stratum, whose *entire retrieval basis* is that Canada
  appears in the title or abstract, screeners marked `about_ca` true for **1.8% (Opus), 1.3% (GPT-5.6), 0.5% (Grok)**.
  The route retrieves *"Canada is mentioned"*; the rubric asks for *"the Canadian research system is studied"*. These
  are different questions, and the gap between them is the polysemy finding again, applied to the country term.

The consequence is structural: **the secondary estimand of this study ("metaresearch about the Canadian research
system") currently rests on a few dozen sampled events, and the three models disagree about it by more than they
disagree about tier.**

> **Proposed rule.** Extend the definition to non-study genres ("substantive object", not "object of study"); add the
> setting-vs-object exclusion with both worked examples. And, in the *protocol* rather than the rubric: the audit must
> **oversample `about_ca` candidates**, because at a 1% hit rate the secondary estimand cannot be estimated from a
> sample designed for the primary one.

---

## Two further polysemy traps, found in the wild

v1 names `reproducibility`, `peer review`, `open access`, `open science`, `validation`, `replication`, `bias`. The
screeners hit more, and hit the named ones in unnamed senses:

- **`validation` / `evaluation`**: institutional policies on *student* assessment, clinical *instrument* validation,
  health-professions competence assessment. Named as a trap, never resolved (seam 2).
- **`audit`**: financial audit, audit fees, clinical audit.
- Plus the observed traps: `"peer reviewed: yes"` as a repository artifact; judicial *standard of review*; prison
  *misconduct*; managerial *reporting*; DOAJ and Crossref boilerplate that is *literally about scholarly
  infrastructure*; and, memorably, **"Canada dry" as a French idiom**.

---

## What this does NOT license

**This document does not change the pilot's numbers, and must not.** Every figure in the proposal was produced under
v1, and re-screening under v2 to get a better number would be exactly the failure this project exists to object to.

The correct sequence, and the one the protocol commits to:

1. Lock v2 **before** the full screen, with this evidence attached.
2. Record the change in `DEVIATIONS.md` as a versioned rubric revision, and **delete the quarantine entry** in
   `docs/protocol/known-defects.json` so `make lint` enforces instrument self-consistency from that point on.
3. Re-screen the 5,000-work sample under v2 and **report the difference against v1 as a finding**: *what did
   specifying these thirteen seams actually change?* That is a measurement nobody normally makes, and it is available
   only because the ambiguity was documented before it was resolved.
