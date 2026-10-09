# PRD: Bundle and v1 readiness — 01, establish measurable budgets

**Status:** In progress  
**Baseline package:** 0.32.0  
**GitHub issue:** [#84](https://github.com/shivam039/hydration-doctor/issues/84)

## Problem

The published package has no explicit size budget or repeatable report of package contents. A baseline is needed before changes can be judged as improvements, and the published tarball has to stay reproducible for consumer use.

## Scope and acceptance

- Record packed bytes, unpacked bytes, file count, and dependency/runtime constraints for 0.32.0.
- Add a deterministic size-inspection script that measures the exact npm pack manifest and emits machine-readable JSON plus a human summary.
- Add generous initial hard limits above the baseline (100 KiB packed, 350 KiB unpacked, 110 files) so current release passes while regressions are caught; document how to revise limits with evidence.
- CI runs the budget check alongside the existing package dry run.
- `npm pack --dry-run` and clean consumer smoke remain unchanged and passing.

Measured with `npm pack --dry-run --json`: 83,403 packed bytes; 297,587 unpacked bytes; 91 files. This measures the npm tarball only, not installed dependencies or browser binaries. Initial budgets are 102,400 packed bytes, 358,400 unpacked bytes, and 110 files.

## Out of scope

No dependency removal, output behavior changes, stable API promise, or npm publication.

## Adversarial review prompts

Check that gzip size is not confused with installed size; that the report is derived from npm's manifest rather than a hand-maintained path list; that platform-dependent sizes are not used as brittle exact assertions; and that budget overrides cannot silently disable CI checks.

## Verification

Run focused budget tests, `npm run check`, `npm run size:check`, and `npm run test:consumer`. Record exact output and residual risk before closing the issue.
