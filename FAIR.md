# FAIR implementation

MétaCan follows the FAIR principles for its research software, methods, metadata, and distributable artifacts. FAIR does not mean that every large source file belongs in Git. It means that each object is identifiable, described, accessible under stated conditions, interoperable, and reusable with provenance and licence information.

## Findable

- `CITATION.cff`, `codemeta.json`, and `ro-crate-metadata.json` expose machine readable title, authorship, ORCID, version, repository, licence, runtime, and related application links.
- `RELEASE.md` records exact hashes and row counts for the frozen frame, model, application contract, and full frame predictions.
- Stable OpenAlex work identifiers remain the primary keys throughout the frame, database, API, and application.
- The repository uses a versioned `main` branch for research and a versioned `webapp` branch for the deployable application.

## Accessible

- Source code, methods, metadata, generated summaries, and compact model files are publicly readable through GitHub.
- Large snapshot partitions, database exports, full frame predictions, and raw model transcripts are excluded from Git because their size would impair access to the source repository. Their expected names, hashes, counts, and reconstruction paths are recorded in `RELEASE.md`, `DATABASE.md`, and the protocol.
- The public application exposes documented JSON endpoints at `https://metacan.xera.ac/api-docs`.
- No credential is required to read committed evidence. Workflows that call external services or write a database document their separate credential requirements.

## Interoperable

- Metadata is supplied as CFF, CodeMeta JSON-LD, RO-Crate JSON-LD, and Zenodo deposit metadata.
- Research artifacts use JSON, JSON Schema, Parquet, CSV, Markdown, PDF, SQL, and standard OpenAlex identifiers.
- The database preserves route provenance and classifier versions instead of collapsing evidence into an undocumented binary label.
- The web application provides bilingual human interfaces and structured JSON APIs.

## Reusable

- Source code is MIT licensed. Data and documentation are CC BY 4.0 licensed, subject to the source specific conditions in `DATA-LICENSE.md`.
- `uv.lock`, classifier dependency metadata, the Makefile, tests, and CI record executable requirements.
- The protocol, locked rubric, deviations, screening manifests, and release hashes preserve methodological provenance.
- `CONTRIBUTING.md`, the security policy, issue forms, and support guidance make reuse and contribution routes explicit.

## Current gaps

- There is no DOI or external archival deposit yet. The repository does not claim one.
- Human validation of classifier accuracy is not complete. Classifier output remains an unvalidated retrieval aid.
- Some large source and release artifacts are available only through their documented retrieval or release paths, not as ordinary Git blobs.

These gaps are disclosed in the machine readable and human readable release records so metadata harvesters do not infer stronger availability or validity than the project has established.
