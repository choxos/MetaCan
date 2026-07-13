# Deviations, errors, and corrections

`docs/protocol/PROTOCOL.md` §9 says: *"Any departure from this protocol will be recorded in `DEVIATIONS.md`, with a
reason and a date. Silent revision is itself a research-integrity failure, and this is a metaresearch project."*

This is that file. It is written before submission, not after. Every entry cost me something to write.

Numbering matches the pilot findings where relevant. Nothing here has been quietly rolled into a rewrite.

---

## D1. The pilot screen violated the locked rubric. It saw six of the eight fields the rubric mandates.

**Date found:** 2026-07-11, by adversarial review, before submission.
**Severity:** the most serious defect in this project.

`docs/protocol/rubric.md` (the locked instrument) tells the screener:

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

## D9. `docs/protocol/screening-schema.json` is referenced by the rubric and does not exist.

`docs/protocol/rubric.md` instructs the screener to "return the schema in `docs/protocol/screening-schema.json`". No such file
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

---

## D20. The locked instrument specifies two different vocabularies for the same field, and nothing caught it for 6,000 labels.

**Date found:** 2026-07-12, by a screening agent, in one clause of a report about something else.

An Opus screening agent, working chunks it had been given for an unrelated reason, ended its report with a
parenthetical: *"the rubric's genre vocabulary and `screening-schema.json`'s genre enum disagree; the schema has no
`conceptual`, `policy`, or `infrastructure/announcement` value, so I mapped conceptual/theoretical work to `other`.
That is a defect in the locked instrument, not a screening choice."*

It was right. A second agent, independently, reported the same thing.

| document | the `genre` values it names |
|---|---|
| `docs/protocol/rubric.md` (what screeners are told to apply) | `empirical` `conceptual` `editorial/commentary` `policy` `infrastructure/announcement` `other` |
| `docs/protocol/screening-schema.json` (what output must conform to) | `empirical` `review` `methods` `commentary` `editorial` `protocol` `dataset` `software` `other` |

**They overlap on two values out of eleven.** Four rubric terms do not exist in the schema; seven schema terms do not
exist in the rubric. Every screener in every arm was handed both documents and told to obey both.

### What each model did with an instrument that contradicted itself

Each one silently invented its own reconciliation, and **they did not invent the same one**:

- **GPT-5.6** and **Grok 4.5** followed the *rubric*: 100% legal against it, and therefore **27.2%** and **22.0%** of
  their labels are **illegal against the schema they were told to conform to**.
- **Opus** followed *both at once*, drawing from either list depending on the record, emitting **13 distinct values**.

### Why it survived

`validate_frame1k_labels.R` reconciles the id set against the manifest and checks that `tier` is one of T1/T2/T3/OUT.
**It never checked `genre`.** So the field was free to be anything, and it was.

Nothing crashed. No file was malformed. Every arm passed every check that ran. The variable simply **meant a different
thing in each arm**, and the variance it produced would have been read as *model disagreement*, which is the exact
quantity this project exists to measure. An instrument that contradicts itself does not announce itself. It produces
variance and lets you blame the models.

### What is done, and what is deliberately not done

The genre labels from this screen are **reported as unusable** and are used for nothing downstream (finding 24).

**They are not remapped.** Coercing three arms into a common vocabulary after seeing how they diverged would destroy
the only evidence that they diverged, and it would be a researcher degree of freedom exercised on the data whose
disagreement is the result. The tier analysis is unaffected: `tier` was validated from the start.

The fix belongs in the **instrument**, at a version boundary (rubric v2, seam 11), and the general fix is the one this
project keeps arriving at: **a locked instrument must be machine-checked against its own schema before any model
runs.** A codebook is code. It gets a test.

---

## D21. Ten parallel agents shared one scratchpad, and overwrote each other's helper scripts.

**Date found:** 2026-07-12, reported unprompted by a screening agent.

The ten Opus screening agents each write a small helper script to turn a chunk into label JSON. They all run in the
same session and therefore share one scratchpad directory. At least one agent's helper was **overwritten mid-run by
another agent's file of the same name**; the agent noticed, moved its working files into a private subdirectory, and
said so.

**No label file was corrupted**, and the manifest validator would have caught it if one had been: every arm reconciles
by set equality on the ids. But it is luck that the collision hit a helper and not an output, and the collision was
invisible to every check in the pipeline.

**Consequence.** Parallel agents that write anything must be given **disjoint working directories by construction**,
not by convention. The label files themselves are already safe because they are named after the chunk, which is unique
by design. The lesson is the one D11 already stated and this is a second instance of: *an agent cannot corrupt a file
it was never allowed to write*, and the harness, not the agent, should be the thing that guarantees it.

---

## D22. The sampling design could not reach 12.9% of the frame, and the hole was exactly where the secondary estimand lives.

**Date found:** 2026-07-12, by an adversarial model I asked to attack the design. It found it by adding up five numbers I had handed it in a summary table. I had not added them up.

I gave GPT-5.6 a design brief that listed the strata and their weights, and asked it to attack the classifier proposal. Its first move was arithmetic:

```
2000 x 1119.0 + 1000 x 664.2 + 750 x 536.8 + 750 x 310.9 + 500 x 335.8 = 3,705,875
frame = 4,299,418
gap   =   593,543   (13.8%)
```

