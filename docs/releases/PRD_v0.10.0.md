# Release PRD: Hydration Doctor 0.10.0

**Status:** Implemented; issue #32 closed
**Audience:** Library callers cancelling long-running scans

## Problem

The scan API accepts an `AbortSignal` and checks it between queued scenarios, but an active browser navigation or readiness wait can continue until its timeout. Cancellation should stop in-flight work and clean up browser resources promptly.

## Goal

Make scan cancellation prompt, deterministic, and observable to API callers without turning cancellation into an ordinary failed scenario report.

## Requirements

- Aborting before a scan, during navigation, and during configured waits rejects the scan with the supplied abort reason (or a stable cancellation error).
- Close active pages/contexts and the browser when cancellation occurs; remove abort listeners on normal completion.
- Do not return a misleading partial report or classify cancellation as a hydration/application failure.
- Document AbortSignal behavior and test resource cleanup and listener cleanup.

## Adversarial review

Exercise already-aborted signals, abort races around browser launch and page creation, repeated aborts, caller-provided reasons containing secrets, and concurrent workers. Fix leaks, hangs, or unredacted errors found.

## Non-goals

- Adding CLI signal handling changes beyond existing process termination behavior.
- Resumable scans or partial reports.
- Publishing a package release.

## Verification and completion

Run focused cancellation tests, `npm run check`, and `npm run test:consumer`; commit the review record and close the issue with evidence.

## Delivery

- Issue: [#32](https://github.com/shivam039/hydration-doctor/issues/32)
- Adversarial review: [iteration 0.10 review](../security/ADVERSARIAL_REVIEW_v0.10.0.md)
- Verification: pre-abort, concurrent in-flight abort, reason propagation, listener cleanup, full checks, and packed-consumer scan.
