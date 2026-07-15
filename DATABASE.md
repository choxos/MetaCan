# Database construction

This document describes a fresh build of the frozen MétaCan PostgreSQL database. The base schema load is destructive. Never run `deploy/schema.sql` against an existing production database. Production changes use the Prisma migrations on the `webapp` branch.

## Inputs

The initial build requires these local artifacts:

| Input | Produced by | Git status |
|---|---|---|
| `data/frame/canadian_works.parquet` | `R/harvest_frame.R` | Excluded because of size |
| `data/frame/frame_retractions.parquet` | Retraction enrichment workflow | Excluded because of size |
| `pilot/screening/frame1k/sample_design.rds` | Recorded sampling design | Committed |
| `pilot/screening/frame1k/chunks/*.json` | Recorded screening payloads | Committed |
| Consolidated screening labels | Recorded screening arms | Committed |
| Full frame classifier predictions | `ml/full_frame_classifier.py apply` | Release asset |

The pinned frame hashes, model hash, output hash, row counts, and classifier version are listed in [`RELEASE.md`](RELEASE.md).

## Secure PostgreSQL connection

Configure libpq without placing a password in a command argument. One option is a mode 600 `PGPASSFILE` plus `PGHOST`, `PGPORT`, `PGUSER`, and `PGDATABASE`. The classifier loader can instead read `DATABASE_URL` from a local `.env` file:

```bash
cp .env.example .env
chmod 600 .env
```

Never commit `.env`.

## 1. Export import files

From the repository root:

```bash
make deps
Rscript R/export_for_db.R
```

This writes `data/db/works.csv`, `data/db/screened.csv`, `data/db/findings.json`, and `data/db/retractions.csv` when the retraction source is present. Abstracts are excluded from the 4.3 million row works table because the source inverted indexes account for most of the text volume. The 1,000 recorded screening payloads retain their abstracts as evidence.

## 2. Create and load the base schema

The following commands assume libpq connection variables are already configured:

```bash
psql -v ON_ERROR_STOP=1 -f deploy/schema.sql
psql -v ON_ERROR_STOP=1 -c "\copy works FROM 'data/db/works.csv' WITH (FORMAT csv, HEADER true)"
psql -v ON_ERROR_STOP=1 -c "\copy screened FROM 'data/db/screened.csv' WITH (FORMAT csv, HEADER true)"
psql -v ON_ERROR_STOP=1 -c "\copy retractions FROM 'data/db/retractions.csv' WITH (FORMAT csv, HEADER true)"
psql -v ON_ERROR_STOP=1 -f deploy/normalize.sql
psql -v ON_ERROR_STOP=1 -f deploy/indexes.sql
```

Skip the retractions copy only when that optional source was not exported. `normalize.sql` must run after the copy and before the indexes. It resolves imported null booleans, enforces frame invariants, and stops on an orphaned work with no admission route.

## 3. Load direct machine labels

`deploy/load_labels.py` validates every label against the batch that admitted it and emits one idempotent SQL transaction:

```bash
uv run python deploy/load_labels.py | psql -v ON_ERROR_STOP=1
```

Rows absent from the frozen frame are reported and skipped. Missing labels remain unknown; they are never converted to negative labels.

## 4. Load the classifier release

The loader validates the model metadata, prediction contract, row count, hashes, score packing, target order, and frame coverage before emitting the atomic load:

```bash
METACAN_ENV_FILE=.env ./deploy/load-classifier-release.sh \
  /path/to/metacan-v1-full-frame-predictions.parquet \
  artifacts/frame_classifier/metadata.json \
  /path/to/metacan-v1-full-frame-predictions.parquet.json
```

The expected release contains 4,299,418 prediction rows. It stores candidate and consensus decisions separately and keeps both teacher score vectors.

## 5. Verify the result

```sql
SELECT COUNT(*) AS works FROM works;
SELECT COUNT(*) AS screened FROM screened;
SELECT COUNT(*) AS labelled_works FROM (SELECT DISTINCT id FROM work_label) x;
SELECT version, active, row_count FROM classifier_model ORDER BY created_at DESC;
SELECT COUNT(*) AS predictions FROM work_prediction
WHERE classifier_version = 'metacan-v1-d91a1de5be90';
SELECT COUNT(*) AS route_orphans FROM works
WHERE NOT route_ca_aff
  AND NOT route_ca_fund
  AND NOT route_ca_venue
  AND NOT route_about_ca;
```

The frozen release requires 4,299,418 works, 4,299,418 predictions for the active classifier, and zero route orphans. Direct label coverage is intentionally sparse and should be reported rather than treated as missing negatives.

## Web application migrations

After the base database exists, switch to the `webapp` branch and apply its Prisma migration history. The baseline checker distinguishes a fresh database, a resolved baseline, a complete legacy schema, and an unsafe partial schema.
