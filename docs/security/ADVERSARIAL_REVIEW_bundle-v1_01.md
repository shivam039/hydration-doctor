# Adversarial review — bundle/v1 iteration 01

**Scope:** baseline package metrics and budget-gate design.  
**Review status:** Implementation review complete for the local 0.32.0 tree; verify again against merged CI.

**Tracking:** [issue #84](https://github.com/shivam039/hydration-doctor/issues/84).

## Findings

- The 0.32.0 npm tarball currently contains 83,403 packed bytes, 297,587 unpacked bytes, and 91 files. The inventory includes the full release PRD and adversarial-review history because `docs/` is packaged. This may be avoidable weight, but excluding it could break users who rely on packaged documentation; make that decision only after checking consumer needs.
- `npm pack --dry-run` reports the package archive sizes and manifest but does not measure installed dependency size or browser binaries. These must be reported as separate metrics rather than conflated.
- npm tarball metadata size is reproducible here, but file counts and filesystem modes should not be treated as cross-platform byte guarantees. Use upper bounds and the registry/package manifest as evidence.
- A budget script must parse npm output as data, validate numeric fields, and fail closed on missing/malformed measurements. It must not execute package-controlled values in a shell.

## Implementation review

- The size gate calls `npm pack --dry-run --json` with `execFileSync` argument arrays (no shell interpolation), accepts exactly one JSON report, and validates all three metrics as safe non-negative integers. Malformed JSON/fields fail closed.
- Budget checking uses checked-in numeric limits and returns independent errors for packed bytes, unpacked bytes, and file count. Boundary, over-limit, and malformed-limit cases are covered by focused tests.
- CI invokes the same `npm run size:check` on each Node matrix entry before the package dry-run and consumer install.
- No implementation finding remains in this slice. Residual limitation: the gate does not measure installed dependencies, runtime load time, or browser downloads; these are tracked in iteration 02.

Verification: focused tests passed; `npm run check` passed with 90 tests; `npm run size:check` passed at 86,749 packed bytes / 306,630 unpacked bytes / 97 files; `npm run test:consumer` installed the tarball and completed a browser scan. CI evidence is pending PR.

## Residual risks

This is a source-based threat review of the planned gate, not a full dependency or supply-chain audit. Runtime dependency footprint and actual user install cost remain unmeasured.
