# MétaCan screening rubric (v3.0)

**Status: DRAFT. To be locked in Week 1, before the full screen.** Supersedes v2.2. It is not applied to any number produced so far: the pilot ran under v1.0, and the 179-work re-screen under v2.0. Those attributions do not move.

---

## What changed, and why it is not cosmetic

v1 and v2 had a tier hierarchy: **T1 core / T2 adjacent / T3 contextual**. That structure had a defect at its root, and the data found it before I did.

> **"Adjacent" is defined by negation.** It means *not-T1*. A category whose only content is "near the important one" cannot be applied consistently, and **OUT-vs-T2 was the largest tier confusion at every sample size we measured.** The models were not failing. **The category was empty.**

It was also a value judgment I had no standing to make. Calling science and technology studies "adjacent" says STS is peripheral to metascience. **STS is a field with its own founding literature, its own journals and its own account of what studying science means.** It is not an appendage of anything.

**v3 deletes the hierarchy.** Every tradition is a **category with its own positive definition, taken from its own literature, with a citation.** There is no residual bucket, so there is nothing to be confused about. A record can carry more than one category, because the traditions genuinely overlap in the world and forcing a single label is what created the problem.

---

## The definitional problem is the field's, not this project's, and the field says so in print

This matters for how the whole study is framed. The boundary disagreement we measured is **not an artifact of my rubric.** It is a known, published, unresolved condition of the field:

- **Puljak L, Lovric Makaric Z, Buljan I, Pieper D.** *What is a meta-epidemiological study? Analysis of published literature indicated heterogeneous study designs and definitions.* J Comp Eff Res. 2020. doi:10.2217/cer-2019-0201
  > Analyzed **175 information sources**. *"Definitions of meta-epidemiological studies varied and some studies used the term meta-epidemiological study to describe methodological research-on-research studies."* Conclusion: *"Research community would benefit from consensus about definition of meta-epidemiological study."*

- **Kataoka Y, et al.** *"Meta-epidemiological study" is a study in which the unit of analysis is a study, not a patient; response to Puljak et al.* J Clin Epidemiol. 2023;154:219-221.
  > A **published dispute** with Puljak, which opens by naming *"the currently confusing nomenclatures around 'meta-epidemiology' and related terms such as 'meta-research' and 'research-on-research'."*

- **Stevens ER, Laynor G.** *Recognizing the value of meta-research and making it easier to find.* J Med Libr Assoc. 2023;111(4). doi:10.5195/jmla.2023.1758
  > *"The breadth of meta-research presents a significant challenge for identifying published meta-research studies,"* and it notes **the lack of a MeSH heading** for meta-research.

Those three are, respectively: **an empirical finding of no consensus**, **an active argument about the boundary between named researchers**, and **a statement that the field cannot be reliably retrieved from a literature database.**

They are our pilot's findings, in print, arrived at independently. This project's contribution is therefore not *"we noticed the definition is fuzzy."* It is: **we are the first to quantify what the fuzziness costs, and to publish the criteria written against a census of where it actually fails.**

---

## The categories

A work may carry **more than one**. Categories are not ranked. `metaresearch` is the canonical corpus for the primary estimand; the others are **mapped, released, and reported separately**, which is what the call's inclusiveness criterion asks for.

### 1. `metaresearch` — LOCKED, sourced

> **"Meta-research is an evolving scientific discipline that aims to evaluate and improve research practices. It includes thematic areas of methods, reporting, reproducibility, evaluation, and incentives (how to do, report, verify, correct, and reward science)."**
>
> Ioannidis JPA, Fanelli D, Dunne DD, Goodman SN. *Meta-research: Evaluation and Improvement of Research Methods and Practices.* PLoS Biol. 2015;13(10):e1002264. doi:10.1371/journal.pbio.1002264
>
> See also Ioannidis JPA. *Meta-research: Why research on research matters.* PLoS Biol. 2018;16(3):e2005468. doi:10.1371/journal.pbio.2005468; and METRICS, Stanford: <https://metrics.stanford.edu/research>

Every `metaresearch` record carries a **`domain`**, taken verbatim from the five thematic areas:

| `domain` | Ioannidis's gloss | operationally |
|---|---|---|
| `methods` | *how to **do** science* | design, conduct, analysis, bias, statistical practice, evidence-synthesis methodology |
| `reporting` | *how to **report** science* | reporting standards and completeness, scholarly communication *as an object of study* |
| `reproducibility` | *how to **verify** science* | replication, data and code sharing, transparency |
| `evaluation` | *how to **correct** science* | peer review and editorial process, research assessment, metrics and indicators |
| `incentives` | *how to **reward** science* | funding allocation, careers and the research workforce, reward structures, integrity and misconduct |

