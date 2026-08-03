# Changelog

All notable public changes to MétaCan are recorded here.

## 1.1.0, 2026-08-03

- Recovered abstracts for 3,294,291 frame works and fine-tuned a SPECTER2 encoder on the 10,348 paired teacher labels.
- Calibrated decision quotas to design-weighted sample rates with per-head support gates.
- Completed a direct Gemma labeling pass over every frame work (title-only payload) across four serving backends.
- Deployed the v3 hybrid prediction layer, `metacan-v3-hybrid-931329e0061c`, now serving metacan.xera.ac: candidate is the union of the direct Gemma label and the calibrated encoder Codex head; consensus is their intersection.
- Evaluated the encoder against the direct Gemma labels frame-wide; it exceeds the TF-IDF student on all 11 binary heads (`pilot/results/gemma_frame_eval.json`).
- Added the revised two-page challenge proposal (`docs/proposal/metacan-proposal-revised.md`).

## 1.0.0, 2026-07-15

- Froze the Canadian frame at 4,299,418 unique OpenAlex works from 482 partitions.
- Preserved four Canadian admission routes and their record level provenance.
- Completed two machine screening arms over 10,348 sampled works.
- Trained classifier `metacan-v1-d91a1de5be90` and applied it to every frozen frame record.
- Added verified PostgreSQL schema, normalization, indexes, direct label loading, and classifier release loading.
- Published the bilingual application separately on the `webapp` branch.
- Added citation, CodeMeta, RO-Crate, deposit, licence, contribution, security, and release metadata.

Human validation, archival DOI assignment, and an external registration remain future work.
