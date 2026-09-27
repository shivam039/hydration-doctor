# Next release PRD: Hydration Doctor 0.3.0

**Status:** Planned  
**Iteration:** 1 of 5  
**Audience:** Developers diagnosing authentication-dependent SSR and browser state

## User problem

An authenticated route may behave differently on direct load and refresh when browser state is missing or restored incorrectly. The current restoration fixture checks a non-sensitive preference, but does not prove authenticated and anonymous flows remain distinguishable or that a redirect can be explicitly expected.

## Goal

Add deterministic evidence for an authentication-dependent route using Playwright `storageState`, and show that expected anonymous redirects pass while authenticated sessions reach protected content. Reports must not expose the configured storage value.

## Non-goals

- Implementing application authentication or handling real credentials.
- Automatically recording or importing browser cookies.
- Proving the root cause of an authentication-dependent difference.
- Publishing a package or declaring APIs stable.

## Acceptance criteria

1. A fixture has a protected route that redirects anonymous browser state to a sign-in page and displays protected content for configured authenticated browser state.
2. The unauthenticated and authenticated routes pass direct-load and refresh checks when their expected URLs and text are configured.
3. An incorrect expected redirect or missing protected content fails with an observed diagnostic.
4. No cookie, storage key, or storage value is copied into the report.
5. Fixture inventory and troubleshooting/configuration documentation describe this tested use.

## Issue

- **HD-NR-4:** authenticated state and expected redirect fixture — tracked as a GitHub issue during iteration 1.

## Verification

Run the focused browser test, then `npm run check` and `npm run test:consumer`. Close the issue only after GitHub Actions passes the supported Node matrix.

## Limitations

This fixture proves browser-visible behavior for one deterministic local application. It does not provide secure credential storage, validate a production identity provider, or establish broad authentication framework compatibility.
