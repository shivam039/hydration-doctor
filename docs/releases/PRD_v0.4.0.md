# Next release PRD: Hydration Doctor 0.4.0

**Status:** Implemented, verified, and issue #26 closed
**Iteration:** 2 of 5  
**Audience:** Next.js App Router developers using Suspense and streamed server rendering

## User problem

An HTTP document can become available before all streamed server-rendered content is present. A scanner that treats document readiness as application readiness can pass too early or miss delayed content regressions. Current production compatibility fixtures do not exercise this case.

## Goal

Add a deterministic production Next.js App Router fixture with a Suspense fallback and delayed server-rendered content. Verify the scanner waits for configured UI expectations within its timeout and keeps content/readiness failures separate from confirmed hydration findings.

## Non-goals

- Claiming compatibility with all streaming renderers or Next.js versions.
- Depending on React internals or a fixed sleep in the scanner.
- Classifying a missing streamed element as a hydration mismatch.
- Publishing a package or declaring APIs stable.

## Acceptance criteria

1. A production Next.js fixture renders a visible Suspense fallback and later streams the configured ready content.
2. Direct load and refresh scans wait for the configured final selector/text and pass within the configured timeout.
3. A configured final-text assertion that never appears fails within the bound and is reported as missing expected UI/readiness, not hydration.
4. The test uses the production server and cleans it up; build/start errors remain actionable.
5. Compatibility and fixture documents record the exact tested behavior and limits.

## Issue

- **HD-NR-5:** production Suspense streaming and readiness verification — [issue #26](https://github.com/shivam039/hydration-doctor/issues/26).

## Verification

Run the focused Next.js production fixture test, then `npm run check` and `npm run test:consumer`. Close the issue only after GitHub Actions passes the supported Node matrix.

## Limitations

This fixture proves one pinned Next.js App Router path. It does not establish general streaming, Suspense, Server Component, or alternative framework compatibility.
