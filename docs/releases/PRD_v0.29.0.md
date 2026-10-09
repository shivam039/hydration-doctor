# Hydration Doctor 0.29.0 — Dynamic App Router Segments

**Status:** roadmap increment included in the cumulative 0.32.0 release candidate; not published separately.

## Problem

Current production App Router fixtures cover static path and query-driven destinations. A dynamic route parameter can select server-rendered content, and a client transition can reach the right URL while rendering stale or incorrect data.

## Scope

- Add a production App Router source and dynamic `[slug]` destination fixture.
- Verify the selected path and rendered readiness text on direct load, refresh, and client-side navigation.
- Verify browser back and forward restore the source and selected dynamic destination.
- Update compatibility and fixture inventory docs with exact limits.

## Acceptance criteria

- The fixture passes against the pinned Next.js 15.5.26 / React 18.3.1 production build.
- Scanner-driven navigation reaches the exact `activity` segment and matching rendered content without a document request.
- Back/forward checks assert both location and route-specific content.
- The fixture remains local and deterministic and does not claim all dynamic routes, catch-all routes, or RSC patterns.
- `npm run check`, `npm pack --dry-run`, `npm run test:consumer`, and CI pass.
- Adversarial findings are recorded and linked before merge.

## Tracking

- Implementation issue: [#75](https://github.com/shivam039/hydration-doctor/issues/75)
- Adversarial review: [0.29.0 review](../security/ADVERSARIAL_REVIEW_v0.29.0.md)
