# Hydration Doctor 0.31.0 — Delayed Responses and State Races

**Status:** roadmap increment; not an npm publication.

## Problem

Existing fixtures test readiness markers and local state restoration, but do not cover overlapping production App Router requests where an older response can overwrite the newer selection. A scanner must wait for requests to settle before it can observe that stale state.

## Scope

- Add a local production App Router fixture with controlled fast and slow account responses.
- Add a latest-request-wins page and an intentionally stale-response control page.
- Use scanner interactions to start both requests and wait for an explicit all-settled marker.
- Verify that the correct page passes with the latest selection and the stale control is reported as a visible UI expectation failure.

## Acceptance criteria

- A production Next.js 15.5.26 / React 18.3.1 fixture starts overlapping local requests with distinct bounded response delays.
- The latest-wins route finishes on the fast request's content even after the slow request completes.
- The stale control deterministically finishes on old content and fails the expected UI assertion without being mislabeled as a hydration mismatch.
- Direct load, refresh, and client navigation all exercise the configured interactions and bounded settled marker.
- The fixture uses only local fake account labels and makes no real identity-provider or CPU/network benchmark claim.
- `npm run check`, package dry run, packed-consumer scan, and CI pass.
- Adversarial findings and residual limitations are linked before merging.

## Tracking

- Implementation issue: [#78](https://github.com/shivam039/hydration-doctor/issues/78)
- Adversarial review: [0.31.0 review](../security/ADVERSARIAL_REVIEW_v0.31.0.md)