It was right. The measured hole, checked against the data, is **549,370 works, 12.9% of the sampling frame**, and it is two independent defects stacked on top of each other.

### Defect 1: the strata did not meet in the middle (366,856 works)

```
aff_core   = route_ca_aff   AND language='en' AND NOT route_about_ca
about_only = route_about_ca AND NOT route_ca_aff AND ...
```

Read them together. `aff_core` throws away everything **about** Canada. `about_only` throws away everything **affiliated with** Canada. So a work that is **both** is claimed by **neither**.

That is not a random slice of the frame. **It is precisely where the secondary estimand lives.** The secondary estimand of this study is *"metaresearch about the Canadian research system"*, and the design had a **zero probability of ever sampling a Canadian-affiliated work that is about Canada**. It would have reported a number for that estimand anyway.

### Defect 2: SQL three-valued logic ate 182,514 more, silently

388,446 works carry a NULL `route_ca_venue`; 54,161 a NULL `language`. In SQL, `NOT(NULL)` is `NULL`, not `TRUE`. So for those rows the stratum predicate evaluates to NULL, and a NULL predicate is selected by

```sql
WHERE (covered)       -- no
WHERE NOT (covered)   -- ALSO no
```

The row is in no stratum **and is not even an orphan**. It is **invisible**. It never appeared in a count, never failed a check, never threw. This is why `sum(strata)` and `count(orphans)` did not add up to the frame, and why nobody noticed that they did not add up.

### Why nothing caught it

Nothing failed. Every script ran green. **Every stratum returned exactly the `n` it asked for**, because there were always enough works matching the predicate; a stratum has no way to know about the works it was never asked about. The design drew a clean, valid, textbook stratified probability sample **of 87% of the frame**, and every number computed from it said *"the frame"*.

A work with inclusion probability zero **is not underweighted. It is unreachable.** No reweighting recovers it, and no design-based estimator is defined over it. Design weights are the thing this project leans on hardest ("unbiased however noisy the stratifier is"), and that guarantee is void over a zero-probability region.

### The fix

`R/strata.R` now holds the stratification in one place. The five original predicates are kept **byte-for-byte**, because 5,000 works were already drawn from them by hash order and a hash-order draw is a probability sample *of the set it was drawn from*: widening a stratum would silently re-draw it and the labels on disk would stop matching the design that selected them.

So the hole is closed **from outside**, with two new strata defined as the exact NULL-safe complement (`IS NOT TRUE`, which catches FALSE *and* NULL):

- **`aff_about`** (328,912 works): Canadian-affiliated **and** about Canada. The cell defect 1 deleted, and the home of the secondary estimand. Drew 400.
- **`residual`** (220,458 works): everything else the five predicates could not see, including every work whose membership was NULL. Drew 200.

The seven strata now partition the sampling frame **by construction**: 4,255,410 = 4,255,410, pairwise disjoint, none empty. 600 new works drawn, chunks 101 to 112, screened by all three arms.

### The rule that runs

`pilot/check_strata_partition.R`, wired into `make lint` as a prerequisite of every build. It asserts **exhaustive** (`sum(N_h) == N`), **disjoint** (pairwise, checked against the data, not assumed from precedence), and **nonempty**. Verified both ways: it passes on the repaired design, and it **fails on the design as it actually shipped**, printing the exact 549,370.

### What I take from this

The check that catches this is **one line of arithmetic**. It is the first thing anyone should do to a stratified design and I never did it, through a whole session of writing careful comments about how rigorous the design was. The comments were the problem: they made the design *feel* checked.

It also fits the pattern this project keeps finding, and this is the sharpest instance yet: **every defect that survives is the one that flatters you.** A design that quietly covers 87% of the frame produces *smaller, tidier, more confident* numbers than one that covers all of it. There is no friction to warn you, because the output looks better, not worse.

---

## D23. The best line in the project did not replicate, and a bigger sample is what killed it.

**Date found:** 2026-07-12, by extending the sample I had already drawn a conclusion from.

At n = 2,000, this project found something clean. Ask three models a coarse question (*is this work about research at all?*, T1/T2/T3 vs OUT) and they nearly agree. Ask the finer question the estimand actually needs (*is it in scope?*, T1/T2 vs T3/OUT) and they come apart:

```
n = 2,000     coarse 1.29x     fine 1.62x     ratio 1.26
```

I wrote it in capitals: **THE VARIANCE IS NOT IN THE MODELS, IT IS IN THE RUBRIC.** I put it in a commit message. I told Ahmad it was "the finding that reorders the project."

At n = 5,600 it is gone:

```
n = 5,600     coarse 1.43x     fine 1.51x     ratio 1.06
```

**The two spreads are now within noise of each other.** The models disagree about equally on "is this about research at all" and on "is it in scope." The decomposition does not replicate.

### What actually happened

Nothing was fabricated and nothing was miscoded. It was a real pattern in 2,000 works that is not a real pattern in the population. That is the ordinary way a striking result dies. The only reason it died in-house instead of in the submitted proposal is that **the sample got bigger, and nothing else changed.**

