# Deviations, errors, and corrections

`protocol/PROTOCOL.md` §9 says: *"Any departure from this protocol will be recorded in `DEVIATIONS.md`, with a
reason and a date. Silent revision is itself a research-integrity failure, and this is a metaresearch project."*

This is that file. It is written before submission, not after. Every entry cost me something to write.

Numbering matches the pilot findings where relevant. Nothing here has been quietly rolled into a rewrite.

---

## D1. The pilot screen violated the locked rubric. It saw six of the eight fields the rubric mandates.

**Date found:** 2026-07-11, by adversarial review, before submission.
**Severity:** the most serious defect in this project.

`protocol/rubric.md` (the locked instrument) tells the screener:

> "You see: title, abstract, publication year, language, **venue, OpenAlex topic and field, Canadian institutional
> affiliations, funders**."

The harness (`pilot/make_screener_b_sample.R:79`, and the chunk builder in `pilot/09_screening.R`) sent:

```
id, title, abstract, year, lang, type
```

**Withheld: venue, OpenAlex topic, OpenAlex field, Canadian institutional affiliations, funders.** Four of those
five (`topic`, `field`, `ca_institutions`, `funder_names`) were sitting in `canadian_sample.rds` and were dropped by
a `select()`. **Venue was never extracted from the snapshot at all.**

So every headline number in the pilot was produced by a screen that did not follow its own locked rubric. It ran, in
effect, as a **title-and-abstract screen**.

### Why this is worse than it first looks

The proposal's newest instrument, added on 2026-07-11 in response to finding 14, is **known-item recall on venue**:
the argument that venue is an external criterion immune to *aboutness*, and therefore the only instrument that can
see into the screen's blind spot. **Venue is one of the fields the rubric already mandated and the harness silently
dropped.** The "new" instrument is, in part, a proposal to actually do what the rubric always said.

It also contaminates finding 11. That finding says the screen is blind to T2 (STS, LIS) work whose *title* carries
none of the field's vocabulary. That is true of the screen **as run**. But the screen as *specified* would have seen
the venue and the OpenAlex topic, which are exactly the signals that would rescue such a work. **Finding 11 may be
measuring a harness bug rather than a property of machine screening.** It is reported with that caveat and not
otherwise.

### What is being done about it

1. This entry.
2. The rubric's payload is now the **specification the full screen implements**, and the pilot's payload is recorded
   as a deviation from it rather than presented as compliance.
3. The full study re-runs the screen with the complete eight-field payload and reports **the difference between the
   two runs as a finding**: what the withheld metadata was worth. That difference is a measurement nobody normally
   makes, and it is only available because the bug happened.
4. Every claim that rests on the title-only screen is flagged in the proposal as resting on it.

**It is not repaired by re-labelling the rubric to match the harness.** That would be fitting the instrument to the
data after seeing the data, which is the thing this project exists to object to.

---

## D2. 465 records (7.5%) were silently lost by the screening harness, and the losses are biased.

**Date found:** 2026-07-11, by adversarial review, before submission.

6,202 records were sent to screener A. 5,737 labels came back. **465 records vanished with no error and no log.**

The losses are not random, and they are biased on the one covariate the pilot's inclusiveness finding turns on:

| | n | no abstract | % |
|---|---|---|---|
| **labelled** | 5,737 | 1,806 | **31.5%** |
| **silently dropped** | 465 | 187 | **40.2%** |

chi-square **p = 0.00013**.

The harness disproportionately dropped records **with no abstract**, which is precisely the stratum finding 11 is
about. So finding 11's abstract effect is measured on a sample from which abstract-less records were
non-randomly removed. The direction of that bias is not obvious and is not assumed here.

`pilot/09_screening.R` prints "6,202 Canadian works" while `findings.json` carries both 6,202 and 5,737 with no
reconciliation. Fixed: the discrepancy is now surfaced, and the full screen fails loudly on any unreturned record
rather than shrinking the denominator in silence.

