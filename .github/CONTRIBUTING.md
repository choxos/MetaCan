# Contributing to MétaCan

Contributions should preserve scientific traceability, explicit uncertainty, and the separation between the frozen research pipeline and the deployable web application.

## Branch scope

- Open methods, frame, screening, classifier, database, documentation, and release changes against `main`.
- Open website, API, Prisma migration, and interface changes against `webapp`.

## Before opening an issue

Search existing issues first. Include a minimal reproducible example, the affected branch and commit, the command or URL used, and the expected and observed behaviour. Do not include credentials, restricted data, unpublished manuscripts, or production database details.

## Development checks

For `main`:

```bash
uv sync --locked --dev
make deps
make check
```

For `webapp`:

```bash
npm ci
npm run check
npm run build
```

## Scientific changes

- Link changes to the protocol, locked rubric, source metadata, or other supporting evidence.
- Preserve immutable source artifacts and update derived outputs through their generators.
- Keep missing labels unknown. Never reinterpret missing coverage as a negative result.
- State whether a result is direct machine screening, classifier output, or human validation.
- Update release hashes and machine readable metadata when a public artifact changes.

## Pull requests

Keep each pull request focused. Describe the reason for the change, the affected evidence contract, and the checks run. By contributing, you agree that your contribution will be distributed under the applicable repository licence.