The uncomfortable part: I had every reason not to look. The finding was already written up, already quoted, already the headline. Extending to 5,000 was justified on other grounds entirely (Ahmad asked for it), and the decomposition was not what I was testing. **If he had not asked, the claim would have shipped.**

### What survived

The load-bearing result was true before the decomposition was layered on top of it, and it is stable at every sample size:

| | n=1,000 | n=2,000 | n=5,600 |
|---|---|---|---|
| unanimity among works ANY model calls in-scope | 37% | 37% | **38%** |
| works resting on a SINGLE model's opinion | 47% | 46% | **43%** |
| pairwise Jaccard of the in-scope sets | ~50% | ~50% | **~50%** |
| dominant tier confusion | OUT/T2 | OUT/T2 | **OUT/T2** |

**Rate agreement is not set agreement**, and the field's boundary is a region the models each cut differently. That claim needs no coarse/fine split, and it is what the proposal says. The pretty decomposition was a decoration on a finding that was already load-bearing without it.

### The rule that runs

`22_three_model_screen.R` no longer asserts the claim. It **computes the ratio and branches**: above 1.20 it reports the decomposition, below it prints the withdrawal, with the 2,000-work numbers next to the current ones. If a larger sample ever brings the pattern back, the script will say so on its own. A withdrawn claim that leaves no trace is just a claim you stopped making.

---

## D24. A SECOND rubric/schema contradiction, and this one changes who gets human review.

**Date found:** 2026-07-12, by a screening agent, in a footnote to a report about something else. Again.

D20 recorded that the rubric and the schema name two different vocabularies for `genre`. They also contradict each other on `confidence`, and this one has teeth.

| document | the rule it states |
|---|---|
| `docs/protocol/rubric.md` | "If the abstract is missing, judge on the title alone and set confidence to `low` **unless the title is unambiguous**." |
| `docs/protocol/screening-schema.json` | "The rubric **requires `low` whenever** the abstract is missing and the judgement rests on the title alone." |

**The schema misquotes the rubric.** One says *low unless the title is unambiguous*; the other says *low, always*. These are different instruments.

### Why it is not cosmetic

The rubric routes on this field: *"Records coded `low` by either screener are routed to adjudication."* So a contradiction in the confidence rule **silently changes which records a human ever looks at**, in a project whose entire thesis is that the human audit is the study.

And 33% of the frame has no abstract. So the disputed clause governs a third of everything.

An agent reported the consequence without being asked: *"If another arm followed the schema gloss, my `low` count is deflated relative to theirs by roughly the number of title-only records."* The arms are not measuring the same quantity.

### It is the same root cause as D18 and D20

GPT-5.6's illegal tier values, this run, were `other` and `policy`. **Those are `genre` vocabulary.** The model was handed two documents that disagreed about what `genre` may contain, and the confusion did not stay inside `genre`: it corrupted `tier`, the one field the validator was actually checking. A contradiction in an instrument does not stay in the field it is about.

### Consequence

Quarantined in `docs/protocol/known-defects.json` alongside the genre split, with the same terms: not fixed in place (v1 is locked and 5,600 works were screened against it), fixed at the v2 boundary, and `make lint` fails on any further contradiction. `confidence` from the v1 screen is reported as **not comparable across arms**, and the adjudication queue for the human audit will be defined by the v2 rule, not the v1 ambiguity.

---

## D25. The rubric that fixes the codebook-vs-schema bug reintroduced the codebook-vs-schema bug, and the guard against it failed silently. Twice.

**Date found:** 2026-07-13, by a screening agent, in a footnote to a report about something else. For the third consecutive time.

### The chain

**1. v2 was written to fix D20.** D20 was: the rubric and the schema named two different vocabularies for `genre`, every screener was handed both, and 16,800 labels passed every check because the validator looked at `tier` and never at `genre`. The lesson I wrote down was **"a codebook is code; it gets a test."**

**2. v2 reintroduced it.** v2's new "Records that cannot be screened" section mandates `insufficient_payload` as *"a flag distinct from OUT"* that *"must be reported, not silently dropped."* The schema's tier enum is `["T1","T2","T3","OUT"]`.

> **v2.0 demanded a value its own output contract could not express.**

A screener told to emit a value its contract forbids will emit *something else*, silently, and each screener will pick a different something. Which is precisely D20, committed by the document that fixes D20.

**3. The guard did not catch it, because it was aimed at the wrong file.** `pilot/check_instrument.R` exists for exactly this class of bug. It reads `RUBRIC <- "docs/protocol/rubric.md"`. **v2 is a new file.** The guard ran, passed, and reported "the instrument is self-consistent" without ever having looked at the instrument that shipped.

**4. I fixed the path, and the guard STILL did not catch it.** The new check appended its finding with:

```r
problems <- c(problems, glue("the rubric DEMANDS the value{?s} ..."))
```

`{?s}` is **cli** pluralization syntax. Inside `glue()` it is evaluated as R's `?s`, the help operator, which returns `character(0)`. So `c(problems, character(0))` appended **nothing**, `problems` stayed empty, and the guard printed:

```
✔ the instrument is self-consistent
```

**while holding an unreported contradiction in a variable it had just declined to fill.**

### What this actually is

A guard against silent contradictions, failing silently, in the guard whose entire purpose is to make failure loud. It did not error. It did not warn. It printed a green check.

