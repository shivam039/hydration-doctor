# Hydration Doctor 0.26.0 — Nested Streaming and State Readiness Races

## Problem

The production Next.js fixture verifies one Suspense boundary, while nested/independent fallback ordering and browser state changes racing readiness are not covered.

## Scope and acceptance

- Add a production nested Suspense route with two controlled server delays.
- Observe the outer fallback, outer content, inner fallback, and inner content in that order.
- Add local-browser ready/stalled state fixtures where a readiness marker appears after initial markup or never appears.
- Require deterministic ready-state success, bounded failure, and no hydration diagnosis without separate evidence.

## Adversarial review

Check streamed order rather than sleep durations, keep readiness tied to application-owned selectors, bound failed expectations, confirm test server cleanup, and verify retries are not used to turn intermittent failure into a pass.

## Verification

Production fixture tests require nested fallback order and final scan readiness; local scan tests cover ready and stalled state routes across direct load and refresh. Full checks and CI matrix precede issue closure.
