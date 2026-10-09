# Hydration Doctor 0.28.0 — Query-Driven App Router Navigation

**Status:** roadmap increment; not an npm publication.

## Problem

The production compatibility fixture verifies path-only App Router `<Link>` transitions. Applications also derive server-rendered destination content from query parameters. A transition can update the URL while leaving stale or incorrect UI, so path-only evidence misses this state.

## Scope

- Add a deterministic production App Router source and destination where a query parameter selects rendered content.
- Verify direct load, scanner-driven client navigation, URL, readiness, and visible destination text.
- Verify browser back and forward restore the matching URL and query-selected content.
- Record the pinned framework versions and limitations in compatibility and fixture inventory docs.

## Acceptance criteria

- The query-driven destination is exercised against a production build on the pinned Next.js 15.5.26 / React 18.3.1 fixture.
- The client transition reaches the expected query URL and rendered state without a document request.
- Back/forward history checks verify both URL and selected content.
- Tests use deterministic UI state and bounded waits; no external identity services or secrets are involved.
- The packed-consumer smoke installs a browser matching the Playwright version resolved by the clean consumer install.
- `npm run check`, `npm run test:consumer`, and CI pass.
- This evidence is limited to one query-driven fixture and does not claim comprehensive RSC or routing compatibility.

## Tracking

- Implementation issue: [#73](https://github.com/shivam039/hydration-doctor/issues/73)
- Adversarial review: [0.28.0 review](../security/ADVERSARIAL_REVIEW_v0.28.0.md)

## Adversarial review

Review URL/UI disagreement, history traversal, false pass on a full document request, dynamic route output, and overstatement of the compatibility scope before merge.