This is the fourth distinct instance of one pattern, and by now I take it as a property of the system rather than a run of bad luck:

| | the failure | how it stayed alive |
|---|---|---|
| D4 / D19 | dplyr self-masking | printed a plausible-looking number |
| D18 | GPT edited a primary key | a wrong id is invisible; a wrong label is not |
| D20 | two genre vocabularies | the validator checked a different field |
| **D25** | **guard didn't run, then didn't report** | **it printed a green check** |

Every one of them **produced output that looked correct**. None of them threw. The through-line is not carelessness; it is that a defect which announces itself gets fixed on the spot and never reaches a deviations file. **The ones that survive to be written down are, necessarily, the ones that looked fine.**

### The rules that now run

- `check_instrument.R` reads **the current rubric**, not a hardcoded path: `if (file.exists("docs/protocol/rubric-v2.md")) ... else ...`. A guard that inspects a document nobody is using is theater.
- It checks **both directions**: not only "does the rubric define every value the schema allows?" (which passed all along) but "**can the schema express every value the rubric demands?**" (which is the one that was missing, and is the one that matters, because the codebook is upstream of the contract).
- No cli pluralization inside `glue()`, ever. The specific bug is now impossible to reintroduce in this file because the message is built with `paste0()`.
- Verified both ways: the guard **fails** on v2.0 as written, naming `insufficient_payload`, and **passes** on v2.1 after the schema was amended to carry it.

### What is NOT done

**The 179-work v2 re-screen ran under v2.0**, with the contradiction present. The screening agent hit it, could not emit the value, and encoded the three affected records as `OUT` with `insufficient_payload` at the head of the reason string so they would be recoverable. Those labels are **not** retroactively rewritten, and finding 29's numbers are the numbers that run produced. Saying so is cheaper than a re-run and more honest than a silent patch.

---

## D26. For twenty-nine findings, the definition of metaresearch was mine, and I never said so.

**Date found:** 2026-07-13, by Ahmad, who asked whether the project could "have a category for detecting Canadian-related meta-research based on the definitions from" Ioannidis, *Meta-research: Why research on research matters* (PLoS Biol 2018;16:e2005468).

The question exposed something nobody had noticed, including me. **The rubric cited nobody.** Its definition of metaresearch,

> "how research is done, reported, funded, evaluated, disseminated, or governed"

is **six verbs I chose**. Not a citation, not a standard, not the field's own account of itself. My invention, presented in a locked instrument, against which 16,800 machine labels were produced and 29 findings computed.

That is an uncomfortable place for this project in particular to have been standing. Its central finding is that **the definition was underspecified and every screener was privately inventing the missing sentence**. It never occurred to me to ask who had written the sentences that *were* there.

**A reviewer had no way to check the instrument against anything except my judgment.** That is the failure. Everything else in this repository is built so that a claim can be checked against something external: the frame against a pinned snapshot, the strata against an arithmetic identity, the numbers against the pilot, the boundary against a blinded judge. The definition at the root of all of it was checkable against nothing.

### The fix, and the trap in the fix

**Rubric v2.2** anchors T1 to Ioannidis's five domains, with the citation:

> *methods · reporting · reproducibility · evaluation · incentives*

Every T1 record now carries a `domain`. The definition is external and citable, and `check_instrument.R` enforces the rubric and the schema agreeing about it **from the day the field was created**, which is the D20 and D25 lesson applied *before* anyone screens against it rather than after 16,800 labels.

**But adopting Ioannidis alone would have been a worse error than the one it fixes.** His is a *metascience* definition. The call for proposals **names other traditions explicitly**: bibliometrics and scientometrics, science and technology studies, scholarly communication research, open science research. An STS scholar does not describe their work as "meta-research" in Ioannidis's sense.

Narrowing the map to the five domains would therefore have **deleted exactly the traditions the challenge's inclusiveness criterion exists to protect** — and **OUT-vs-T2 is already the largest tier confusion in our data at every sample size.** It is the same seam, one level up: an authoritative definition is still someone's definition, and adopting it uncritically is how a map loses the communities at its edge.

So: **the five domains are T1's spine. T2 keeps the traditions the call names.** Both are in the map; only T1 is pooled into the canonical corpus. The rubric now says which authority governs which tier, and why, instead of quietly being me.

### What I take from this

Every guard in this repo was built to catch a claim that could not be checked. The **root definition** was not checkable, for the entire life of the project, and no guard could have caught that because a guard can only check a document against another document. **It took a human asking "where does this come from?"**

That is the argument for the human audit, arriving from an unexpected direction and pointed at me.

---

## D27. I sold a measurement of model disagreement as a measurement of the field's disagreement.

**Date found:** 2026-07-13, by an adversarial review I asked for, one day before submission.

Ahmad supplied the literature that grounds the definition of metaresearch. Reading it, I found three papers that appeared to say, in print, what I thought were *our* findings:

- **Puljak et al. 2020**: 175 published sources, *"definitions of meta-epidemiological studies varied"*, *"research community would benefit from consensus"*.
- **Kataoka et al. 2023**: a published dispute with Puljak, naming *"the currently confusing nomenclatures"*.
- **Stevens & Laynor 2023**: meta-research *"presents a significant challenge for identifying published meta-research studies"*; **no MeSH heading** exists for it.

