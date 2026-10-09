# Release readiness assessment

**Status: not ready for a stable 1.0 release.** Experimental version 0.32.0 is published on npm through the GitHub Actions trusted publisher with provenance. The initial 0.27.0 publication predates this configuration and has no GitHub Actions provenance attestation. Version 0.32.0 remains pre-1.0 and does not close the compatibility or stability gaps below.

## Verified foundation

- Package size baseline from `npm pack --dry-run --json`: 0.32.0 is 83,403 packed bytes, 297,587 unpacked bytes, and 91 files. Initial budgets are 102,400 packed bytes, 358,400 unpacked bytes, and 110 files; they cover the npm artifact, not dependency install size or browser downloads. See [bundle/v1 PRDs](releases/PRD_bundle-v1_01-baseline.md) and [issue #84](https://github.com/shivam039/hydration-doctor/issues/84).

- Node.js 20, 22, and 24 CI matrix with lint, unit/integration/CLI/browser tests, format check, package dry-run, and packed-consumer browser scan.
- The consumer scan installs the tarball into a clean temporary project and scans a local HTTP fixture using the installed CLI.
- The public API export names and representative behaviors have contract tests. JSON output declares `schemaVersion: 1`; additive fields and pre-1.0 API changes are documented.
- Report v1 has a published Draft 2020-12 JSON Schema; an opt-in JUnit XML reporter is escaped, redacted, and covered by CLI/API tests.
- `scan` honors AbortSignal cancellation through active browser contexts and awaits concurrent worker cleanup before rejecting.
- Static analysis recognizes browser-global `typeof` guards and exact line-level rule suppressions across JS/JSX and TS/TSX. JSON/SARIF expose only a suppression count; source text is not copied.
- Configured snapshots compare direct route output with client-side navigation output. Form interactions cover select/check/uncheck state with redacted evidence.
- Pinned Next.js 15.5.26 production App and Pages Router fixtures verify direct load, refresh, `<Link>` transitions, target readiness, and browser back/forward. App Router evidence also covers nested Suspense streaming, a route-level loading boundary during client navigation, and deterministic ready/stalled application markers.
- CI runs the full suite on Node.js 20, 22, and 24 with Chromium and targeted healthy/missing-UI smoke checks on Chromium, Firefox, and WebKit with Playwright 1.63.0. The non-Chromium checks remain smoke coverage only.
- Security limits and residual findings are recorded in the [adversarial review](security/ADVERSARIAL_REVIEW_2026-09-27.md). The [master epic roadmap](roadmap/MASTER_EPIC.md) records remaining scope.
- Release metadata, changelog, experimental disclaimer, and explicit publication checklist are maintained together. See [CHANGELOG.md](../CHANGELOG.md) and the [release process](RELEASING.md). Version 0.32.0 is a cumulative early experimental release; this is not a stable 1.0 readiness claim.

## Release blockers

- Next.js 15.5.26 App and Pages Router fixtures pass development and production direct-load/refresh scans; production App Router fixtures also verify path-only, query-driven, and one route-level loading `<Link>` transition, Suspense streaming, and one delayed client `import()` readiness pattern. Other advanced routing/rendering behaviors remain unverified.
- Visual comparison supports opt-in persistent PNG baselines with explicit update mode and path/symlink checks. Route-level Chromium profiles cover desktop (1280×800), tablet (768×1024), and emulated iPhone SE (320×568) on one fixture. This does not establish physical-device or cross-browser visual coverage.
- AST analysis covers documented JavaScript/JSX and TypeScript/TSX candidate patterns, exact line suppressions, configurable bounded source exclusions, and JSON/SARIF output. It does not understand execution timing or a complete set of hydration hazards.
- Continuous fixture coverage includes local-storage restoration, local anonymous/authenticated flows, nested production Suspense streaming, delayed client import, input reset, ready/stalled state markers, readiness-gated keyboard/form interactions, and one local slow/fast API response race. Real identity providers, alternative streaming strategies, and actual slow CPU/network conditions remain unverified.
- Public APIs and configuration remain pre-1.0 with no cross-release stability promise or migration guarantees. Report schema v1 documents the current shape; it does not promise compatibility across 0.x releases.

Run `npm run check`, `npm pack --dry-run`, and `npm run test:consumer` for local reproducible checks. A passing matrix validates the current supported foundation; it does not clear the blockers above. Future package publications use the protected trusted-publisher workflow.