---

## D3. "The topic route covers about a third of the field" (retracted 2026-07-11)

The pilot reported 32.4% coverage, computed as 14,873 (works the topic route retrieves) / 45,850 (works the base
rate implies exist).

**That divides a retrieved set by a true field size.** They are not commensurable: the retrieved set is only 60%
metaresearch and is not a random draw from the field. It is arithmetic with no estimand behind it, and it flattered
the design.

The right quantity is **recall**, measured directly against the rubric labels: **12% (95% CI 5.6 to 21.6), at 60%
precision, missing 66 of 75.** 32.4% lies outside that interval. See `pilot/12_topic_route_recall.R`.

`pilot/check_proposal_numbers.R` now fails the build if the proposal quotes any figure the pilot does not produce.
It was written because of this.

---

## D4. The era robustness check was a decoy, and it published 3100% as a percentage.

`pilot/11_base_rate_robustness.R` originally tested whether the base rate varies by **publication era** (it does
not, p = 0.91) and concluded the base rate was robust.

Era was the wrong covariate. The snapshot partition's documented selection mechanism is **abstract recovery**, so
abstract availability is what it selects on. That was never tested. It moves the estimate (0.78% vs 1.55%,
p = 0.023).

The same script also contained a dplyr `summarise()` column-masking bug (`in_scope = sum(in_scope)` masks the
logical column, so a later `mean(in_scope)` takes the mean of a length-1 count). It published **"3100%, 2900%,
1500%"** as base rates in `FINDINGS.md`.

And it **hard-coded** the direction of the residual bias as a string constant, which the rewritten script now
computes. See D5 for what happened when someone finally checked the hard-coded claims.

---

## D5. "Missing abstracts track older, non-English, book-chapter records: Érudit's exact profile." Backwards.

**Date found:** 2026-07-11, by adversarial review, before submission.

This sentence was hard-coded as prose in `pilot/11_base_rate_robustness.R`, three lines above the script's own
comment boasting that *"the direction of the residual bias is COMPUTED, not asserted. An earlier version hard-coded
this string, which in a metaresearch project is indefensible."*

I did the indefensible thing in the same file where I said it was indefensible. Checked against the data:

| claim | data | verdict |
|---|---|---|
| **older** | no-abstract mean year **2013.7** vs has-abstract **2010.3** | **BACKWARDS.** They are 3.3 years *newer*. |
| **non-English** | P(no abstract \| English) = **32.0%**; P(no abstract \| non-English) = **12.7%** | **BACKWARDS.** English works are 2.5x *more* likely to lack an abstract. |
| book chapter | 70% of book chapters lack abstracts, vs 31% overall | true |

The no-abstract stratum is **99.0% English**. The claim inferred a *francophone* platform's profile from a stratum
that is almost entirely anglophone. The sentence is deleted, not softened.

---

## D6. "The pipeline is 3.6x blinder to STS and LIS." Four records, and not statistically significant.

**Date found:** 2026-07-11, by adversarial review, before submission.

This was the proposal's answer to the **inclusiveness** criterion: the claim that, unable to *represent* the field's
traditions, I could at least *measure how badly I serve them*.

The cell counts:

| tier | no abstract | has abstract |
|---|---|---|
| T1 | 10 | 30 |
| T2 | **4** | 31 |

- T1 "loses 1.4x": 95% CI **0.68 to 2.81**, Fisher p = 0.494. Indistinguishable from no penalty at all.
- T2 "loses 3.6x": 95% CI **1.26 to 10.07**. An eightfold range, reported in the proposal as a point estimate.
- **The interaction is not significant**: `glm(isT2 ~ has_abs)` on the 75 positives gives coef 0.949, se 0.645,
  **p = 0.141**. There is no evidence T2's penalty differs from T1's.
- Move one record and 3.6x becomes 4.75x or 2.85x.