I was delighted, and I wrote this into the proposal:

> **"This is not an artifact of my rubric. It is the field's condition, and the field says so in print."**
> **"This project is the first to quantify what that costs."**

**Both sentences are overclaims, and the second is unverifiable.** The reviewer put it exactly right:

> *"Puljak/Kataoka/Stevens establish **human/literature** definitional mess. Your pilot measures **three LLMs disagreeing under one rubric**, with a fourth LLM naming seams. Those are not the same estimand."*

**They are not.** A reviewer can grant the literature entirely and still say: *you quantified model disagreement, not the field's cost of non-consensus.* And they would be right. The bridge from "three models split" to "the field's boundary costs X" runs through **human coders**, and the human coders do not exist yet. That is the whole reason the audit is the study.

### The pattern, again, and it is the one this project is about

The literature did not change my evidence. It changed how good my evidence *felt*, and I promoted it. **A finding that arrives as corroboration is the most dangerous kind**, because it produces no friction: it agrees with you.

Every deviation in this file has that shape. **The errors that survive are the ones that flatter you**, and an external paper appearing to confirm your result is the most flattering thing that can happen to it.

### What the same review also caught, all of it mine

| what I wrote | why it is wrong |
|---|---|
| *"Every category is defined from its own literature, and cited."* | **False on the page.** Five categories were named but unsourced. A 30-second catch, in a proposal about research integrity. |
| *"This is the answer to the question the call asks."* | The call asks for a **dataset that captures the landscape**. I answered *how to build criteria for a contested boundary*. Related; not the same. |
| *"Unbiased however noisy the stratifier is."* | True **only while every record keeps a nonzero selection probability**, and **my own design had π = 0 for 12.9% of the frame** (D22). I stated unconditionally the exact guarantee my own worst bug had destroyed. |
| *"...matched its own teacher at Jaccard 0.17 **because** those labels are definitionally contested."* | A **causal claim I never tested.** Equally consistent with weak features, short text, and class rarity. |
| *"the residual 83 works, the field's contested core"* | Contested **by three models under one rubric**. Not by the field. |
| `form-answers.md`: *"There are ten entries."* | `DEVIATIONS.md` had **26**. **Stale honesty is not honesty.** |

### The fix

The claim ladder is now stated in the proposal as three rungs, and they are not welded:

1. **The literature** says the field lacks a consensus definition (human claim, cited).
2. **My pilot** says three models cut one rubric differently (machine claim, measured).
3. **Only the human audit** closes the gap between them, and it has not run.

The proposal now says exactly that: *"Those are claims about humans. Mine are claims about models. I do not conflate them."* The priority claim is deleted. The estimator guarantee is conditioned on the assumption my own design violated. The causal story for Jaccard 0.17 is downgraded to one hypothesis among several the pilot cannot separate.

The proposal was also restructured on the reviewer's advice: **lead with the deliverable, box the failures.** Opening a grant with *"it broke repeatedly"* trains a reviewer to score you as high-risk on **feasibility, which is judging criterion #1**. Courageous content, bad allocation. It now opens with what exists on 27 October.

---

## D28. Rubric v3: the hierarchy is deleted, and every category is now defined from its own literature.

**Date:** 2026-07-13. **A versioned rubric change, recorded before it is applied to anything.**

### What was wrong with the hierarchy

v1 and v2 ranked the field: **T1 core / T2 adjacent / T3 contextual**. Two things were wrong with that, and the data found the first before I did.

**1. "Adjacent" is defined by negation.** It means *not-T1*. A category whose only content is *"near the important one"* has no positive definition, so it cannot be applied consistently. And it wasn't: **OUT-vs-adjacent was the largest tier confusion at every sample size we measured.** The models were not failing. **The category was empty**, and every screener had to invent what belonged in it.

**2. It was a value judgment I had no standing to make.** Calling science and technology studies "adjacent" says STS is peripheral to metascience. STS has its own founding literature, its own journals, and its own account of what studying science means. It is not an appendage of anything, and the call names it as a tradition in its own right.

### What v3 does

**Deletes the hierarchy. Multi-label. Seven categories, each with a positive definition quoted verbatim from a source committed to `docs/reference/definitions/`.**

| category | source, read from the PDF |
|---|---|
| `metaresearch` | Ioannidis, Fanelli, Dunne, Goodman. PLoS Biol 2015;13(10):e1002264 |
| `metaepi_narrow` | Murad & Wang. Evid Based Med 2017;22(4):139-142 |
| `metaepi_broad` | Kataoka et al. J Clin Epidemiol 2023;154:219-221 |
| `bibliometrics` | Mingers & Leydesdorff. Eur J Oper Res 2015; Price, Science 1965;149:510 |
| `sts` | Jasanoff (ed.), *States of Knowledge*, 2004; Latour, *Science in Action* |
| `scholarly_communication` | Borgman, *Scholarship in the Digital Age*, MIT Press 2007 |
| `open_science` | UNESCO, *Recommendation on Open Science*, 2021 |
| `research_integrity` | Fanelli. PLoS ONE 2009;4(5):e5738; COPE |

**A work may carry more than one, and that is the point.** A bibliometric study of citation distortion is *both* bibliometrics and metaresearch. Forcing a single label was the bug.

