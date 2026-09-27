# Release PRD: 0.27.0 — support contract and API maturity

**Status:** published to npm as an experimental 0.x package on 2026-09-27. The first release used an authenticated maintainer session before npm trusted publishing was configured; it has no GitHub Actions provenance attestation.

## Problem

The README and API guide need a compact, evidence-based account of supported environments, experimental status, and upgrade risk. Users should not infer that a pre-1.0 version or report schema has cross-release guarantees.

## Scope

- Publish verified and unverified framework, browser, device-profile, static-analysis, and identity-provider coverage in the README.
- State plainly that public API/config behavior is experimental and breaking changes can occur without migration guarantees.
- Add upgrade guidance and keep the changelog aligned with repository roadmap increments and registry publication status.
- Contract-test route-level viewport/device config and the documented advisory behavior of static analysis.

## Acceptance criteria

- All capability statements link to runnable evidence or the relevant support document.
- Docs distinguish tested fixture versions and emulated profiles from general compatibility or real-device guarantees.
- Static candidates remain advisory and are not described as runtime hydration proof.
- Migration guidance explicitly says no 0.x migration promise exists.
- `npm run check`, `npm pack --dry-run`, and clean packed-consumer installation and scan succeed.
- Changelog and package version agree; registry metadata, executable mapping, and tarball integrity match the verified release artifact.

## Adversarial review

See [`ADVERSARIAL_REVIEW_v0.27.0.md`](../security/ADVERSARIAL_REVIEW_v0.27.0.md).