**The differential claim is withdrawn.** What survives is the **main effect**, which is real and survives adjustment
for publication year and language (adjusted OR 2.21, p = 0.009): the screen finds half as much metaresearch where
there is no abstract, and 31.5% of the frame has no abstract. That is a genuine coverage problem. It is not,
on this evidence, a *differential* one, and the proposal no longer says it is.

---

## D7. The cost model charged the rubric once per work. The pilot's own calls batch 155 works per call.

**Date found:** 2026-07-11, by adversarial review, before submission.

`pilot/13_screening_cost.R` measured the per-work payload from the pilot's real chunk files and then modelled cost
as **one full rubric per work**. But those same chunk files bundle a **median of 155 records per call**. The rubric
is a system prompt: it is sent once per *call*, not once per *work*, so it amortises 155-fold.

| assumption | full frame, two screeners | vs the grant |
|---|---|---|
| 1 work/call (what the script did) | **$24,379** | 8.4x |
| 20 works/call | $5,627 | 1.9x |
| **155 works/call (the pilot's own batching)** | **$4,767** | **1.6x** |

Prompt caching would reduce it further. The script read the pilot's artifacts to measure the payload and then
ignored what the same artifacts said about batching.

**The conclusion survives: $4,767 still exceeds a ~USD $2,900 grant, so the two-stage design is still required.**
The rhetoric does not. "Eight times this grant" was overstated by a factor of five and is corrected to 1.6x.

---

## D8. Capture-recapture (abandoned, 2026-07-10)

Ran it; it estimates 467,541 Canadian metaresearch works, implying Canada produces 59% of the world's metaresearch
against an observed 1.9%. The retrieval routes are not independent captures of a closed population, so the unseen
cell is not identified and the estimator is not even a safe lower bound. **Cut**, rather than dressed up as a bound.

---

## D9. `protocol/screening-schema.json` is referenced by the rubric and does not exist.

`protocol/rubric.md` instructs the screener to "return the schema in `protocol/screening-schema.json`". No such file
is in the repository. The schema was inlined in the prompts instead. Fixed by writing the file the rubric points at.

---

## D10. The prompts were not archived, though the proposal claims they are.

The proposal says "I archive and release the **exact prompts and raw model outputs**." The raw model outputs are in
`pilot/screening/`. The **prompts were not committed**: `pilot/run_screener_b.sh` takes a `<prompt-dir>` argument
that is not in the repository. Fixed by archiving the prompt templates under `pilot/screening/prompts/`.

---

## D11. A withdrawn finding kept publishing itself, because the findings store could only grow.

**Date found:** 2026-07-12, before submission.

`R/findings.R::record_finding()` is an accumulator: load the JSON, set one key, write it back. So `findings.json`
only ever **grows**. When a script is rewritten under a new key, or deleted because its result was retracted, the
old finding stays in the artifact forever, with nothing in the repository that produces it.

That is not hypothetical. The Haiku experiment was first analyzed by a script that recorded `haiku_and_payload`,
whose headline claimed the withheld metadata "moves the base rate from 1.27% to 7.5%." That payload effect was
measured on an arm that had to be **discarded**: one agent reported, per chunk and in a detailed table, that it had
written six label files, and **none of the six existed**. (The same event is why the first analysis run produced
numbers that could not be reproduced twenty minutes later; the labels it had read were from files since vanished.)
The script was replaced by `pilot/16_agent_variance.R`, which refuses to report that arm. The retracted numbers
**stayed in `findings.json`**, still being served, still true-looking, including a `haiku_dropped_p8 = 0` that is
false on its face.

An artifact that cannot un-say something will eventually publish something already retracted. Fixed structurally,
not by deleting the one entry: `make pilot` and `make pilot-offline` now **delete `findings.json` and rebuild it
from empty**, so a finding exists if and only if a script in the repository computes it.

The agent-fabrication event itself is material for the proposal, not just this file: it is D2 (a harness silently
losing records) escalated from *omission* to *invention*, and it happened inside a metaresearch pilot whose subject
is instrument failure. Screening at scale with agents requires verifying agent outputs against the filesystem, not
against the agent's own report.

---

## D12. The script written to catch hard-coded numbers hard-coded two numbers.

**Date found:** 2026-07-12, before submission.

`pilot/16_agent_variance.R`'s first draft interpolated every statistic into its recorded headline **except two**:
it typed "six found zero metaresearch" where the computed value is **5**, and its caveat typed "p = 0.136" where
the computed value is **0.113** (both drifted when the analysis was re-run on stable data; the prose did not).
It also typed the between-model spread as a literal `2.2` instead of computing it from the same 1,290 works.

This is D5's failure mode, repeated in the very script that exists because of D4 and D5, three findings after
swearing it off. The pattern survives good intentions; only structure removes it. All three values are now
computed and interpolated, and none of the headline's numbers is a literal.

---

## D13. Finding 16's between-agent test was confounded, and its comment claimed a verification that never existed.

**Date found:** 2026-07-12, by external adversarial review, before submission.

The first draft of `pilot/16_agent_variance.R` compared three agents' in-scope rates with a plain chi-square and
wrote, in a comment: *"Chunks are arbitrary slices of one stratified sample (verified: the strata are mixed across
chunks, not blocked)."*