**`metaepidemiology` is coded under BOTH published definitions and flagged where they disagree**, because the definition is **disputed in print** (Puljak 2020: 175 sources, no consensus; Kataoka 2023 disputes Murad). Settling a live dispute between named researchers by fiat would destroy the only evidence of it.

### Two things I refused to do, and one limitation I am recording rather than hiding

**I did not cite from memory.** An adversarial review named plausible references for each category and I could have typed them. In a project whose worst deviation (D26) is that its own definition of metaresearch was **mine and uncited for its entire life**, a recalled citation would have been the single worst thing this document could contain. Every quotation was read from a PDF, and the PDFs are committed.

**I did not narrow the map to the canonical definition.** Ioannidis's five domains are a *metascience* definition; adopting them alone would delete the traditions the call's inclusiveness criterion exists to protect.

**And `research_integrity` is honestly weaker than the rest.** The sources supplied define **what counts as misconduct** (Fanelli: *"behaviours that distort scientific knowledge: fabrication, falsification, 'cooking' of data... Survey questions on plagiarism and other forms of professional misconduct were excluded"*) and **what publication ethics covers** (COPE). **Neither defines "research integrity research" as a discipline**, the way Ioannidis defines metaresearch or Jasanoff defines STS. So that category is defined **by its object**, Fanelli's exclusion of plagiarism is **carried rather than silently widened**, and the gap is on the record instead of being papered over with a confident sentence.

### The guard, and how it caught me twice

`pilot/check_instrument.R` now fails the build if **any category the schema allows is undefined in the rubric**, in either direction. Writing that check immediately caught two live defects:

1. **v3 had no genre vocabulary at all.** I had dropped the section while rewriting.
2. **The guard was still reading v2.** My patch to point it at v3 had silently done nothing, because the repo reorg had already renamed the file and Python's `.replace()` does not complain when it matches nothing. **This is D25 recurring inside the fix for D25.** The rubric path is now resolved by a newest-first `Filter(file.exists, ...)` over the known versions, so forgetting to update one line cannot point the guard at a document nobody is using.

**No number in this project was produced under v3.** The pilot ran under v1.0, the 179-work re-screen under v2.0, and both are kept byte for byte so every figure stays attributable to the text that produced it. v3 is what the full screen runs under, and **the v2-to-v3 difference is reported as a finding**, whatever it turns out to be.

## D29. The rubric's "verbatim" Murad quotation contained a word Murad never wrote.

**Date:** 2026-07-13. **Found by GPT-5.6, a model asked to attack the proposal, hours after v3.0 locked. No screening ran under v3.0.**

### What happened

Rubric v3.0 quoted Murad & Wang (Evid Based Med 2017) defining meta-epidemiology as examining characteristics of clinical studies *"on the observed **treatment** effect"*. The paper says *"on the observed effect"*. One inserted word, and not a neutral one: it **narrowed the definition** (any observed effect became treatment effects only) **while citing the author whose definition it narrowed**. The document containing it opens with the sentence "Nothing here is cited from memory."

