# Release PRD: Hydration Doctor 0.9.0

**Status:** Implemented; issue #31 closed
**Audience:** CI systems that ingest test results

## Problem

Hydration Doctor emits terminal, JSON, and HTML reports, but many CI test dashboards accept JUnit XML and cannot ingest the scan result directly.

## Goal

Add an opt-in `junit` reporter that maps each scan scenario to a test case and reports failures and inconclusive checks with valid, safely escaped XML.

## Requirements

- Accept `junit` in config and CLI reporter selection and export `formatJUnitReport` from the package API.
- Emit one testcase per scenario, suite totals and durations where available, failure elements for failed scenarios, and skipped elements for inconclusive scans.
- Write output with existing exclusive-create and owner-only permission behavior, including multi-reporter output directories.
- Escape XML markup and attributes; replace XML 1.0-invalid code points; sanitize URLs and redact credentials/secrets in direct reporter input.
- Add documentation and tests for passing, failing, inconclusive, multi-reporter, hostile XML, and secret-bearing input.

## Adversarial review

Probe attribute injection, illegal XML control characters, Unicode edge cases, secrets in route/findings, and output overwrite/path behavior. Fix concrete issues and record what remains sensitive by design.

## Non-goals

- Native GitHub Actions annotations or a proprietary CI integration.
- Changing scan pass/fail semantics.
- Publishing a package release.

## Verification and completion

Run focused reporter/config/CLI tests, `npm run check`, and `npm run test:consumer`; commit the adversarial review record and close the linked issue with evidence.

## Delivery

- Issue: [#31](https://github.com/shivam039/hydration-doctor/issues/31)
- Adversarial review: [iteration 0.9 review](../security/ADVERSARIAL_REVIEW_v0.9.0.md)
- Verification: reporter tests, complete repository checks, packed consumer scan, and Node matrix CI.
