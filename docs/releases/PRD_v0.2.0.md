# Next release PRD: Hydration Doctor 0.2.0

**Status:** Implemented, verified, and tracked issues closed
**Audience:** React and Next.js application developers using Hydration Doctor in local development or CI  
**Release intent:** Improve confidence in the existing 0.1.x diagnostic foundation without claiming stable APIs or broad framework coverage.

## Problem

Hydration Doctor can scan direct loads and refreshes in development fixtures and can compare screenshots within one run. Those checks leave an important gap: development mode can behave differently from production, visual comparisons cannot detect drift between separate runs, and the current fixture set does not prove that persisted browser state survives a refresh as expected. These are explicit gaps in the current [release readiness assessment](../RELEASE_READINESS.md).

## Goals

1. Verify both existing Next.js routers against a production build, including direct navigation and refresh.
2. Provide a deterministic fixture and evidence for state restoration across refresh, while preserving the distinction between observed state failure and confirmed hydration errors.
3. Allow an opt-in, user-managed visual baseline to be compared across runs, with safe path handling and actionable report evidence.

## Non-goals

- Declaring Hydration Doctor 1.0 or stabilizing the pre-1.0 public API.
- Supporting every Next.js version, React version, browser, streaming behavior, or dynamic import pattern.
- Treating pixel differences or state differences as proof of a hydration mismatch.
- Generating/updating baselines implicitly during ordinary scans.
- Publishing to npm, merging a PR, or creating a GitHub release.

## Release requirements and acceptance criteria

### R1 — Production Next.js compatibility evidence

- The App Router and Pages Router fixture both build with the repository's pinned Next.js version.
- A production server scan checks direct load and refresh for each route.
- The test cleans up its server process and reports build/start failures as test failures.
- Compatibility documentation identifies the tested version and states the limits of the evidence.

### R2 — State restoration diagnostic fixture

- A deterministic fixture persists a configured value in browser storage and asserts it after refresh.
- The fixture demonstrates a passing expected-restoration case and a failing regression case.
- Findings identify the route/scenario and observed failed assertion; they do not label the result a confirmed hydration mismatch.
- No credential or storage contents are emitted in reports.

### R3 — Explicit persistent visual baselines

- A route may opt into comparison with a baseline image on disk in addition to current in-run comparison.
- Baseline paths are constrained to the configured evidence directory; traversal and symlink escapes are rejected.
- Missing baselines are inconclusive with actionable instructions unless an explicit baseline-update command is used.
- Ordinary scans never write or update baseline files.
- Reports include the baseline comparison dimensions, changed-pixel ratio, threshold, and available diff evidence.
- Tests cover matching images, changed images, missing baselines, invalid paths, and explicit baseline updates.

## Delivery slices

Each slice is tracked in a GitHub issue and must be verified before that issue is closed:

- **HD-NR-1:** production-build Next.js router verification (R1), [issue #23](https://github.com/shivam039/hydration-doctor/issues/23)
- **HD-NR-2:** browser-storage restoration fixture and classification evidence (R2), [issue #24](https://github.com/shivam039/hydration-doctor/issues/24)
- **HD-NR-3:** explicit persistent visual baseline workflow (R3), [issue #22](https://github.com/shivam039/hydration-doctor/issues/22)

## Verification and release decision

Run focused tests for each slice, then `npm run check` and `npm run test:consumer`. GitHub Actions must pass for the supported Node matrix before the issues are closed. Update the compatibility, fixture inventory, and release-readiness documents with only verified evidence. This PRD does not authorize merging the draft PR or publishing a release.

## Risks and limits

Pixel rendering can vary by operating system, fonts, and browser build; baseline use must document the environment. Browser storage may contain secrets, so reports must expose assertion outcomes rather than raw values. Production fixture builds increase test time and may make CI more sensitive to resource limits. The 0.2.0 scope only improves evidence for the pinned fixture environment and does not remove the broader release blockers in the master roadmap.
