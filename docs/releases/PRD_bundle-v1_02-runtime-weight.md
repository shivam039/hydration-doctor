# PRD: Bundle and v1 readiness — 02, reduce runtime weight safely

**Status:** Implementation complete; awaiting CI and merge

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

## Profile and implementation result

On a clean consumer install of the 0.32.0 tarball, `node_modules` occupied 48,248 KiB on this macOS filesystem (about 47.1 MiB). Playwright plus `playwright-core` accounted for 18,680 KiB; TypeScript plus `@typescript-eslint/typescript-estree` accounted for 25,604 KiB. The remaining direct dependencies (`espree`, `minimatch`, and `pngjs`) accounted for about 1.5 MiB including filesystem allocation. These are installed-tree measurements, not npm download bytes, and filesystem block allocation varies by platform.

Removing Playwright would break the core browser scan; removing TypeScript parsing or ESPree would break advertised TS/JS static analysis. No dependency was removed. Instead, CLI startup now imports browser/config/scan modules only for `doctor` or `scan`, and static-analysis modules only for `analyze`. The public export surface and command behavior are unchanged.

With 15 fresh Node.js 24.14.1 processes on this development machine, `--help` median startup fell from 247.0 ms to 20.1 ms (about 91.9%); `--version` fell from 247.5 ms to 23.4 ms (about 90.5%). `npm run profile:startup` reproduces the measurement. This improves common CLI startup and resident module loading; it does not reduce clean-install dependency disk usage.

The post-change tarball measures 88,890 packed bytes, 313,060 unpacked bytes, and 98 files. The increase from the previous artifact reflects the new release PRD and adversarial review documents shipped under the existing `docs/` package policy; it remains within the iteration 01 budgets. This change does not claim a tarball-size reduction.

## Adversarial review

Look for lazy-loading races, altered CLI startup/errors, accidental omission of exported APIs, tree-shaking assumptions that do not apply to Node consumers, and dependency replacements with weaker security or parsing behavior.

## Verification

Benchmark representative CLI paths, compare package/install metrics to PRD 01, run focused parity tests, full checks, and consumer/browser smoke. No npm publication in this increment.