**No such verification existed anywhere in the script, and the claim is false.** The stratum mix differs by agent
at p = 1.3e-17: agent-1's package was 59.6% boundary works, agent-2's was 28.5%. So the unadjusted test confounds
"agents apply different thresholds" with "agents received different packages." The reviewer computed in minutes
what the comment claimed had been checked.

Two aggravations. First, the word "verified" attached to a check never run is a worse sin than the missing check:
it forecloses the question. Second, this happened inside the finding whose subject is instrument unreliability.

**The correction strengthened the finding rather than killing it,** which is recorded here with the same care as
if it had gone the other way. Conditioning on stratum (Mantel-Haenszel, and a within-stratum permutation test),
the heterogeneity survives in both arms; in the first arm the adjusted p (0.0056) is smaller than the confounded
one (0.023): the confound was masking the effect. The same review also caught that the headline's "13.2x
design-weighted spread" rests on five high-weight events in one agent; it is demoted to a recorded, leverage-
sensitive descriptive, and the claim now rests on the raw spreads (3.1x and 5.2x) and the adjusted tests. The
Jaccard overlaps are now reported both unweighted and design-weighted, because the weighted versions are worse and
reporting only the flattering estimand next to weighted rates was itself a defect.

---

## D14. I wrote the conclusion of finding 18 before running it, and the data refuted it.

**Date found:** 2026-07-12, by the data, before submission.

`pilot/18_funder_route_recall.R` tests the CA-FUND route against CIHR's own database of 44,190 funded projects.
Before running it I wrote, in the script's own header, the interpretation I expected:

> *"Even ONE paper per project is a deliberately conservative floor. So CIHR-acknowledging Canadian publications
> should number in the hundreds of thousands... The gap is not noise."*

**The result was 178,133 works: 4.03 publications per funded project.** That is a perfectly plausible publication
rate for a health-research grant. **There is no CIHR under-tagging gap, and the sentence I had already written was
false.**

Two things are wrong here and only one of them is the number.

1. **I wrote the finding before the evidence.** That is the same motivated-reasoning pattern this project has now
   documented eleven times, and the only reason it was caught is that the number refused to cooperate. Had it come
   back at 0.4 per grant I would have shipped the sentence without noticing I had pre-committed to it.
2. **The instrument was wrong regardless of the answer.** Papers-per-grant divides tagged works by funded projects,
   two quantities that are **not linked record to record**. It is the retracted 32.4% coverage figure (D3) in a new
   costume: a quotient of incommensurable things, read as performance. Even a "bad" result would have meant nothing.

