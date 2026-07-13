# The prompts, archived

The proposal says: *"I archive and release the **exact prompts and raw model outputs**."* Until 2026-07-11 that was
half true. The raw outputs were committed (`pilot/screening/screener_a.json`, `pilot/screening/codex/`); **the prompts
were not** (`pilot/run_screener_b.sh` took a `<prompt-dir>` argument that was never in the repository).

That is `DEVIATIONS.md` **D10**, and this directory is the fix.

## What the screeners were actually sent

Both screeners received the **same two things**: the locked rubric (`docs/protocol/rubric.md`, reproduced verbatim as the
system prompt) and a chunk of records as JSON.

**And here is the defect that matters more than the archiving one.** The rubric says the screener sees:

> "title, abstract, publication year, language, **venue, OpenAlex topic and field, Canadian institutional affiliations,
> funders**."

The harness sent **six** fields:

```json
{"id":"W1965131991","title":"Home nocturnal hemodialysis in children","abstract":"","year":2005,"lang":"en","type":"article"}
```

**Venue, OpenAlex topic, OpenAlex field, Canadian affiliations and funders were all withheld.** Four of the five were
sitting in `canadian_sample.rds` and were dropped by a `select()`; venue was never extracted from the snapshot at all.
So the pilot ran as a **title-and-abstract screen**, in violation of its own locked instrument. That is
`DEVIATIONS.md` **D1**, it is the most serious defect in this project, and the prompt templates here are archived
exactly as they were run rather than retrospectively corrected: **`screener_prompt.txt` is the prompt that produced
the pilot's numbers, not the prompt the rubric specifies.**

The full study sends `full_payload_prompt.txt`, which is what the rubric always said, and reports the difference
between the two runs as a finding: what the withheld metadata was worth.

| file | what it is |
|---|---|
| `screener_prompt.txt` | **As run.** The six-field payload. Produced every number in the pilot. |
| `full_payload_prompt.txt` | **As specified.** The eight fields the rubric mandates. What the full screen sends. |