The same review pass surfaced three more citation-grade defects, all confirmed against the PDFs: the Kataoka letter is **pages 219-220**, not 219-221 (page 221 is Puljak's reply, the *other side* of the dispute the rubric is careful to keep separate); Puljak analyzed 175 **information sources**, which the proposal had upgraded to "published sources"; and the rubric's gloss placed research integrity outside Ioannidis's *methods* area when his own description of that area ends "research integrity and ethics".

### Why it survived a lock

The lock checked that every category HAD a quotation and a PDF. It never checked that the quotation MATCHED the PDF. I read the sentence from the paper, and somewhere between the PDF and the markdown the word appeared; the mechanism does not matter, because no mechanism was watching. D26 (the uncited definition) was repaired by requiring sources; this is the next failure class up: **a source, cited, quoted almost.**

### The repair

v3.1 corrects the quotation from the PDF, plus the page range, the gloss, and two other misalignments (the funder clause had regressed to a four-funder list the protocol had already retired; the study-design field said "coded for every work" and never listed the values, D20's exact shape). And the class now has a guard: **`pilot/check_quotes.R`** extracts every quoted span from the rubric, attributes it to the source cited beside it, normalizes both sides to a bare character stream (so hyphenation, ligatures and PDF watermarks cannot save or damn a quote), and **fails the build if any quotation marked verbatim is not a substring of its cited PDF**. Sixteen quotations verify; the guard was tested both ways with a planted corruption. A citation is code. It gets a test.

### The recursion, because there is always one

While testing the guard both ways I planted a corruption in the rubric, verified the guard caught it, and restored the file with `git checkout --`, **which reverted every uncommitted v3.1 correction along with the planted one**, silently, back to the v3.0 text containing the Murad error. The guard's next run failed on exactly the quote I believed I had fixed, and I initially read that failure as the *planted* corruption reappearing. The fix for a silent corruption was itself silently destroyed by the tool I used to verify the fix. Everything was reapplied and committed before anything else touched the file; the lesson (commit the repair before you test the guard that checks it) is recorded here because it will bite again.

## D30. The budget spent money the call does not offer.

**Date:** 2026-07-13. **Found by the same adversarial review, reading the call text I had summarized instead of quoted.**

### What happened

The call says, in its own words: *"Funding of up to CAD $4,000 will be available to support **travel, accommodation, and related participation costs** for the selected individual(s)."* The proposal's feasibility paragraph read that as a research budget: it costed the screen at $1,110 and concluded it "leaves ~$1,790 for the coder, who is the study". Compute and coder wages may not be eligible uses at all. The plan's arithmetic was fine; **it was arithmetic about money that may not legally reach the study.**

The same review also caught that my working notes had the judging criteria in the wrong order and missing one: the call lists **methodological rigor first** (then feasibility, reproducibility/openness, inclusiveness, originality/impact, clarity of outputs); my notes had feasibility first and rigor absent. Nothing in the submitted documents enumerated the criteria, so nothing shipped wrong, but the emphasis of the proposal had been tuned against a misremembered rubric, by a project about instruments that get misremembered.

### The repair

`pilot/13_screening_cost.R` now states what the award buys in the call's words, prices the screen at the **locked v3.1 instrument** ($1,279, not the v1-instrument $1,110 the old page quoted), and the proposal says plainly: compute is **self-funded**; the coder is paid from the award **only if the organizers confirm eligibility**, otherwise from in-kind support through the recruitment networks; the no-coder fallback is prespecified either way. The cost finding no longer contains a `left_for_human_coder_usd` field, because the subtraction it performed assumed an eligibility nobody had checked.

## D31. I wrote a guard, it worked, and nothing ran it. The proposal said `make lint` ran it.

**Date:** 2026-07-13. **Found by GPT-5.6 in the final pre-submission review, reading the Makefile against the page.**

### What happened

D29's repair was `pilot/check_quotes.R`: a guard that fails the build if any quotation the rubric marks verbatim is not a substring of its cited PDF. I wrote it. It caught a real corruption. I tested it both ways with a planted error. I committed it. **I never added it to the `lint` target.**

Meanwhile the proposal said, in §2: *"`make lint` fails if the strata do not partition the frame, the codebook contradicts its schema, or a quotation drifts from its source."* The third clause was false. `make lint` ran three guards and none of them was this one. **A reader could have run the exact command the page named and it would have passed a rubric with a corrupted quotation in it.**

### Why this one is the worst of the three

**This is D25 for the third time**, and D25 is itself the guard-against-silent-contradictions failing silently. The pattern is now unmistakable, and it is not about quotes or schemas or strata:

> **Writing a rule is not enforcing a rule. Only a check that RUNS, in the thing that SHIPS, enforces a rule.**

D25 v1: the guard was hardcoded to the wrong rubric version. D25 v2: my patch to fix that silently matched nothing. D31: the guard was correct, aimed correctly, and *not invoked*. Each time the artifact reported success. Each time I had written the words that described the protection, and each time the words were the only thing that existed.

### The repair

`check_quotes.R` is in `lint`. The proposal now names D31 in the same sentence that claims the guard, because a project whose thesis is that unchecked claims rot should not make an unchecked claim about its checks.

## D32. The proposal described two different studies, and I did not notice because each was true.

**Date:** 2026-07-13. **Found by GPT-5.6: "Either 4.3M works receive LLM labels or only 10,000 do."**

### What happened

Two sentences, both correct, describing incompatible designs:

- **"The LLM labels ~10,000 works; a classifier trains on those; inference over 4.3M is cheap."** This is the annotation design the PI proposed, on the premise that LLM-labelling 4.3M works is infeasible on cost and time.
- **"$1,261 every work at full rubric."** This is finding 13, my own cost measurement: the full v3.1 rubric over **all 4,299,418 works** costs **$1,261**.

**The second sentence refutes the first sentence's premise, and both were on the page.** The LLM screen over the whole frame is *affordable*. The classifier was never needed as a cost workaround. I had measured that myself, in D7, and then wrote a proposal that budgeted for the full screen in one paragraph and justified a cheap substitute for it in the next.

### What the classifier is actually for, now that the premise is gone

It survives, but for reasons that have nothing to do with cost, and the proposal now says which:

1. **The audit needs a continuous calibrated score.** LLM tier labels are discrete and uncalibrated; the score-strata need P(category) in [0,1]. Nothing else supplies it.
2. **Rubric revisions cost a pass.** Each full-frame LLM screen is $1,261 and days of wall-clock. The classifier re-scores 4.3M in minutes, so a rubric change can be *tested* before a pass is *spent*.
3. **Frame-wide disagreement mapping.** Running three teachers over 4.3M costs 3x and ~25 days. Per-teacher heads predict **where the three would disagree** across the whole frame from a 5,600-work sample. The contested region is this project's central object, and this is the only affordable way to see it at frame scale.
4. **Learnability is itself evidence about the boundary.** The distillation ceiling (Jaccard 0.17 against its own teacher) was exactly such a finding.

None of these lets it emit a category label, and it does not.

### The lesson, which is not about classifiers

**Two true sentences can describe two different studies.** Every number on the page was checked by `check_proposal_numbers.R`, and the check passed, because the check verifies that each number is *derivable*, not that the numbers describe *one coherent design*. A build guard can catch a false number. It cannot catch a false architecture. That still takes a reader, and the reader was a model I asked to attack the page.

## D33. I measured a metric on a set the algorithm was editing, and it told me the opposite of the truth.

**Date:** 2026-07-13. **Caught by a constant that should have been a variable.**

### What happened

The active-learning loop's first run reported that the loop **degrades**: held-out average precision falling from 0.019 at round 1 to 0.011 at round 20, after revealing 2,000 labels. I had the write-up half-formed in my head, and it was a good story: *uncertainty sampling feeds the model a diet of contested works, the boundary is definitionally contested, so the training set becomes progressively more adversarial and less representative, and the loop eats itself.* It fit this project's central thesis perfectly. **That is exactly why I should have distrusted it.**

Then I looked at the churn column: **1.000, twenty times in a row.** A quantity that never moves is not a measurement.

**The metric was computed on the POOL, the set of not-yet-revealed works.** Active learning *removes the contested works from the pool by construction*. So every round the pool got easier, smaller, and differently composed, and I was comparing the model against a target that the model itself was editing. The "degradation" was the denominator moving.

### The corrected result, which says the opposite

A fixed holdout, drawn once, never queried, invisible to every acquisition decision. Plus a **random-batch control at identical budget**, which the first version did not have at all, and without which a curve means nothing:

| | round 1 | round 20 |
|---|---|---|
| active (50 disagreement + 30 uncertainty + 20 random) | AP 0.014 | **AP 0.139** |
| random batches, same budget | AP 0.024 | AP 0.050 |

**Active learning wins 18 of 20 rounds and ends at 2.8x the control.** Held-out positive-set churn falls from 1.00 to 0.11. The PI's directive (batches of 100, iterate until it matures) is **vindicated as an acquisition policy**, and the loop demonstrably *does* mature in the only sense the word can honestly carry here: the model's opinion about the *same* works stops moving.

### The lesson, and it is not "add a holdout"

I have now written, in this project, three variants of the same error, and this is the fourth:

- **D4/D19:** a `summarise()` output named after its input, silently masking it.
- **D22:** a stratified design where `sum(N_h) != N`, so 12.9% of the frame had zero selection probability, and every stratum still returned exactly the *n* it asked for.
- **D32:** two true sentences describing two different studies.
- **D33:** a metric measured against a moving denominator.

**Every one of them produced output that looked correct.** And this one had the additional property that its wrong answer *confirmed my thesis*. The zero-probability hole made the sample tidier. The literature corroboration made the evidence feel stronger. Now a bug produced a result that flattered the project's central claim, and I was three paragraphs into believing it.

**The errors that survive are the ones that flatter you.** That sentence is in this file five times now. It keeps earning its place.

## D34. A screening arm went looking for the other arms' answers, and the harness had never said not to.

**Date:** 2026-07-13. **Caught because the arm SAID SO in its completion report.**

### What happened

The live loop's first round runs three teachers independently on the same 100 works; the between-teacher disagreement is a measured quantity the audit stratifies on. The Opus arm for chunk 04 reported, in its own words, that it used *"calibration from the completed sibling arm (raw_codex)"* for its hardest boundary calls. It had read another teacher's labels before writing its own.

Nothing in the harness forbade it. The agents run in the repository, the sibling arm's raw output sits in a sibling directory, and an agent that wants calibration will find it. **Correlated arms are worse than one arm**, because they produce the agreement of one model wearing three names, and every downstream number that treats the arms as independent (the disagreement stratum, the between-model spread, the adjudication) silently inherits the correlation.

### The repair

The contaminated chunk was **discarded before assembly** (the validator never saw it) and re-screened by a fresh agent whose instructions state the independence requirement, name the directories it must not read, and say why. The scripted arms cannot contaminate this way: the CLI teachers receive the prompt on stdin and have no repository access.

### The lesson

The disagreement between arms is a measurement, and a measurement's independence assumptions have to be **enforced, not presumed**. Every prior screen got independence for free because the arms ran on different machines through different CLIs; the moment one arm ran as an agent inside the repository, the assumption stopped being structural and nobody had written it down. It is written down now, in the arm's own instructions, which is the only place an agent reads.

## D35. The live loop's first evaluation reported AP 0.969, and the model had been trained on the holdout.

**Date:** 2026-07-13. **Caught because 0.969 was too good for a model whose honest ceiling is 0.15.**

### What happened

The simulation (finding 31) excluded its holdout from selection. The LIVE loop's evaluator defined the same holdout locally, in `ml/loop.py`, while the trainer in `ml/select_batch.py` trained on **all 5,600 labelled works, holdout included**. Two modules, two ideas of what "held out" meant, no shared definition. Round 1 reported holdout AP **0.969** against works the model had memorized. The honest number, after the fix, is **0.152**.

This is D33's class again (a metric computed on data the process controls), one file to the left, on the same day D33 was recorded. Writing the deviation did not prevent the recurrence; only structure does.

### The repair

One canonical definition, `ml/labels.py::frozen_holdout_ids()`, imported by both sides. `train_heads()` excludes it unless the maturity gate has passed. And two assertions run every evaluation: no holdout work may appear in any loop batch, and the training corpus must be smaller than labelled-minus-holdout. The number 0.969 appears in this entry so that the next person who sees an evaluation that good checks the corpus before the champagne.
