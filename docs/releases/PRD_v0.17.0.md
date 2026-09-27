# Hydration Doctor 0.17.0 — Delayed Client Module Compatibility

## Problem

The compatibility documentation has no dedicated fixture for client modules loaded after the initial render. A delayed import can expose readiness races that ordinary direct-load checks miss.

## Scope

- Add a deterministic Next.js App Router fixture with a client component loaded after a controlled delay.
- Verify configured readiness waits for the delayed content and missing content remains a bounded failure.
- Run the fixture against a production build and document the tested Next.js/React versions and limitations.
- Keep the fixture local and deterministic; do not introduce external services or timing-only success criteria.

## Acceptance

1. The healthy route proves fallback appears before delayed client content, then reaches configured readiness.
2. A missing-content variant fails within the configured timeout and is not classified as a confirmed hydration error.
3. Production fixture tests clean up processes even on failure.
4. Compatibility and fixture inventory docs match the verified behavior.

## Risks and boundaries

This adds evidence for one pinned Next.js loading pattern, not general dynamic-import or framework coverage. Readiness is based on configured UI evidence, not an arbitrary sleep.

## Verification

Run focused production fixture tests, repository checks and consumer smoke, review timeout/process cleanup adversarially, then close the linked issue with CI evidence.
