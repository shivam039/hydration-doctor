# Hydration Doctor 0.23.0 — Experimental Release Hygiene

## Problem

The repository lacks a changelog, package metadata is out of step with the 0.22.0 roadmap, and users need a visible statement that the project is pre-stable before any package release.

## Scope and acceptance

- Align `package.json` and `package-lock.json` to development version 0.23.0.
- Add a changelog that distinguishes repository increments from published npm versions and does not claim publication.
- Put an experimental/pre-1.0 warning in the README and package description, stating APIs/config may break and migration is not guaranteed.
- Document a repeatable semver/changelog/pack/consumer/review process that requires explicit authorization before publishing.
- Include the changelog in the packed package.

## Adversarial review

Check package and lockfile version alignment, all release wording for false claims, the visibility of the warning in the packed README, and CI permissions. The scope must not create tags, releases, or publish credentials/workflows.

## Verification

Review npm pack dry-run output and run the clean packed-consumer scan. CI runs the full checks. Verify GitHub has no created release/tag and do not publish to npm.
