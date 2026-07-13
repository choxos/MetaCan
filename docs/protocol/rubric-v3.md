# MétaCan screening rubric (v3.1)

**Status: LOCKED, 2026-07-13.** Supersedes v2.2. No screening ran under v3.0, which lived for hours: an adversarial review found that its Murad quotation inserted the word "treatment" into a sentence this document calls verbatim (D29). v3.1 corrects that quotation from the PDF, fixes the Kataoka page range, aligns the funder clause with the protocol, corrects two glosses against their sources, and adds the study-design vocabulary that v3.0 demanded but never listed. Since D29, `pilot/check_quotes.R` fails the build if any quotation marked verbatim is not a substring of its cited PDF.

**No number produced so far was made under v3.** The pilot ran under v1.0; the 179-work re-screen under v2.0. Both instruments are kept byte for byte, so every figure stays attributable to the text that produced it. v3 is the instrument the **full screen** runs under, and the **v2-to-v3 difference is reported as a finding**.

---

## What changed, and why it is not cosmetic

v1 and v2 had a tier hierarchy: **T1 core / T2 adjacent / T3 contextual**. That structure had a defect at its root, and the data found it before I did.

> **"Adjacent" is defined by negation.** It means *not-T1*. A category whose only content is "near the important one" cannot be applied consistently, and **OUT-vs-adjacent was the largest tier confusion at every sample size we measured.** The models were not failing. **The category was empty.**

It was also a value judgment I had no standing to make. Calling science and technology studies "adjacent" says STS is peripheral to metascience. **STS is a field with its own founding literature, its own journals, and its own account of what studying science means.**

**v3 deletes the hierarchy.** Every tradition is a **category with its own positive definition, taken from its own literature, quoted verbatim from a source in `docs/reference/definitions/`.** There is no residual bucket. A record may carry **more than one** category, because the traditions genuinely overlap and forcing a single label is what created the problem.

**Nothing here is cited from memory.** Every quotation below was read from the PDF named beside it. In a project whose worst deviation (D26) was that its own definition of metaresearch was mine and uncited for its entire life, a recalled citation would be the single worst thing this document could contain.

---

## The definitional problem is the field's, not this project's, and the field says so in print

- **Puljak L, Lovric Makaric Z, Buljan I, Pieper D.** *What is a meta-epidemiological study? Analysis of published literature indicated heterogeneous study designs and definitions.* J Comp Eff Res. 2020. doi:10.2217/cer-2019-0201
  > Analysed **175 information sources**. *"Definitions of meta-epidemiological studies varied and some studies used the term meta-epidemiological study to describe methodological research-on-research studies."* Conclusion: *"Research community would benefit from consensus about definition of meta-epidemiological study."*

- **Kataoka Y, et al.** J Clin Epidemiol. 2023;154:219-220.
  > A **published dispute** with Puljak, opening by naming *"the currently confusing nomenclatures around 'meta-epidemiology' and related terms such as 'meta-research' and 'research-on-research'."*

- **Stevens ER, Laynor G.** *Recognizing the value of meta-research and making it easier to find.* J Med Libr Assoc. 2023;111(4). doi:10.5195/jmla.2023.1758
  > *"The breadth of meta-research presents a significant challenge for identifying published meta-research studies,"* and it notes **the lack of a MeSH heading** for meta-research.

**Those are claims about humans.** The pilot's numbers are claims about **models disagreeing under one rubric**. They are consistent, they are not the same estimand, and **only the human audit closes the gap** (`DEVIATIONS.md` D27).

---

## The categories

A work may carry **more than one**. **Categories are not ranked and none is primary: the released landscape is the union of the defined categories, with every overlap reported.** The call's primary estimand is reported over `metaresearch` because that is the field the call names; that is a **reporting choice, not a rank**, and each of the other traditions gets the same per-category estimate.

### 1. `metaresearch`

