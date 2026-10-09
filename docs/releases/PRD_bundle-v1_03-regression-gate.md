# PRD: Bundle and v1 readiness — 03, enforce size regression gates

**Status:** Planned  
**Depends on:** [01 baseline](PRD_bundle-v1_01-baseline.md), [02 runtime weight](PRD_bundle-v1_02-runtime-weight.md)  
**GitHub issue:** [#86](https://github.com/shivam039/hydration-doctor/issues/86)

## Goal and acceptance

- Make package-size CI report the current artifact and compare it to checked-in budgets.
- Ensure all PR and release-tag paths use the same pack manifest and limits.
- Provide a deliberate, reviewed budget-update procedure and clear failure messages.
- Keep archived report artifacts useful without making CI depend on third-party size services.
- Confirm package files and exports in a clean consumer install.

## Adversarial review

Try to bypass the gate via dry-run mismatch, missing artifact fields, shell injection through package metadata, platform variance, path traversal, or release workflow divergence. Verify malformed measurements fail closed.

## Verification

Test pass, boundary, and over-budget cases; inspect workflow permissions and triggers; run the full release check matrix.