The expectation is left in the script rather than deleted, and the refuted ratio is still reported. What replaces it
is a bound that needs no hypothesis of mine to be true: **71.2% of the frame carries no funder metadata at all**, and
**65.9% of Canadian-affiliated works carry none**. That is CA-FUND's ceiling, it is measured rather than inferred,
and it is a stronger finding than the one I went looking for.

A record-level recall estimate requires grant-to-publication linkage, which finding 21 builds. Until then, no recall
point estimate for CA-FUND is claimed.

---

## D15. I did it again, ninety minutes later, and the data refuted me again.

**Date found:** 2026-07-12, by the data, before submission.

`pilot/19_abstract_cascade.R` chases the abstract gap through three sources. I designed the cascade around a specific
argument, and wrote it into the script header **before running it**:

> *"Crossref is in the cascade specifically because the first two are biomedical. A cascade of biomedical indexes
> would close the gap unevenly and make the map's residual bias MORE discipline-shaped... Crossref is the
> load-bearing link."*

**The argument was right. The remedy does not exist.**

| source | abstracts recovered |
|---|---|
| PubMed | **180** |
| Europe PMC | 7 |
| **Crossref** | **2** |

Publishers largely do not deposit abstracts to Crossref. The discipline-agnostic rescue I built the whole cascade
around **recovered two abstracts out of 189**.

This is D14's error repeated within the same working session, which is the part worth recording. Twice in ninety
minutes I wrote the interpretation into the script before the script had run, and both times the only thing that
caught me was a number that refused to cooperate. **The habit survives knowing about the habit.** That is now the
eleventh and twelfth instances of the same pattern in this project, and it is the strongest argument I have for why
the human audit is the study rather than an appendix: my priors are not neutral, they have never once run against
me, and no amount of self-awareness has fixed that.

**What the data actually supports is worse than what I went looking for**, which is also becoming the pattern. The
gap is not a metadata failure that a better index repairs. It is **structural**:

| | recovery |
|---|---|
| reviews | **91.2%** |
| articles | 40.5% |
| book chapters | **6.2%** |
| letters | **0.0%** |
| English | 38.8% |
| French | **15.4%** |

The works with no abstract are disproportionately the works **no abstract service covers at all**. The residue is
humanities-shaped, book-shaped and francophone-shaped: exactly the material an inclusive map of Canadian
metaresearch exists to include. The cascade is kept (it cuts title-only exposure from 23.3% to ~14.5% of the frame),
the Crossref claim is withdrawn, and the finding now leads with the structural result instead of the fix.

---

## D16. The finding that came out at 52.6% next to a 44.5% headline, and was a coincidence between two populations.

**Date found:** 2026-07-12, by a check I nearly did not run, before submission.

**This is the closest this project has come to publishing a fabricated result, and nothing caught it except a
disambiguation I had no incentive to perform.**

`pilot/21_trial_linkage.R` measures whether the Canadian frame holds the publications of Canadian clinical trials.
The reference standard is ClinicalTrials.gov: completed trials with a Canadian location, and the result publications
the **sponsors themselves** reported. It is the only reference standard in this project not made of machine labels.

The first number out of it:

> **Frame recall: 52.6%** (95% CI 46.9 to 58.4). 160 of 304 known trial publications.

This proposal **opens** on a prior result of mine: an automated trial-to-publication linkage pipeline that recovered
**44.5%** of what two human reviewers found. **52.6% against 44.5%, on the same kind of task, is a perfect echo, and
the paragraph wrote itself in my head before the script had finished printing.** It would have been the single most
rhetorically effective number in the submission: *"the failure I opened with, reproduced on Canadian data, against my
own new instrument."*

**It is a coincidence between two different populations.** Of the 145 apparent misses:

| | n |
|---|---|
| in OpenAlex, **no Canadian author at all** | **137** |
| in OpenAlex, has a Canadian author, frame missed it | **8** |
| not indexed by OpenAlex | 0 |

