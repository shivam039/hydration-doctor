# Hydration Doctor 0.24.0 — Production Pages Router Navigation

## Problem

The repository has production App Router client-navigation evidence, while its Pages Router fixture has only direct-load and refresh coverage.

## Scope and acceptance

- Add a production Pages Router `<Link>` and destination route.
- Verify direct destination, refresh, client-side transition readiness, and browser back/forward.
- Require no document request during the link transition; a broken expectation must fail in bounded time without a hydration claim.
- State the exact tested Next.js/React targets and unverified boundaries in compatibility docs.

## Adversarial review

Separate transition-specific no-document evidence from cumulative browser history requests; require explicit destination content and exact URL; bound failure expectations; verify server cleanup is installed before route assertions; avoid claiming other Next.js/React versions are supported.

## Verification

Run the production Next fixture, packed-consumer check, and full CI matrix before closing the issue.
