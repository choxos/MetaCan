# MétaCan v1 release record

The rolling `/recent` database layer is operational state, not a v1 release asset. Its scheduled OpenAlex updates remain separate from the frozen frame, classifier hashes, fixed counts, and citable cohort links documented below.

Release date: 2026-07-15

This file records the machine-readable artifacts behind the first full-frame classifier release. It does not claim an OSF registration, a Zenodo archive, a DOI, or human validation.

## Frozen frame

The frame contains 4,299,418 unique works from all 482 partitions of the pinned OpenAlex snapshot. The application contract records these identifiers:

| Field | Value |
|---|---|
| Frame rows | 4,299,418 |
| Frame SHA256 | `267cc14e52543ffee03957f84bbbd1099eca48337cd05f01be0067b86cdda274` |
| Ordered identifier SHA256 | `f53f6d4f89aaecff6edf46d9d8ae97976efcde078d81df10a9142f1b1e6cdce5` |

## Direct screening record

Round 100 contains 10,348 sampled works. Codex and Gemma each returned one schema-valid record for every sampled identifier. Opus returned 82 of 414 chunks before it was paused. Its partial files remain in the preserved screening record, but they are excluded from the assembled labels, agreement statistics, and classifier training.

The exact category set agreement rate is 0.820255 unweighted and 0.941198 after applying the recorded design weights. Study design agreement is 0.636935 unweighted and 0.667204 after weighting. These are agreement measures between two machine screening arms. They are not accuracy estimates.

## Classifier

| Field | Value |
|---|---|
| Version | `metacan-v1-d91a1de5be90` |
| Training rows | 10,348 |
| Training source commit | `48cffaf5aebcdcbd6873c032513d1ff17b7fcb33` |
| Public source equivalent | `75b336ac242c34a441f82ca49e678c36775f0819` |
| Source tree object | `954348d6f0fc098d0f3b2514280a606d76d6a134` |
| Source tree | Clean |
| Available Codex heads | 20 of 20 |
| Available Gemma heads | 19 of 20 |
| Unavailable head | Gemma `design_other`; insufficient support |
| Model SHA256 | `2aa7c89b5df35a262221ad33daf49f52df8ec66a488455cdacce4ff2b3ced617` |
| Feature contract SHA256 | `f9a7f4b1e4d6ed4dc03dfbf3cb7de45ceabc4a7398680607ace2bb81b1daabac` |
| Output schema SHA256 | `9590ca7afafe8abc22eca9ede70c31ac7b8fa86c7037cdbe5c717e9f5b29dc5f` |

The training source commit predates release history normalization. Its public equivalent has the identical Git tree object shown above. The classifier version and artifact metadata retain the training commit because that exact identifier was part of the version seed.

The classifier has 39 available binary teacher heads. Each score imitates one direct screening arm on the enriched sample. Both candidate union and consensus intersection decisions require two available teacher heads, so decisions cover the 19 targets available for both arms. For those targets, the candidate union includes a work when either teacher score crosses its recorded threshold; the consensus intersection requires both.

[`CLASSIFIER_VALIDATION.md`](CLASSIFIER_VALIDATION.md) records the grouped out-of-fold metrics, decision limits, and independent full-frame verification. Human accuracy is not established.

The exact Parquet scores are the release authority. The production database packs serving scores as unsigned 16-bit little-endian values at a resolution of 1 divided by 65,535. The application decodes those values when serving a record. Candidate and consensus decisions are stored without quantization.

## Full-frame application

The application ran in 43 resumable partitions. Every partition was verified before assembly. The assembled output was then verified against the frame, model, feature contract, schema, identifier order, row count, and file hash.

| Field | Value |
|---|---|
| Output rows | 4,299,418 |
| Partition count | 43 |
| Application fingerprint | `ad169128802653547cc91bff5b2cb30639daccb3094fda54b601e33586ed131c` |
| Prediction Parquet SHA256 | `cfa3252c9ba1ce0864a52300a57c9cf0b8972774f3515b009496f90fc6145cc7` |
| Application contract SHA256 | `8c59149cce82b2abd6a82bc6f01c04824f9a4d1049c728d07a919a959e47000c` |

## Release assets

| Asset | SHA256 |
|---|---|
| `metacan-v1-full-frame-predictions.parquet` | `cfa3252c9ba1ce0864a52300a57c9cf0b8972774f3515b009496f90fc6145cc7` |
| `metacan-v1-full-frame-predictions.parquet.json` | `8c59149cce82b2abd6a82bc6f01c04824f9a4d1049c728d07a919a959e47000c` |
| `metacan-v1-classifier-artifact.tar.gz` | `f9c90c1ce4a0bfe9a4aa37f09d629f5ca05fa04ce2e6dfc4818655020175bb70` |
| `metacan-round100-screening-record-20260714.tar.gz` | `45a583d6aa958fcd679f71715525a1d2cdb89d810e73c7f13521d109f09f0048` |

`SHA256SUMS.txt` contains the same checksums for command line verification.

## Interpretation limits

The predictions are unvalidated retrieval aids. They imitate machine teachers and inherit their disagreements, shared biases, and sample selection. A missing prediction means unknown coverage, never a negative classification. A low score is not evidence that a work is outside the field. No classifier result in this release is a prevalence estimate.

Human coding, design-based estimates, OSF registration, and a Zenodo DOI remain future work. They must not be inferred from this release.
