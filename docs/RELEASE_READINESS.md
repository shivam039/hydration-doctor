# Release readiness assessment

**Status: not ready for a stable 1.0 release.** This project is at version 0.1.0; no npm release has been published.

## Verified foundation

- Node.js 20, 22, and 24 CI matrix with lint, unit/integration/CLI/browser tests, format check, package dry-run, and packed-consumer browser scan.
- The consumer scan installs the tarball into a clean temporary project and scans a local HTTP fixture using the installed CLI.
- The public API export names and representative behaviors have contract tests. JSON output declares `schemaVersion: 1`; additive fields and pre-1.0 API changes are documented.
- Security limits and residual findings are recorded in the [adversarial review](security/ADVERSARIAL_REVIEW_2026-09-27.md). The [master epic roadmap](roadmap/MASTER_EPIC.md) records remaining scope.

## Release blockers

- Next.js 15.5.26 App and Pages Router fixtures now pass both development and production direct-load/refresh scans. Advanced routing/rendering behaviors remain unverified.
- Visual comparison supports opt-in persistent PNG baselines with explicit update mode and path/symlink checks. A desktop/mobile fixture matrix remains unimplemented.
- AST analysis currently covers only documented JS/JSX candidate patterns; it does not understand TypeScript, execution timing, or a complete set of hydration hazards.
- Continuous fixture coverage now includes a browser-local-storage restoration regression; it does not yet cover all capabilities named in the master epic, including streaming, delayed imports, authentication-dependent state, and broader state races.
- Public APIs and configuration remain pre-1.0 and are not promised stable. No migration guarantees have been established.

Run `npm run check` and `npm run test:consumer` for local reproducible checks. A passing matrix validates the current supported foundation; it does not clear the blockers above. Package publication remains a separate explicit release decision.