**A trial with a Canadian site is not a publication with a Canadian author.** Multi-site international trials recruit
at a Canadian hospital and publish with no Canadian author on the paper. A frame of *Canadian research* is **correct**
to exclude those. Counting them as misses measures the registry's definition of Canada, not the frame's.

Against the population the frame actually claims, recall is **95.2%** (95% CI 90.8 to 97.9). **The frame is good at
this.** The real finding is the **8** route-gap works, which is a genuine and actionable defect, and a far less
exciting one.

Three things are worth recording, and the third is the reason this entry is long.

1. The naive figure is kept in `findings.json` as `naive_frame_recall_pct`, flagged `naive_recall_is_an_artifact`,
   so the retraction is auditable rather than invisible.
2. This is the **third** time in one session that a number I expected, or wanted, was refuted by the data (D14, D15,
   D16). Two of those refutations ran *against* my thesis and one ran *for* it. The one that ran *for* it is this one,
   and it is the only one I would not have caught by accident, because a flattering-to-the-thesis result creates no
   friction and invites no second look.
3. **Every incentive I had pointed away from running the disambiguation.** The naive number was dramatic, on-message,
   and defensible-sounding. That is exactly the condition under which a researcher does not check, and it is the
   condition this entire project exists to argue is unsafe. I have now demonstrated it on myself, which is worth
   more to the proposal than the fake 52.6% ever was.

---

## D17. The screening payload was unreadable by the agents that had to read it, and five of them said so.

**Date found:** 2026-07-12, reported independently by five screening agents, before submission.

`pilot/make_frame_sample.R` wrote each 50-work chunk as **minified JSON: a single line of ~29,000 tokens**. The Read
tool caps a call at 25,000 tokens and pages by *line*, so no offset could return it. The payload the agents were
instructed to classify **could not be reached with the tools they were permitted to use.**

All five Opus agents hit it, all five worked around it by shelling out to a pager, and **all five reported the
deviation unprompted**, each noting they had used a tool the instructions did not authorise and explaining exactly
why. None of them silently gave up, and none of them quietly labelled records they had not seen.

Two things follow, and the second is the uncomfortable one.

1. **It is a harness bug, and it is fixed.** Chunks are now pretty-printed. A payload an agent cannot read within its
   tool constraints is a defect in the instrument, not in the agent.
2. **Had they not reported it, I would have been comparing three models on a task whose input was reachable only by
   side channel** — and I would never have known, because the labels would have looked fine. The only reason this is
   in the record is that the agents volunteered it. The harness could not see it: the validator checks that labels
   reconcile against the manifest, and they did. **A completeness check cannot detect a payload nobody could read.**

**The 2,000-work sample therefore contains one difference between its halves:** works 1–1,000 were sent as minified
JSON, works 1,001–2,000 as pretty-printed JSON. The *content* is byte-identical after parsing; only whitespace
differs. That is almost certainly immaterial, and "almost certainly" is not a standard this project accepts, so
`pilot/22_three_model_screen.R` **tests whether the halves differ before pooling them** and reports the test rather
than assuming the answer.

---

## D18. GPT-5.6 broke the locked output contract twice, and the second time it edited a primary key.

**Date found:** 2026-07-12 (both events), by the manifest validator, before submission.

### Event 1: genre values in the `tier` field

In its first pass over the 1,000-work sample, GPT-5.6 (high reasoning effort) wrote **genre values into the `tier`
field** on **18 of 1,000 records**, in 3 of 20 chunks: `tier: "empirical"`, `tier: "conceptual"`,
`tier: "editorial/commentary"`, `tier: "other"`. The `tier` field has exactly four legal values (T1, T2, T3, OUT) and
the prompt states them.

The three chunks were **re-run, not repaired** — coercing a model's malformed output to the schema invents a judgment
the model did not make — and **the re-run came back clean**, so the violation is **not deterministic**.

### Event 2 (the serious one): it silently rewrote a work's ID