> **"Meta-research is an evolving scientific discipline that aims to evaluate and improve research practices. It includes thematic areas of methods, reporting, reproducibility, evaluation, and incentives (how to do, report, verify, correct, and reward science)."**
>
> Ioannidis JPA, Fanelli D, Dunne DD, Goodman SN. *Meta-research: Evaluation and Improvement of Research Methods and Practices.* PLoS Biol. 2015;13(10):e1002264.
> See also Ioannidis JPA. PLoS Biol. 2018;16(3):e2005468; METRICS, Stanford: <https://metrics.stanford.edu/research>

Every `metaresearch` record carries a **`domain`**, taken verbatim from those five thematic areas and glossed by Ioannidis's own parenthetical:

| `domain` | Ioannidis's gloss | operationally |
|---|---|---|
| `methods` | *how to **do** science* | design, conduct, analysis, bias, statistical practice, evidence-synthesis methodology; Ioannidis's own description of this area ends *"research integrity and ethics"* |
| `reporting` | *how to **report** science* | reporting standards and completeness |
| `reproducibility` | *how to **verify** science* | replication, data and code sharing, transparency |
| `evaluation` | *how to **correct** science* | peer review and editorial process, research assessment, metrics |
| `incentives` | *how to **reward** science* | funding allocation, careers and the research workforce, reward structures |

**RULE 1 stands** (carried from v2; it resolved the largest single seam): *a work is `metaresearch` on methods only if its object is methods **as used, reported or performed by researchers**. Developing, deriving, validating or teaching a technique for a domain is OUT, however generic the technique.* **An instance of a research practice is not a study of it.**

### 2. `metaepidemiology` — **CONTESTED IN PRINT. Both definitions are coded.**

There is **no consensus definition** (Puljak 2020, above). **This rubric does not invent one.** It codes **both published definitions** and **flags where they disagree**, because the dispute is live, it is between named researchers in peer-reviewed journals, and hiding it inside a single label would destroy the only evidence of it.

