# Contributing to the MétaCan web application

Open application, API, Prisma migration, and interface changes against `webapp`. Open frame, methods, screening, classifier, and base database changes against `main`.

## Local checks

```bash
npm ci
npm run check
npm audit --audit-level=high
npm run build
```

Use a local PostgreSQL database for migration checks. Do not place production credentials or records in an issue, pull request, test fixture, or log.

## Evidence requirements

- Keep frozen and rolling records visibly separate.
- Keep direct labels, provisional scores, and classifier output distinct.
- Treat missing coverage as unknown.
- Preserve exact upstream abstract headings and paragraph structure.
- Update English and French interface text together.
- Update FAIR metadata, API documentation, and tests when a public contract changes.
