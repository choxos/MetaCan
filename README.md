# MétaCan

[![Research pipeline CI](https://github.com/choxos/MetaCan/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/choxos/MetaCan/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-blue.svg)](LICENSE)
[![FAIR metadata](https://img.shields.io/badge/FAIR-metadata-118AB2.svg)](FAIR.md)

MétaCan is a provenance tracked map of Canadian metaresearch. This branch contains the research methods, Canadian frame construction, screening records, classifier pipeline, database schema, data loaders, and release evidence.

The deployable website is maintained separately on the [`webapp`](https://github.com/choxos/MetaCan/tree/webapp) branch. Keeping the two branches distinct makes the research pipeline readable without mixing it with application dependencies and production configuration.

Ahmad Sofi-Mahmudi, independent researcher, <ahmad.pub@gmail.com>

## Release status

The frozen frame contains **4,299,418 unique works** from all 482 partitions of the pinned OpenAlex snapshot. The exact frame and classifier identifiers are recorded in [`RELEASE.md`](RELEASE.md).

Classifier version `metacan-v1-d91a1de5be90` was trained on 10,348 works with complete Codex and Gemma screening arms, then applied to all 4,299,418 frame records. Its 39 available heads imitate the two machine teachers. They do not estimate scientific truth, classification accuracy, or population prevalence. Human validation remains outstanding. See [`CLASSIFIER_VALIDATION.md`](CLASSIFIER_VALIDATION.md).

No OSF registration, Zenodo archive, DOI, or completed human validation is claimed at this stage.

## Branches

| Branch | Purpose |
|---|---|
| `main` | Methods, protocols, frame construction, screening, classifier, database creation, tests, and release records |
| `webapp` | Standalone bilingual Next.js application, Prisma migrations, recent OpenAlex updater, CI, and production guidance |

## Pipeline map

```text
OpenAlex snapshot
      |
      v
R/ frame construction and Canadian route provenance
      |
      v
pilot/ sampling, screening records, and generated findings
      |
      v
ml/ two teacher classifier training, application, and verification
      |
      v
deploy/ PostgreSQL schema, indexes, normalization, and release loaders
      |
      v
webapp branch and metacan.xera.ac
```

### Frame construction

- [`R/snapshot.R`](R/snapshot.R) defines the pinned snapshot interface.
- [`R/harvest_frame.R`](R/harvest_frame.R) processes every snapshot partition and records resumable progress.
- [`R/frame.R`](R/frame.R) defines the four Canadian admission routes.
- [`R/frame_lexicon.R`](R/frame_lexicon.R) owns the versioned geographic lexicon.
- [`R/export_for_db.R`](R/export_for_db.R) produces the database import files.
- [`data/frame/frame_summary.json`](data/frame/frame_summary.json) records the frozen row and route counts.

### Screening and methods

- [`docs/protocol/PROTOCOL.md`](docs/protocol/PROTOCOL.md) is the working study protocol.
- [`docs/protocol/rubric-v3.md`](docs/protocol/rubric-v3.md) is the locked current instrument.
- [`pilot/screening`](pilot/screening) preserves prompts, consolidated labels, and provenance manifests.
- [`pilot/results/findings.json`](pilot/results/findings.json) is the machine readable historical finding store.
- [`DEVIATIONS.md`](DEVIATIONS.md) records methodological and implementation deviations.

### Classifier

- [`ml/full_frame_classifier.py`](ml/full_frame_classifier.py) exposes `validate`, `train`, `apply`, and `verify` commands.
- [`artifacts/frame_classifier`](artifacts/frame_classifier) contains the compact model and release metadata.
- [`tests`](tests) covers training data contracts, grouped folds, feature parity, resumable application, full frame verification, and database loading.
- [`RELEASE.md`](RELEASE.md) records hashes for the model, frame, predictions, and public assets.

### Database

- [`deploy/schema.sql`](deploy/schema.sql) creates the frozen frame and historical evidence tables.
- [`deploy/normalize.sql`](deploy/normalize.sql) normalizes imported values.
- [`deploy/indexes.sql`](deploy/indexes.sql) creates query indexes and materialized facet tables.
- [`deploy/classifier-schema.sql`](deploy/classifier-schema.sql) creates classifier release and prediction tables.
- [`deploy/load_labels.py`](deploy/load_labels.py) loads direct machine labels.
- [`deploy/load-classifier-release.sh`](deploy/load-classifier-release.sh) verifies and loads a full classifier release.

See [`DATABASE.md`](DATABASE.md) for the creation order, required local inputs, and validation checks.

## Quick validation

Python 3.12 or 3.13, R, and `uv` are required.

```bash
uv sync --locked --dev
make deps
make check
```

Use the classifier command help for the exact artifact paths required by each stage:

```bash
uv run python -m ml.full_frame_classifier --help
```

The committed documentation and generated findings require no API credential. Snapshot retrieval, model screening, database loading, and deployment use local data or credentials that are deliberately excluded from Git.

## Evidence hierarchy

When two files disagree, use this order:

1. Frozen source artifacts and their machine readable summaries.
2. Generated result stores, especially `pilot/results/findings.json`.
3. Screening status, validation, and provenance manifests for the named round and arm.
4. Rendered tables and narrative documents.

## Citation and FAIR metadata

`CITATION.cff`, `codemeta.json`, `ro-crate-metadata.json`, and `.zenodo.json` expose machine readable authorship, ORCID, version, licence, runtime, provenance, and related application links. [`FAIR.md`](FAIR.md) maps these records to the FAIR principles and states the remaining gaps without claiming a DOI or archival deposit.

## Scope and limitations

The frame is bounded by the pinned OpenAlex snapshot and the recorded Canadian metadata routes. Work absent from covered sources, or lacking every detectable Canadian signal, remains outside what this design can estimate.

The machine screening evidence supports instrument development and sampling. It does not establish accuracy. The planned human study includes independent coding, an unresolved category for insufficient evidence, and design weights tied to recorded selection probabilities.

No sensitive identity is inferred. Derived labels involving Indigenous governed data are not released without appropriate governance.

## Licence

Code is licensed under MIT. Data and documentation are licensed under CC BY 4.0. See [`DATA-LICENSE.md`](DATA-LICENSE.md) for attribution and source specific conditions.