- **`metaepi_narrow`** — Murad MH, Wang Z. *Guidelines for reporting meta-epidemiological methodology research.* Evid Based Med. 2017;22(4):139-142. doi:10.1136/ebmed-2017-110713
  > *"Meta-epidemiological studies adopt a systematic review or meta-analysis approach to examine the impact of certain characteristics of clinical studies on the observed effect and provide empirical evidence for hypothesised associations."*
  >
  > *(v3.0 quoted this sentence as 'the observed **treatment** effect'. The word is not in the paper; it narrowed Murad's definition while claiming his authority for the narrowing, and it survived a LOCK. D29.)*

- **`metaepi_broad`** — Kataoka Y, et al. J Clin Epidemiol. 2023;154:219-220. *(Not 219-221: page 221 is Puljak's reply, which is the other side of the dispute.)*
  > *"The greatest common defining concept of 'meta-epidemiological studies' would be **any studies in which the unit of analysis is a study, not a patient**."*

**Where the two differ, the record is flagged, and the size of that class is reported as a finding.** A published dispute is a boundary to be *measured*, not settled by fiat.

### 3. `bibliometrics` (scientometrics)

> **"Scientometrics is the study of the quantitative aspects of the process of science as a communication system. It is centrally, but not only, concerned with the analysis of citations in the academic literature."**
>
> Mingers J, Leydesdorff L. *A Review of Theory and Practice in Scientometrics.* Eur J Oper Res. 2015. doi:10.1016/j.ejor.2015.04.002
> Founding work: Price DJ de Solla. *Networks of Scientific Papers.* Science. 1965;149(3683):510-515.

**Boundary with `metaresearch`, and it resolves v1's self-contradiction** (v1's T1 bullet and its own worked example gave opposite answers): a study that **characterises a literature** by quantitative means is `bibliometrics`. A study that uses bibliometric means to **make a claim about research practice** (citation distortion, reporting trends, citation of retracted work) is **also `metaresearch`**, and carries both. **v3 does not force the choice; that forcing was the bug.**

### 4. `sts` (science and technology studies)

> **"co-production is shorthand for the proposition that the ways in which we know and represent the world (both nature and society) are inseparable from the ways in which we choose to live in it."**
> **"The idiom of co-production ... represents a major synthesis of scholarship in science and technology studies (S&TS)."**
>
> Jasanoff S (ed.). *States of Knowledge: The Co-Production of Science and the Social Order.* Routledge, 2004.

> **"We study science in action and not ready made science or technology; to do so, we either arrive before the facts and machines are blackboxed or we follow the controversies that reopen them."**
>
> Latour B. *Science in Action: How to Follow Scientists and Engineers through Society.* Harvard University Press.

**Operational test:** the work studies **science or technology as social practice**: how knowledge and social order are produced together, how facts are made rather than found, how controversies open and close. **The object must be science, research, or technoscientific knowledge**, at any period. *(v1 restricted history and philosophy of science to "contemporary research practice", an unexamined adverb that silently excluded the entire history of Canadian science. It is deleted.)*

### 5. `scholarly_communication`

> **"Scholarly communication is a rich and complex sociotechnical system formed over a period of centuries."**
> **"...used here in the broader sense to include the formal and informal activities associated with the use and dissemination of information through public and private channels."**
>
> Borgman CL. *Scholarship in the Digital Age: Information, Infrastructure, and the Internet.* MIT Press, 2007.

### 6. `open_science`

> **"Open science is a set of principles and practices that aim to make scientific research from all fields accessible to everyone for the benefits of scientists and society as a whole."**
> **"Open science is about making sure not only that scientific knowledge is accessible but also that the production of that knowledge itself is inclusive, equitable and sustainable."**
>
> UNESCO. *Recommendation on Open Science* (introduction), 2021. **193 countries adopted it.**

The second sentence is the reason this category is not a synonym for "open access": UNESCO's definition makes **inclusivity and equity of knowledge production** part of open science itself, which is the criterion this challenge is judged on.

### 7. `research_integrity` — **defined by its OBJECT; the sources do not define the field, and that is recorded**

**Honest limitation, stated rather than hidden.** The two sources supplied define **what counts as misconduct** and **what publication ethics covers**. **Neither defines "research integrity research" as a discipline** the way Ioannidis defines metaresearch or Jasanoff defines STS. So this category is defined by its **object**, and the gap is on the record.

> **"...the analysis was limited to behaviours that distort scientific knowledge: fabrication, falsification, 'cooking' of data, etc... Survey questions on plagiarism and other forms of professional misconduct were excluded."**
>
> Fanelli D. *How Many Scientists Fabricate and Falsify Research? A Systematic Review and Meta-Analysis of Survey Data.* PLoS ONE. 2009;4(5):e5738.

> Publication ethics, per **COPE** (Committee on Publication Ethics), *Ethics Toolkit for Journal Editors and Publishers.*

**Operational test:** the object is **research misconduct, questionable research practices, retraction, authorship, or publication ethics**, *as an object of study*. **Fanelli's boundary is adopted and its exclusion is carried:** fabrication, falsification and data cooking are in; **plagiarism and professional misconduct are recorded but marked, because Fanelli's own scope excludes them** and a rubric that silently widened his boundary while citing him would be misquoting its own source.

**This category overlaps `metaresearch` heavily**: Ioannidis's own description of the *methods* area ends *"research integrity and ethics"*, so integrity research is inside metaresearch by his definition. **That overlap is expected and allowed**, because v3 is multi-label. It is not a hierarchy.

### `insufficient_payload`

Not a judgment; a statement that the record **cannot be screened** (a scraping artifact as a title, boilerplate in the abstract field, a title and abstract from different papers, spam). **Reported, never silently dropped**: the size of this class is a finding about OpenAlex.

### `OUT`

None of the above. **"OUT" now means "in no defined category", not "not near the important one."** That is the whole change.

---

## Canadian linkage

- `CA_AFF` — at least one Canadian institutional affiliation. **Warning, measured:** OpenAlex misassigns these. **At least 17,466** works enter the frame with, as their *only* Canadian institution, one of six suspect assignments: a parse failure that is not an institution at all (`Impact`, attached to a Spanish COVID essay) or a real organization attached to papers it has nothing to do with (`Discovery Air (Canada)` on a Brazilian linguistics paper). That is a **lower bound** from six audited strings (finding 27), and the records are **flagged for audit, not deleted**. A Canadian affiliation is *evidence*, not proof.
- `CA_FUND` — ≥1 funder whose OpenAlex `country_code` is Canada: an **external criterion, not a curated list**. *(An earlier four-funder list (CIHR, NSERC, SSHRC, CFI) failed twice: three of its four hardcoded IDs pointed at other funders, and even corrected it missed Canada Research Chairs, the Government of Canada, NRC, Mitacs, Genome Canada, and every provincial agency. OpenAlex knows 2,182 Canadian funders; `R/pin_entities.R` pins them.)*
- **`ABOUT_CA_SYSTEM`** — the Canadian **research system or academy** is a substantive object. *A Canadian institution as setting is not this.*
- **`ABOUT_CA_TOPIC`** — Canada is a substantive subject, whether or not research is the object.

*(v1 had one boolean and it could not separate "Canadian data, universal claim" from "a claim about Canada". Four screening agents proposed this split independently.)*

## Study design

Coded for every work, from **this vocabulary and no other** (v3.0 said "coded for every work" and never listed the values, which is D20's exact shape: a field every screener codes and no two code alike):

| `study_design` | MEDLINE publication type it is validated against |
|---|---|
| `randomized_trial` | Randomized Controlled Trial |
| `nonrandomized_trial` | Controlled Clinical Trial |
| `observational` | Observational Study |
| `systematic_review` | Systematic Review |
| `meta_analysis` | Meta-Analysis |
| `case_report` | Case Reports |
| `qualitative` | *(none; ships as a score, marked unvalidated)* |
| `simulation_or_modeling` | *(none; ships as a score, marked unvalidated)* |
| `bench_or_experimental` | *(none; ships as a score, marked unvalidated)* |
| `theoretical_or_conceptual` | *(none; ships as a score, marked unvalidated)* |
| `not_applicable` | *(the work is not empirical research: editorials, datasets, software)* |
| `design_other` | *(none; ships as a score, marked unvalidated)* |

**Validated against MEDLINE publication types.** *(Stated precisely, because v3.0 called them "human-indexed by NLM" and that has not been true since April 2022, when NLM moved to automated indexing with selective human curation. So the validation reports the two eras separately: pre-2022 records are the human-indexed reference; post-2022 records measure agreement with NLM's automated indexer, which is itself a machine.)* Where MEDLINE does not reach (most of the physical sciences, humanities and social sciences), the label ships as a **score, not an assertion**, and is **marked unvalidated**. *The dataset states, per field, which of its own annotations it has earned the right to assert.*

## Genre

**One vocabulary, defined here, and `screening-schema-v3.json` QUOTES this list rather than paraphrasing it.**

`empirical` · `review` · `methods` · `commentary` · `editorial` · `protocol` · `dataset` · `software` · `other`

*(In v1 the rubric and the schema named **two different vocabularies for this field**, overlapping on two values out of thirteen. Every screener was handed both and obeyed both privately; the validator checked `tier` and had never been asked to look at `genre`, so 16,800 labels passed every check that ran. See D20 and finding 24. **A codebook is code. It gets a test.**)*

## `tier` is RETIRED

v3 replaces it with `categories`, which is **multi-label**. The values `T1`, `T2`, `T3` and `OUT` remain in the **legacy** `screening-schema.json` **only so that the v1 and v2 label files stay readable**; the v3 contract, `screening-schema-v3.json`, **does not contain the field**, so no new screening can emit them. `OUT` in v3 means an empty `categories` array: *in no defined category*, not *near the important one*.

## Confidence

`high` / `medium` / `low`. **If the abstract is missing, judge on the title alone and set confidence to `low` unless the title is unambiguous.** The schema **quotes** this sentence; it does not paraphrase it (D24).

**`low` is a legitimate answer.** A screener that never says `low` is not being careful; it is being confident.

---

## Sources

Every quotation above was read from a PDF in **`docs/reference/definitions/`**, which is committed. Nothing is cited from memory, and since D29 that is a checked property, not a promise: `pilot/check_quotes.R` fails the build if any quotation marked verbatim is not a substring of its cited PDF. `pilot/check_instrument.R` fails the build if this rubric and `screening-schema-v3.json` disagree about any field, in either direction.
