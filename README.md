# MétaCan

**An open, provenance-tracked, coverage-audited map of Canadian metaresearch.**

Proposal to the [Canadian Metaresearch Data Challenge](https://opensciencecanada.ca). 2nd Canadian Open Science
Conference, University of Ottawa, 27–29 October 2026.

Ahmad Sofi-Mahmudi · independent researcher · <ahmad.pub@gmail.com>

---

> **Every MétaCan record will show why it was found and why it counts as Canadian, and a bilingual human audit
> will quantify what the pipeline missed.**

## Why

Mapping a research community from bibliographic metadata invites one specific failure: you map what your retrieval
could see, then present it as a map of the field. The gap is rarely measured.

I have measured it before. Benchmarking automated publication linkage against a reference standard built by two
independent human reviewers, the matcher was accurate on every record that reached it (sensitivity 92.2%,
PPV 94.3%), but its overall sensitivity was **44.5%**. Half the publications the humans found were never
retrieved at all. The loss was in *retrieval*, and no internal quality check would have caught it.

So this project treats retrieval error as a measured outcome rather than a limitations paragraph.

## Don't search for metaresearch. Search for Canada, then screen.

The usual design retrieves what *looks like* metaresearch, then asks whether it is Canadian. That makes the field
boundary a property of your keyword list, and it is why such maps can never be audited: a lexicon cannot show you
what it never surfaced, so there is nothing to measure the miss against.

This project inverts it. The frame is **all Canadian research**: an external, checkable criterion (3.5M works).
Field membership becomes a *classification* question over that frame, not a *retrieval* question over the
literature. Then you can just **count**.

I screened **5,737 unfiltered Canadian works** (not a metaresearch search; a slice of Canadian research) against
a locked rubric ([`protocol/rubric.md`](protocol/rubric.md)), with two independent machine screeners.

> **Metaresearch is 1.31% of Canadian research** by one screener's labels; **≈45,850 works** across the 3.5M-work
> frame. The binomial CI (1.03–1.64%) is *not* the uncertainty: swap the screener and the field is **37,032 to
> 83,022 works** (finding 10), and finding 16 says even that range understates it. Scored against those same
> labels, the best topic-based retrieval route finds **12%** of the field (95% CI 5.6–21.6%): it misses **66 of
> the 75** metaresearch works it was shown.

## The pilot, and what it killed

Sixteen analyses. Run them yourself with `make pilot`, or re-derive every number with **no network at all** from
the raw responses archived here: `make pilot-offline`. `pilot/results/FINDINGS.md` is the rendered table and is
the authoritative one; the excerpt below is a sampler, not the list.

| Finding | Consequence |
|---|---|
| **Metaresearch is 1.31% of Canadian research** (95% CI 1.03–1.64%), so **≈45,850 works** across the 3.5M-work frame. | The field sized by counting, with no search strategy at all. This is the quantity capture–recapture failed to produce. |
| Scored against the rubric, the topic route finds **12%** of Canadian metaresearch (95% CI 5.6–21.6%) at **60%** precision. It misses **66 of 75**. | OpenAlex files a work by what it is *about*, and metaresearch about cardiology reads as cardiology. The field is invisible to topic retrieval **precisely because it is about other fields.** |
| Swap which model is called "the screener" and the base rate moves from **1.06%** to **2.37%**: a **2.2x** spread, **37,032** against **83,022** works. The two agree on in/out for **96.6%** of the **1,290** double-screened works (κ = **0.681**), and for **95%** inside the contested boundary against **99%** in the settled mass. | Agreement is a **process metric**, not accuracy. The screener-swap range, not the binomial CI on either model alone, is the honest uncertainty on the field's size. The disagreements locate the field's edge empirically. |
| **31.5%** of the frame carries no abstract, and the screen finds **0.78%** metaresearch there against **1.55%** where one exists (p = 0.023). An earlier version of this row also claimed the blindness was *differential* by tradition (T2 losing 3.6x against T1's 1.4x); that claim rests on a cell of **four works** (interaction p = 0.141) and is **withdrawn** (`DEVIATIONS.md` D6). | A real, significant coverage bias, found in our own data before a reviewer found it, and not overstated into a differential one. The human audit is stratified on abstract availability because of it. |
| Three agents of **one** model, on **one** rubric and prompt, disagree beyond chance even after conditioning on what they were shown (CMH p = **0.0056**; replicated in a second arm at **0.015**), and Haiku's in-scope set overlaps Sonnet's by **16%** despite 98% agreement. | **Rate agreement is not set agreement**, and the noise inside one model is at least the size of the swap between models. No machine pass measures this field; machine labels stratify the human audit, which is the instrument. |
| **0 of 4,516** OpenAlex topics name metaresearch, metascience, research integrity, reproducibility or STS. The 11 carrying its content span **7 OpenAlex fields**. | No single route encloses the field. |
| **64%** of works in that topic space (508,744 / 793,883) have **no raw affiliation string**. | Affiliation-only "Canadian" is structurally broken. |
| **Érudit, the main francophone Canadian platform, matches 0 OpenAlex sources** (its OAI-PMH endpoint is live, with **379** harvestable sets). | An OpenAlex-only pipeline cannot even *ask* how francophone the corpus is. |
| `reproducibility` alone returns **43,392** Canadian works: **0.8%** on-topic. | Polysemy defeats keyword retrieval. Screening must be semantic. |
| **The OpenAlex API is metered** (1,000 credits per ~11h; a $0.10 free tier). Enumerating the frame needs 17,537 calls: **8.2 days per pass**. | An API-based study at this scale is not reproducible. The pinned S3 snapshot is free, unmetered, and byte-identical forever. |
| Naive capture–recapture returns **N̂ = 467,541**, implying Canada produces **59%** of the world's metaresearch, against an observed 1.9%. | **The estimator is void here. We cut it.** |

That last row is the one I would want a reviewer to read. Capture–recapture is the obvious way to estimate what a
search missed, it is what I intended to propose, and it does not work here: the routes are endogenous, so the
unseen cell is not identified, and the estimate is not even a safe lower bound. I found this out by running it.
The base rate above gets the same quantity honestly, and a **two-phase stratified probability audit** samples the
screened-out stratum directly instead of inferring it.

## What is here

```
proposal/   the 2-page attachment (build FAILS if it spills to 3), and the form answers
protocol/   PROTOCOL.md  the OSF-ready preregistration: estimand, frame, audit design
            rubric.md    the locked screening rubric, with the three errors that decide everything
pilot/      the analyses; every number above, with raw responses archived in pilot/raw/
            screening/   6,202 Canadian works, both screeners' labels, and their disagreements
R/          OpenAlex client (cursor paging, polite pool, 429 handling, response archiving),
            snapshot.R (DuckDB over the pinned S3 parquet), the frame definitions, findings accumulator
app/        the bilingual explorer (Next.js; EN/FR; reads findings.json, hardcodes nothing)
```

Read [`protocol/PROTOCOL.md`](protocol/PROTOCOL.md) for the method. Read
[`pilot/results/FINDINGS.md`](pilot/results/FINDINGS.md) for the numbers.

## Reproduce it

```bash
make deps           # httr2, jsonlite, xml2, dplyr, purrr, tibble, glue, cli, openssl
make pilot          # run every pilot against the live OpenAlex API
make pilot-offline  # re-derive every number from archived responses, no network
make findings       # regenerate pilot/results/FINDINGS.md
make proposal       # render the 2-page PDF; FAILS the build if it exceeds 2 pages
```

R 4.4+. No API key needed: OpenAlex's polite pool wants only an email, set in `R/openalex.R`.

The archiving is not incidental. **OpenAlex changes daily**, so an API query is not a reproducible artefact unless
the response itself is kept. Every response this pilot received is committed under `pilot/raw/`, which is why
`make pilot-offline` works and why the numbers in the proposal cannot drift from the code that produced them.

## Limitation, stated at the top rather than the bottom

Coverage is estimated **within a frozen frame** of OpenAlex plus Érudit. Scholarship indexed by neither is not
estimated by this design, and I make no claim about it. The audit answers *"what did the pipeline miss inside the
sources I claim to cover?"* That is a bounded question, honestly answerable, rather than an unbounded one that
would require me to pretend.

## Licence

Code: MIT. Data and documentation: CC BY 4.0.
