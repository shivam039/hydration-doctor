# Hydration Doctor 0.32.0 — Release Record Consistency

**Status:** release candidate for npm version 0.32.0; publication and provenance validation are pending.

## Problem

Release automation checks that a pushed tag matches `package.json`, but repository metadata can still drift: the package version may lack a dated published changelog entry or its versioned PRD. The changelog also tracks unreleased roadmap increments, which must not be confused with npm releases.

## Scope

- Add a read-only release-record checker for the package version, changelog publication status, and matching release PRD.
- Run the checker in the standard repository check and before trusted-publisher release checks.
- Add positive and negative tests for missing, duplicate, malformed, and unreleased records.
- Link this PRD and the adversarial review to tracking issue #79 and the implementation PR.

## Acceptance criteria

- The checker verifies exactly one dated `Published` changelog heading matching `package.json.version` and an existing `docs/releases/PRD_v<version>.md`.
- Unreleased roadmap entries remain allowed but cannot satisfy the published package-version record.
- Malformed package JSON/version and missing or duplicate release entries fail with actionable messages.
- `npm run check`, `npm pack --dry-run`, and `npm run test:consumer` pass.
- The release commit aligns `package.json`, `package-lock.json`, the changelog candidate entry, and this versioned PRD. The trusted-publisher workflow verifies and publishes the matching `v0.32.0` tag.
- Adversarial findings and residual limitations are recorded before merge.

## Tracking

- Implementation issue: [#79](https://github.com/shivam039/hydration-doctor/issues/79)
- Adversarial review: [0.32.0 review](../security/ADVERSARIAL_REVIEW_v0.32.0.md)
