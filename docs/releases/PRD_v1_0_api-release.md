# PRD: Hydration Doctor 1.0 readiness — API and release policy

**Status:** Planned  
**Depends on:** [compatibility evidence](PRD_v1_0_compatibility.md)  
**GitHub issue:** [#88](https://github.com/shivam039/hydration-doctor/issues/88)

## Goal

Define the stable public contract and release operations. This PRD does not itself authorize or claim a 1.0 publication.

## Acceptance

- Inventory and approve public JS exports, CLI flags/exit codes, config schema, diagnostics, and report schema.
- Publish migration guarantees and deprecation policy; add compatibility contract tests for every promised surface.
- Add a maintained changelog and versioning discipline, release candidate procedure, and rollback guidance.
- Verify trusted publishing, provenance, packed consumer installation, and registry artifact integrity in a release rehearsal.
- Update README/package metadata with stability claims only after all 1.0 blockers have evidence and an explicit go/no-go review.

## Adversarial review

Look for undocumented exports, ambiguous schema compatibility, accidental breaking changes in minor versions, misleading "stable" wording, unreproducible artifacts, and publication on non-release refs.

## Verification

Run API/config/report contract tests, package and consumer checks, release workflow rehearsal, and a final evidence audit. Stable publication requires a separate explicit release decision.