**RULE 1 stands** (carried from v2, and it resolved the largest seam): *a work is `metaresearch` on methods only if its object is methods **as used, reported or performed by researchers**. Developing, deriving, validating or teaching a technique for a domain is OUT, however generic the technique.* An instance of a research practice is not a study of it.

### 2. `metaepidemiology` — LOCKED, sourced, and **CONTESTED IN PRINT**

There is **no consensus definition** (Puljak 2020, above). This rubric does not invent one. **It records both published definitions and flags where they disagree**, because that disagreement is the field's, it is live, and hiding it inside a single label would destroy the only evidence of it.

- **`metaepi_narrow`** — Murad MH, Wang Z. *Guidelines for reporting meta-epidemiological methodology research.* Evid Based Med. 2017;22(4):139-142. doi:10.1136/ebmed-2017-110713
  > *"Meta-epidemiological studies adopt a systematic review or meta-analysis approach to examine the impact of certain characteristics of clinical studies on the observed treatment effect."*

- **`metaepi_broad`** — Kataoka Y, et al. J Clin Epidemiol. 2023;154:219-221.
  > *"The greatest common defining concept of 'meta-epidemiological studies' would be **any studies in which the unit of analysis is a study, not a patient**."*

**Both are coded. Where they differ, the record is flagged, and the size of that class is reported as a finding.** A published dispute between named researchers is exactly the kind of boundary this project exists to measure rather than to settle by fiat.

### 3. `bibliometrics` — **NEEDS A SOURCE BEFORE LOCK**
### 4. `sts` (science and technology studies) — **NEEDS A SOURCE BEFORE LOCK**
### 5. `scholarly_communication` — **NEEDS A SOURCE BEFORE LOCK**
### 6. `open_science` — **NEEDS A SOURCE BEFORE LOCK**
### 7. `research_integrity` — **NEEDS A SOURCE BEFORE LOCK**

> **These five are named in the call for proposals as traditions in their own right, and they will each be defined from their own canonical literature, exactly as `metaresearch` and `metaepidemiology` are above.**
>
> **They are deliberately left blank.** I know references I would reach for, and the entire argument of this document is that a definition taken from the applicant's memory is worth nothing: the whole reason `metaresearch` needed fixing is that its definition was **mine and uncited** for the life of the project (`DEVIATIONS.md` D26). Writing an unverified citation here, in the rubric, in a proposal about research integrity, would be the single worst thing this project could do.
>
> **Each requires a source PDF in `docs/reference/definitions/`, read, with the definition quoted verbatim, before v3 locks.** That is a Week 1 task in the work plan. Until then these categories exist as named, empty slots, which is an honest state and is visibly different from a filled one.

### `insufficient_payload`

Not a judgment; a statement that the record cannot be screened (a scraping artifact as a title, boilerplate in the abstract field, a title and abstract from different papers, spam). **Reported, never silently dropped**: the size of this class is a finding about OpenAlex.

### OUT

None of the above. **"OUT" now means "not in any defined category", not "not near the important one."** That is the whole point of the change.

---

## Canadian linkage

Unchanged from v2.2, and split as v2 split it, because one boolean could not separate *"Canadian data, universal claim"* from *"a claim about Canada"*:

- `CA_AFF` — at least one Canadian institutional affiliation. **Warning, measured:** OpenAlex invents these. `Impact` is not an institution; it is a parse failure with an institution id, attached to a Spanish COVID essay. At least **17,466** works enter the frame on an institution that does not exist, and that is a lower bound (finding 27). A Canadian affiliation is *evidence*, not proof.
- `CA_FUND` — CIHR, NSERC, SSHRC, or CFI.
- `ABOUT_CA_SYSTEM` — the Canadian **research system or academy** is a substantive object. A Canadian institution as *setting* is not this.
- `ABOUT_CA_TOPIC` — Canada is a substantive subject, whether or not research is the object.

## Confidence

`high` / `medium` / `low`. **If the abstract is missing, judge on the title alone and set confidence to `low` unless the title is unambiguous.** The schema **quotes** this sentence; it does not paraphrase it (D24).

**`low` is a legitimate answer.** A screener that never says `low` is not being careful; it is being confident.

---

## What v3 does not claim

**No number in this project was produced under v3.** The pilot ran under v1.0; the 179-work re-screen under v2.0. Both instruments are kept byte for byte so that every figure stays attributable to the text that produced it.

v3 is the instrument the **funded work** locks in Week 1 and screens the full frame under, and the **v2-to-v3 difference will be reported as a finding**, exactly as the v1-to-v2 difference was: *what did replacing a hierarchy with seven cited definitions actually change?* If it changes nothing, that is a result and it will be reported as one.