On the second tranche, chunk 26 came back with an id set that did not match the input:

| | |
|---|---|
| sent to the model | `W295956950` |
| returned by the model | `W2959569508` |

**GPT appended a digit to a primary key.** `W295956950` is a real, valid OpenAlex id (a Canadian lobster research
centre, which another screener labelled independently). The model appears to have judged the id malformed — most
OpenAlex ids are longer — and *fixed* it. Chunk 34 simultaneously carried another genre-in-tier violation.

**This is the most dangerous failure mode observed in the project**, and it is worth being precise about why.

A wrong *label* is visible: it sits in the tier column, it can be audited, and a human adjudicator will see it. A
wrong *identifier* is invisible. The record would have failed its join silently, dropped out of the analysis without
an error, and **shrunk the denominator by one** — which is exactly DEVIATIONS.md D2 (465 records silently lost), and
exactly D11 (an agent reporting files it never wrote). It is the same failure in a third costume: **the harness
believing what the model said about the data instead of checking it.**

Nothing about the label was wrong. Everything about the *record* was.

### What follows

1. **The validator caught it only because it checks the id SET, not just the count.** A completeness check that
   counted 50 in / 50 out would have passed this chunk. `pilot/validate_frame1k_labels.R` uses `setequal()`, and that
   choice is the only reason this entry exists rather than a silent -1 in a denominator.
2. **Never let a model round-trip an identifier it can "improve".** The full screen must join labels back to the
   input by *position within a manifest*, and must treat any id the model returns as *evidence about the model*, not
   as a key.
3. **Frontier models violate locked output contracts at a measurable rate** (~1.8% of records in one pass, twice
   across two tranches, non-deterministically). A screening pipeline that *assumes* schema compliance is assuming
   something empirically false. Validate; do not trust.

The violation rate is reported in finding 22 rather than hidden: it is a property of screening at scale, and the full
study must budget for re-runs.

---

## D19. I wrote the "3100%" bug a third time, in a script whose comments warn about it.

**Date found:** 2026-07-12, in my own output, before submission.

`pilot/22_three_model_screen.R` printed a table with a percentage column reading **5100** and **4300**.

The cause is D4's, exactly:

```r
summarise(n = n(), any_in = sum(any_in), pct = round(100 * mean(any_in), 2))
#                  ^^^^^^^^^^^^^^^^^^^^ replaces the logical column with a scalar
#                                        so mean() returns the count, and pct = 100 x count
```

dplyr evaluates the expressions **sequentially**. Naming a `summarise()` output after its input replaces the column
mid-statement, and every later reference gets the scalar.

**This is the third time.** The first published "3100%, 2900%, 1500%" as base rates (D4). The second was a throwaway
query the same afternoon, minutes after I had written a comment in the fixed script swearing off it. This third one
is in a script that *quotes that comment*.

I am no longer treating this as a mistake. **It is a property of me**, and of the API, and the only thing that has
ever stopped it is a check that runs.

### The rule that runs

`pilot/check_self_masking.R`, wired into `make pilot` and `make pilot-offline` as a `lint` prerequisite: **the name on
the left of `=` inside `summarise()`/`mutate()` may not appear inside an aggregate on the right of that same `=`.**
Verified two ways: clean on the current tree (43 R files), and it **fails the build** when the bug is deliberately
re-introduced.

One detail worth recording, because it is the reason the guard is trustworthy. **The first version of the check
flagged two hits, and both were the warning comments** in the scripts that already knew about the bug. A guard that
cannot tell code from a comment *about* code is not a guard; it is a false-alarm generator that trains you to ignore
it. It strips strings and comments before matching.

**The affected number never left the script.** The 5100% was a diagnostic printed to the console during a run, not a
recorded finding; `findings.json` carries the tranche p-value, not the malformed percentage. But it would have
reached a reader if the table had been the thing I quoted, and the only reason it did not is that I happened to look
at the console. That is not a control.
