# Changelog

This file records repository roadmap increments. A heading marked **Unreleased** is not an npm publication. Published package versions, if any, must be verified against the npm registry and listed separately under Published releases.

## 0.32.0 — Release candidate 2026-10-09

- Cumulative experimental release with production App Router query-driven navigation, dynamic segments, streamed client transitions, delayed-response state-race coverage, and release-record validation.
- Roadmap PRDs 0.28.0–0.31.0 are included in this package release; those increments were not published as separate npm versions.
- This candidate is not published yet. The tag-triggered trusted-publisher workflow will publish `hydration-doctor@0.32.0` and generate npm provenance.

## 0.27.0 — Published 2026-09-27

- Publish the verified support matrix and explicit pre-1.0 compatibility limits.
- Add migration guidance stating that 0.x changes have no migration guarantee.
- Pin route viewport/device configuration and static-analysis behavior in contract tests.
- Published on npm as [`hydration-doctor@0.27.0`](https://www.npmjs.com/package/hydration-doctor/v/0.27.0). The initial publication used an authenticated maintainer session before the trusted publisher was configured; it has a registry signature but no GitHub Actions provenance attestation.

## 0.26.0 — Unreleased roadmap increment

- Add nested production Suspense streaming and deterministic readiness-state race fixtures.
- This roadmap increment has not been published to npm and has no release tag.

## 0.25.0 — Unreleased roadmap increment

- Add per-route desktop, tablet, and emulated iPhone SE visual profiles.
- This roadmap increment has not been published to npm and has no release tag.

## 0.24.0 — Unreleased roadmap increment

- Add production Pages Router client navigation evidence and compatibility boundaries.
- This roadmap increment has not been published to npm and has no release tag.

## 0.23.0 — Unreleased roadmap increment

- Add experimental pre-1.0 and compatibility disclaimers to package metadata and documentation.
- Add release checklist and version-aligned changelog discipline.
- This version has not been published to npm and has no release tag.

## Published releases

The npm registry reports [`hydration-doctor@0.27.0`](https://www.npmjs.com/package/hydration-doctor/v/0.27.0), published 2026-09-27. Registry integrity and signature were verified. Future versions are intended to publish through the GitHub Actions trusted publisher in `.github/workflows/publish.yml`, which automatically emits provenance.
