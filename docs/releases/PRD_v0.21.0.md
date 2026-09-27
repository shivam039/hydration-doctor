# Hydration Doctor 0.21.0 — Production App Router Navigation Evidence

## Problem

The production Next.js fixture verifies direct loads, refresh, streaming, and delayed imports, but does not verify a framework-owned App Router transition with the scanner.

## Scope and acceptance

- Add a deterministic production App Router `<Link>` and destination page.
- Scan direct target, refresh, and configured client navigation against explicit destination readiness and text.
- Verify the click did not trigger a new document request and browser back/forward returns successfully.
- A missing configured destination expectation is a bounded observed failure, not a hydration diagnosis.
- Record the pinned compatibility scope in fixture documentation.

## Adversarial review

Checked click-specific full-document navigation findings separately from aggregate document counts that can include subsequent history requests. The destination assertion is application-owned and bounded. The negative expectation verifies failure without a hydration claim. Test cleanup registers the server before routes are exercised.

## Verification

Run the production Next.js build fixture, full repository checks, packed consumer scan, and CI matrix before closing the linked issue.
