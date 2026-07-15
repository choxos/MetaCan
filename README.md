# MétaCan web application

This branch contains the deployable MétaCan website. The research methods, frozen frame construction, screening records, classifier pipeline, database loaders, and release evidence live on the [`main`](https://github.com/choxos/MetaCan/tree/main) branch.

The application is a bilingual Next.js interface over the frozen 4,299,418 work frame and a separate rolling OpenAlex layer. Classifier output is presented as unvalidated teacher imitation. It is never presented as scientific truth or a prevalence estimate.

## Main surfaces

- `/`: faceted cohort builder over the frozen frame
- `/recent`: rolling Canadian work layer, updated from OpenAlex
- `/landscape`: frame, route, label, and collaboration summaries
- `/screen`: direct machine screening evidence
- `/api-docs`: public API reference
- `/fr`: French interface

## Requirements

- Node.js 22
- PostgreSQL 16
- A database populated by the pipeline on the `main` branch
- An OpenAlex API key for scheduled recent work updates

## Local setup

```bash
cp .env.example .env
npm ci
npm run db:preflight
npm run db:migrate
npm run dev
```

Set `DATABASE_URL` in `.env`. Set `OPENALEX_API_KEY` only when testing the recent work updater. Never commit `.env`.

## Validation

```bash
npm run check
npm audit --audit-level=high
npm run build
```

The migration baseline supports both a fresh database and the existing production schema. `npm run db:preflight` refuses a partial legacy schema instead of guessing.

## Recent work update

The rolling layer is intentionally separate from the frozen release. A keyed update retrieves a complete publication window, evaluates the four recorded Canadian routes, and replaces that window only after successful retrieval.

```bash
npm run sync:recent -- --days 30
```

The accepted window is 15 through 30 days. Production uses `--if-stale-hours 20` so overlapping scheduled runs do not repeat a fresh update.

## Deployment

Production deployment instructions and health checks are in [`DEPLOYMENT.md`](DEPLOYMENT.md). Nginx configuration is versioned under [`ops/nginx`](ops/nginx).

## Licence

The application code is licensed under MIT. See [`LICENSE`](LICENSE).
