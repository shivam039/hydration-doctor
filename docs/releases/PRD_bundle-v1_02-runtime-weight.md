# PRD: Bundle and v1 readiness — 02, reduce runtime weight safely

**Status:** Planned  
**Depends on:** [01 baseline](PRD_bundle-v1_01-baseline.md)  
**GitHub issue:** [#85](https://github.com/shivam039/hydration-doctor/issues/85)

## Goal

Reduce clean consumer install and runtime cost based on measured evidence without changing scan results, supported browser behavior, or documented APIs.

## Acceptance

- Profile install/runtime dependency weight and identify the largest modules and imports.
- Separate optional reporters, analysis, or browser capabilities only where loading remains backward-compatible.
- Remove or replace dependencies only with parity tests and a measured before/after result.
- Keep Playwright/browser availability errors actionable and the clean packed consumer scan passing.
- No arbitrary size reduction target: set targets after profile data; document any tradeoff.

## Adversarial review

Look for lazy-loading races, altered CLI startup/errors, accidental omission of exported APIs, tree-shaking assumptions that do not apply to Node consumers, and dependency replacements with weaker security or parsing behavior.

## Verification

Benchmark representative CLI paths, compare package/install metrics to PRD 01, run focused parity tests, full checks, and consumer/browser smoke. No npm publication in this increment.
