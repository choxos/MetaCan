# MétaCan

MétaCan is a provenance-tracked map of Canadian metaresearch built around one question: what does a bibliographic pipeline miss inside the sources it claims to cover?

Ahmad Sofi-Mahmudi, independent researcher, <ahmad.pub@gmail.com>

## Current status

The frozen Canadian frame contains **4,299,418 works** from 482 partitions of a pinned OpenAlex snapshot. This count comes from [`data/frame/frame_summary.json`](data/frame/frame_summary.json), not from an extrapolation.

The repository contains two different bodies of screening evidence. They must not be combined without an explicit analysis:

- The historical pilot produced the generated finding store in [`pilot/results/findings.json`](pilot/results/findings.json). Its source analyses use several samples and earlier model panels. Those machine labels are preliminary evidence about pipeline behaviour, not a human reference standard.
- The v1 release uses the same 10,348-work sample for two direct screening arms: Codex and Gemma. Both arms have complete, schema-valid coverage of the sampled IDs. Opus stopped after 82 of 414 chunks; its partial record is preserved but excluded from assembly, comparison, and classifier training.

The v1 teacher-imitation classifier is complete. Version `metacan-v1-d91a1de5be90` was trained from a clean source tree on the two direct arms and applied to all 4,299,418 frame records. Its 39 available heads reproduce Codex or Gemma decisions; they do not estimate scientific truth or population prevalence. Direct labels and classifier predictions remain separate in the data model, APIs, filters, exports, and interface. See [`CLASSIFIER_VALIDATION.md`](CLASSIFIER_VALIDATION.md) for the internal evaluation and full-frame verification, and [`RELEASE.md`](RELEASE.md) for hashes, coverage, interpretation, and public assets.

The active application source is [`site/`](site/). The configured deployment target is `metacan.xera.ac`, but this README does not assert that the public deployment matches the current repository revision. Live status is established only by the release and browser verification gates.

The application includes a separate rolling OpenAlex layer. Deployment is configured to retrieve a complete 30-day publication window every day at 05:15 server time, evaluate the same four Canadian routes, and replace that window atomically after a successful retrieval. The updater also accepts any window from 15 through 30 days. Until the first successful keyed run, the interface reports that no live window is available. This operational table never changes the frozen 4,299,418 work release or its citable cohort links. The public surface is `/recent`, with JSON at `/api/v1/recent`.

No OSF registration or Zenodo DOI is claimed at this stage. The protocol is a working protocol, not a completed registration.

## Repository layout

```text
data/             frame metadata and local data links
docs/proposal/    two-page submission attachment and form answers
docs/protocol/    working protocol, locked rubrics, and output schemas
pilot/            numbered analyses, archived inputs, and screening runs
R/                frame construction and research checks
ml/               screening validation and classifier workflows
site/             active bilingual Next.js application
deploy/           database and application deployment tooling
legacy/           superseded prototypes
DEVIATIONS.md     numbered methodological and implementation deviations
```

## Why the frame comes before the field label

A conventional map first retrieves records that look like metaresearch, then checks whether they are Canadian. That makes the field boundary depend on the retrieval vocabulary. It also makes missed work hard to measure because excluded records disappear before screening.

MétaCan reverses the order. It first builds an enumerable Canadian frame from checkable metadata routes. It then treats field membership as a classification question over that frame. Each work retains the route that admitted it, so retrieval behaviour can be studied rather than hidden.

The approach does not make machine screening correct. The historical pilot shows why model agreement cannot substitute for human validity. Direct model labels identify records where models differ and support sampling. Human coding remains the planned source of design-based estimates.

## Evidence hierarchy

When two files disagree, use this order:

1. Frozen source artifacts and their machine-readable summaries.
2. Generated result stores, especially `pilot/results/findings.json`.
3. Screening status, validation, and provenance manifests for the named round and arm.
4. Rendered tables and narrative documents.

[`pilot/results/FINDINGS.md`](pilot/results/FINDINGS.md) is generated from the finding store. It is the entry point for historical pilot results. Sample sizes in that file refer to the analysis named in each row. They do not describe the active two-arm release screen unless the row says so explicitly.

## Build and validation commands

```bash
make lint       # research consistency checks
make proposal   # build the submission PDF and enforce the two-page limit
make protocol   # build the protocol with its rubric appendices
```

The repository also exposes `make pilot` and `make pilot-offline`. They are research workflows, not a guarantee that a clean machine can currently recreate every artifact. A release claim requires a clean-environment run, pinned dependencies, and verification of all local source data. Language model labels are not deterministic. Their reproducibility record is therefore the exact prompt, raw response, model identity, hashes, and validation outcome, not an assertion that a second call will return the same label.

No API key is required to read the committed documentation or generated findings. Some data, model, and deployment workflows require local files or credentials that are not committed.

The recent-work updater uses `DATABASE_URL`. A free `OPENALEX_API_KEY` is required for database-writing and scheduled runs because the complete query set exceeds the anonymous daily allowance. The retrieval and route checks can be exercised without a database write:

```bash
cd site
npm run sync:recent -- --dry-run --days 15
npm run test:recent-sync
```

The production database predates Prisma migration tracking. Migration `20260714000000_existing_schema_baseline` describes that existing schema. `npm run db:preflight` distinguishes a fresh database, a resolved baseline, and a complete legacy schema that needs the baseline marked as applied. It refuses a partial legacy schema. The deployment script performs that check before `prisma migrate deploy`, then refreshes empty facet tables after the migrations. Prisma explicitly maps the recent-layer indexes and array defaults. The recent-run status constraint, single-running partial index, classifier row-count constraint, and single-active classifier index remain raw SQL-managed objects because Prisma cannot represent those contracts completely.

## Scope and limitations

The frame is bounded by the pinned OpenAlex snapshot and the project’s Canadian metadata routes. Work absent from the covered sources, or lacking every detectable Canadian signal, is outside what this design can estimate.

The current screening evidence is machine generated. It supports instrument development and sampling, but it does not establish accuracy. The planned human study includes independent coding, an unresolved outcome for insufficient evidence, and design weights tied to recorded selection probabilities.

No sensitive identity is inferred. Derived labels involving Indigenous-governed data are not released without appropriate governance.

## Licence

Code is licensed under MIT. Data and documentation are licensed under CC BY 4.0. See [`DATA-LICENSE.md`](DATA-LICENSE.md) for the notice and suggested attribution.
