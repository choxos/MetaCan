# Changelog

## 1.1.0, 2026-08-03

- Synchronized the app source with the tree serving metacan.xera.ac.
- Added author search, per-author cohorts, and the Canada-only researcher collaboration network with its construction rules stated on the page.
- Redesigned the work page: classification first, numeric machinery collapsed under one section, route provenance as hoverable chips.
- Switched the prediction layer to the v3 hybrid, metacan-v3-hybrid-931329e0061c: candidate is the union of the direct title-only Gemma label and the calibrated encoder Codex head, consensus their intersection; English and French copy name both sources.
- Published the prediction provenance file and refreshed the predictions endpoint note.

## 1.0.0, 2026-07-15

- Added a bilingual faceted cohort builder over 4,299,418 frozen works.
- Added direct screening and teacher imitation classifier evidence with explicit provenance and coverage limits.
- Added readable structured abstracts from PubMed, Europe PMC, and OpenAlex with PMID and PMCID identifiers.
- Added clickable record facets, a responsive right rail, and a collapsed mobile navigation menu.
- Added institution collaboration visualization and an explicit author network availability disclosure.
- Added a separate rolling OpenAlex layer with daily 15 through 30 day updates.
- Added Prisma migrations, export controls, rate limits, security headers, CI, and production guidance.
- Added CFF, CodeMeta, RO-Crate, HTTP metadata discovery, licence, and FAIR documentation.
