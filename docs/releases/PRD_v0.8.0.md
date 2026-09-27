# Release PRD: Hydration Doctor 0.8.0

**Status:** Implemented; issue #30 closed
**Audience:** CI and tooling authors consuming JSON scan reports

## Problem

Reports declare `schemaVersion: 1`, but consumers have no machine-readable contract to validate report shape or generate typed integrations.

## Goal

Publish a JSON Schema for report version 1 and verify it against a real scan report. Keep the schema additive-friendly so consumers can tolerate fields added within version 1.

## Requirements

- Add a packaged `docs/schema/report-v1.schema.json` using JSON Schema Draft 2020-12.
- Define required top-level fields, statuses, results, diagnostics, event bounds metadata, reproduction steps, and common optional evidence without rejecting additive fields.
- Verify a real browser scan report against the schema and prove invalid major versions/required fields are rejected.
- Link the schema from API and report documentation and describe compatibility expectations.

## Adversarial review

Review whether the contract accidentally permits a missing or unsupported schema version, rejects valid optional evidence, or exposes sensitive values through example fixtures. Fix each concrete finding and record residual limits.

## Non-goals

- Changing report output or promising pre-1.0 API stability.
- Freezing every diagnostic prose string or incidental field.
- Publishing a 1.0 release.

## Verification and completion

Run the focused schema contract test, `npm run check`, and `npm run test:consumer`. Close the linked issue with the commit and verification evidence after the schema and adversarial review are committed.

## Delivery

- Issue: [#30](https://github.com/shivam039/hydration-doctor/issues/30)
- Adversarial review: [iteration 0.8 review](../security/ADVERSARIAL_REVIEW_v0.8.0.md)
- Verification: real Chromium scan report validated against the schema; full repository and packed-consumer checks passed.
