# MétaCan screening rubric (v1.0)

**Locked before screening. Version-controlled. Any change is a new version with a dated entry in `DEVIATIONS.md`.**

Both machine screeners and both human coders work from this document and nothing else. The rubric is the
instrument; if two coders disagree, the rubric is what they are adjudicated against.

---

## The unit

One work (journal article, preprint, book chapter, report, dataset, or software), identified by its OpenAlex ID.
You see: title, abstract, publication year, language, venue, OpenAlex topic and field, Canadian institutional
affiliations, funders.

## The question

**Is the object of study *research itself*?**

Metaresearch studies how research is done, reported, funded, evaluated, disseminated, or governed. The test is
what the work is *about*, not what field it appears in and not what vocabulary it uses.

A cardiology trial is not metaresearch. A study of *how cardiology trials report their outcomes* is.

---

## Tier

Assign exactly one.

### T1: Core metaresearch
The primary object of study is research itself. Typical objects:

- research **methods** and their properties (bias, reporting, statistical practice, study design)
- **reproducibility**, replication, data and code sharing
- **research integrity**: misconduct, retraction, questionable research practices, authorship
- **peer review** and editorial process *as objects of study*
- **research evaluation**, metrics, rankings, funding allocation
- **scholarly communication**: publishing models, open access, preprints *as objects of study*
- **bibliometrics and scientometrics** applied to a research literature
- the **research workforce**: careers, equity, training, capacity
- **evidence synthesis methodology** (not an individual systematic review's clinical answer, but work *about* how
  syntheses are done)

### T2: Adjacent
Empirically or conceptually grounded work on science as a social system that is not framed as metaresearch but
studies it:

- **science and technology studies (STS)**: social studies of scientific knowledge, practice, controversy
- **library and information science**: information behaviour of researchers, repositories, discovery
- **research infrastructure** studies: platforms, data repositories, identifiers, standards
- **history and philosophy of science** *when the object is contemporary research practice*
- **research policy** analysis grounded in evidence

T2 is where the field's diversity lives. Be generous here: a paper does not have to call itself metaresearch to
be studying research.

### T3: Contextual
Relevant to the ecosystem, mapped and released, but **never pooled into the analytic corpus**:

- editorials, commentaries, opinion pieces about research practice
- policy documents and position statements
- announcements of infrastructure, tools, or initiatives
- news, obituaries, corrections, letters

### OUT: Not metaresearch
Everything else. Includes, and this is the most common error:

- **A study that uses a method is not a study of the method.** A meta-analysis answering a clinical question is
  OUT. A study of how meta-analyses handle heterogeneity is T1.
- **Mentioning a metaresearch term is not studying it.** A lab paper reporting "assay reproducibility", a methods
  section saying "peer reviewed", a licence note saying "open access": all OUT.
- **Domain research that happens to be bibliometric in method** but whose object is the domain, not the research:
  e.g. a bibliometric map of diabetes treatments, produced to summarise diabetes knowledge. Borderline; see below.

---

## The three errors that matter most

These are where the pilot showed retrieval and screening break down. Read them twice.

1. **Polysemy.** `reproducibility` in a biochemistry paper means the assay gives the same reading twice. In a
   metaresearch paper it means the reproducibility crisis. Only the second is in scope. The same applies to
   `validation`, `replication`, `bias`, `peer review`, `open access`. **Judge the sense, not the token.**

2. **Method vs. object.** Using bibliometrics ≠ studying research. Ask: *if this paper is right, what do we now
   know more about: a scientific question, or the practice of science?* If the former, OUT.

3. **Absence of vocabulary is not absence of content.** An STS paper about laboratory practice, or an LIS paper
   about how researchers find data, may use none of the field's keywords and still be squarely T2. **Do not
   require the vocabulary.** This is the error that makes the field look smaller and more anglophone than it is.

---

## Canadian linkage

Record which apply (this is metadata, not an inclusion test; the estimand is defined separately in
`PROTOCOL.md`):

- `CA_AFF`: at least one author affiliated with a Canadian institution
- `CA_FUND`: funded by CIHR, NSERC, SSHRC, or CFI
- `ABOUT_CA`: the Canadian research system is a substantive object of study (not a passing mention, not one
  country among forty in a global comparison)

## Genre

`empirical` · `conceptual` · `editorial/commentary` · `policy` · `infrastructure/announcement` · `other`

OpenAlex's `type` is unreliable and this field is commentary-heavy, so genre is coded, not inherited.

## Language of the work

As published. Do not infer from the venue.

---

## Confidence

- `high`: the rubric decides this cleanly.
- `medium`: the rubric decides, but a reasonable coder could differ.
- `low`: genuinely on the boundary, or the abstract is missing/too thin to judge.

**`low` is a legitimate answer and is not a failure.** Records coded `low` by either screener are routed to
adjudication. A screener that never says `low` is not being careful; it is being confident.

---

## Worked examples

| Title (abridged) | Tier | Why |
|---|---|---|
| "Data sharing practices in 500 randomised trials" | **T1** | The object is reporting practice. |
| "Reproducibility of a Western blot protocol" | **OUT** | Assay reproducibility. Polysemy trap. |
| "Trends in citation of retracted papers" | **T1** | Object is the literature's own behaviour. |
| "Laboratory life in a Canadian genomics centre: an ethnography" | **T2** | STS. No metaresearch vocabulary; still studies research. |
| "How do researchers discover datasets? A survey" | **T2** | LIS, information behaviour of researchers. |
| "Effectiveness of statins: a network meta-analysis" | **OUT** | Uses a synthesis method to answer a clinical question. |
| "How network meta-analyses handle inconsistency: a review of 200 reviews" | **T1** | Object is the method. |
| "Announcing the Canadian Research Data Repository" | **T3** | Infrastructure announcement. Mapped, not pooled. |
| "Open access mandates are failing early-career researchers" (editorial) | **T3** | Commentary about research practice. |
| "Bibliometric analysis of diabetes research 2000–2020" | **T2** | Borderline. Bibliometric method, and the object *is* a research literature, so it studies research output. Code T2, `medium`. |
| "Le libre accès dans les revues québécoises : état des lieux" | **T1** | Scholarly communication, object is publishing practice. French. |

---

## Instructions to the screener

Read the title and abstract. Apply the rubric. Do not use outside knowledge of the authors or the journal's
reputation. If the abstract is missing, judge on the title alone and set confidence to `low` unless the title is
unambiguous.

Return the schema in `protocol/screening-schema.json`. One object per work. No prose, no preamble.
