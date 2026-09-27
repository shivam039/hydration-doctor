# Release readiness assessment

**Status: not ready for a stable 1.0 release.** This project is at version 0.1.0; no npm release has been published.

## Verified foundation

- Node.js 20, 22, and 24 CI matrix with lint, unit/integration/CLI/browser tests, format check, package dry-run, and packed-consumer browser scan.
- The consumer scan installs the tarball into a clean temporary project and scans a local HTTP fixture using the installed CLI.
- The public API export names and representative behaviors have contract tests. JSON output declares `schemaVersion: 1`; additive fields and pre-1.0 API changes are documented.
- Security limits and residual findings are recorded in the [adversarial review](security/ADVERSARIAL_REVIEW_2026-09-27.md). The [master epic roadmap](roadmap/MASTER_EPIC.md) records remaining scope.

## Release blockers

- No tested Next.js App Router or Pages Router fixture matrix.
- No screenshot baseline/diff implementation or visual fixture evidence.
- No AST-based static-analysis capability.
- Continuous fixture coverage does not yet cover all capabilities named in the master epic, including streaming, delayed imports, auth/storage restoration, and broader state races.
- Public APIs and configuration remain pre-1.0 and are not promised stable. No migration guarantees have been established.

Run `npm run check` and `npm run test:consumer` for local reproducible checks. A passing matrix validates the current supported foundation; it does not clear the blockers above. Package publication remains a separate explicit release decision.
