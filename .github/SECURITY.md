# Security Policy

## Supported surfaces

Security reports are accepted for the current `main` research pipeline, the current `webapp` branch, and the deployed application at `metacan.xera.ac`.

## Reporting a vulnerability

Do not report security vulnerabilities in public issues. Use GitHub private vulnerability reporting when available. Otherwise, email <ahmad.pub@gmail.com>.

Include the affected branch or URL, steps to reproduce, impact, and any known mitigation. Do not include live credentials, private records, or unrestricted production database output.

## Scope

In scope:

- Code execution, injection, path traversal, unsafe file handling, or unauthorized database access.
- Exposure of credentials, private data, or restricted metadata.
- Unsafe handling of untrusted OpenAlex, PubMed, Europe PMC, JSON, CSV, SQL, or URL input.
- Authentication, rate limit, export, permalink, or deployment weaknesses with a concrete security impact.

General disagreement with a research classification or FAIR score is not a security vulnerability.
