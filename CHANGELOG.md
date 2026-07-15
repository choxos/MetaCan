# Changelog

All notable public changes to MétaCan are recorded here.

## 1.0.0, 2026-07-15

- Froze the Canadian frame at 4,299,418 unique OpenAlex works from 482 partitions.
- Preserved four Canadian admission routes and their record level provenance.
- Completed two machine screening arms over 10,348 sampled works.
- Trained classifier `metacan-v1-d91a1de5be90` and applied it to every frozen frame record.
- Added verified PostgreSQL schema, normalization, indexes, direct label loading, and classifier release loading.
- Published the bilingual application separately on the `webapp` branch.
- Added citation, CodeMeta, RO-Crate, deposit, licence, contribution, security, and release metadata.

Human validation, archival DOI assignment, and an external registration remain future work.
