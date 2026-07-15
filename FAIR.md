# FAIR implementation

The MétaCan web application follows the FAIR principles as research software and as an access layer for the frozen frame. It links every served interpretation back to the versioned research pipeline on `main`.

## Findable

- `CITATION.cff`, `codemeta.json`, and `ro-crate-metadata.json` describe the application, author ORCID, version, licence, runtime, repository, live URL, and relationship to the research pipeline.
- The live site publishes the same metadata files and advertises them through HTTP `Link` headers.
- `robots.txt` and the generated sitemap expose stable human routes to web crawlers.
- OpenAlex identifiers and classifier versions remain visible in records, APIs, and citable cohort links.

## Accessible

- The source branch and live site are publicly readable over HTTPS.
- Public JSON APIs are documented at `https://metacan.xera.ac/api-docs`.
- Credentials are required only for database writes and scheduled OpenAlex updates. They are not required to browse the source or public interface.
- Upstream abstract retrieval declares PubMed, Europe PMC, or OpenAlex provenance on each resolved record.

## Interoperable

- Metadata uses CFF, CodeMeta JSON-LD, and RO-Crate JSON-LD.
- APIs return JSON and cohort exports support JSON or CSV.
- The application retains standard DOI, PMID, PMCID, and OpenAlex identifiers.
- Structured abstract headings are preserved only when supplied by the source. Unstructured text retains its original paragraph structure.

## Reusable

- Application code is MIT licensed.
- `package-lock.json`, Prisma migrations, CI, tests, the design contract, and the deployment guide document the executable environment.
- The source distinguishes frozen records, rolling recent records, direct machine screening, provisional scores, and classifier output.
- The `main` branch preserves the protocol, data licences, frame hashes, model hashes, full frame application contract, and methodological limitations.

## Current gaps

- The application has no DOI or external archival deposit yet.
- Human validation of classifier accuracy is incomplete.
- Rebuilding a populated instance requires the large database artifacts documented on `main`.

The interface and metadata disclose these gaps rather than representing availability or validity that has not been established.
