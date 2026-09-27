# Release PRD: Hydration Doctor 0.12.0

**Status:** Implemented; issue #34 closed
**Audience:** Teams using Firefox or WebKit in production support matrices

## Problem

The runtime accepts Chromium, Firefox, and WebKit, but continuous integration installs and verifies only Chromium. The advertised engine options therefore lack repeatable project-owned smoke evidence.

## Goal

Add a small deterministic browser-engine smoke suite and a dedicated Node 22 CI matrix for Chromium, Firefox, and WebKit.

## Requirements

- Exercise a healthy local fixture and a configured missing-UI failure in each supported Playwright engine.
- Assert the expected pass/fail classifications and verify browser processes/servers close after each engine run.
- Install only the browser needed by each matrix leg; preserve the existing Node 20/22/24 Chromium full suite.
- Document exact engine smoke coverage and its limits; do not claim full cross-browser compatibility from a smoke test.

## Adversarial review

Review matrix permissions, browser install scope, fixture network boundaries, cleanup on assertion failure, and whether the smoke evidence overstates compatibility. Fix concrete issues and record residual coverage gaps.

## Non-goals

- Running the full long Next.js build suite on every browser engine.
- Claiming browser-version coverage beyond the pinned Playwright build.
- Publishing a package release.

## Verification and completion

Run the engine smoke suite for all three engines, `npm run check`, and `npm run test:consumer`; verify the dedicated CI matrix and close the issue with evidence.

## Delivery

- Issue: [#34](https://github.com/shivam039/hydration-doctor/issues/34)
- Adversarial review: [iteration 0.12 review](../security/ADVERSARIAL_REVIEW_v0.12.0.md)
- Verification: Node 22 smoke matrix for Chromium/Firefox/WebKit, full Chromium test suite, and packed-consumer scan.
