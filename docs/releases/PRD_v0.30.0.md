# Hydration Doctor 0.30.0 — Streamed App Router Client Transitions

**Status:** roadmap increment included in cumulative npm release 0.32.0; not published separately.

## Problem

Production fixtures verify streamed content on direct loads and verify client transitions into immediately ready destinations. They do not verify the route-level loading UI and asynchronous content sequence during a client transition.

## Scope

- Add a production App Router source route and a dynamic server destination under a `loading` boundary.
- Verify the fallback appears before destination readiness and is replaced by the expected content.
- Verify the scanner observes the destination URL/content without a full document request.
- Check bounded readiness expectations and record exact compatibility limits.

## Acceptance criteria

- A pinned Next.js 15.5.26 / React 18.3.1 production fixture shows the loading fallback during a `<Link>` transition before the ready marker appears.
- The scanner verifies direct load, refresh, route readiness, and client-navigation behavior.
- A controlled server delay exposes the fallback, while assertions rely on visible fallback/readiness markers rather than sleep-only success.
- Missing expected content remains a bounded failure; no generic streaming compatibility is claimed.
- `npm run check`, `npm pack --dry-run`, `npm run test:consumer`, and CI pass.
- Adversarial review covers fallback ordering, prefetch behavior, timeouts, and overstatement before merge.

## Tracking

- Implementation issue: [#77](https://github.com/shivam039/hydration-doctor/issues/77)
- Adversarial review: [0.30.0 review](../security/ADVERSARIAL_REVIEW_v0.30.0.md)
