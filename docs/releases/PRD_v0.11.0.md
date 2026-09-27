# Release PRD: Hydration Doctor 0.11.0

**Status:** Implemented; issue #33 closed
**Audience:** Developers maintaining route scan configurations

## Problem

Duplicate route entries currently generate indistinguishable scenario results. Snapshot and visual comparison lookup is keyed by route text, so duplicate definitions can associate evidence with the wrong configuration and waste browser work.

## Goal

Reject indistinguishable route checks deterministically during configuration validation, using URL normalization against `baseUrl`. Preserve intentional repeated URL checks when assertions or interactions differ; reject repeated targets that could make snapshot/visual comparison association ambiguous.

## Requirements

- Detect indistinguishable checks across string and object route forms, relative and absolute same-origin URLs, and equivalent URL normalization (default port, dot segments, empty path, and percent-escape hex case).
- Allow multiple checks for one target when their configured assertions/interactions differ and neither uses route snapshots or visual comparison; reject repeated targets that include snapshot/visual comparison because evidence matching is target-based.
- Preserve meaningful query and fragment differences as distinct targets.
- Report both route indexes without echoing sensitive query values or credentials.
- Do not mutate the caller's configuration while normalizing for comparison.
- Add focused validation tests and explain the rule in config docs.

## Adversarial review

Test URL canonicalization edge cases, encoded separators, query/fragment distinctions, malformed targets, duplicate visual routes, and secret-bearing URLs in validation errors. Fix unsafe normalization or leakage found.

## Non-goals

- Deduplicating routes silently or changing route order.
- Cross-origin route support beyond existing validation rules.
- Publishing a package release.

## Verification and completion

Run focused config tests, `npm run check`, and `npm run test:consumer`; commit the review record and close the issue with evidence.

## Delivery

- Issue: [#33](https://github.com/shivam039/hydration-doctor/issues/33)
- Adversarial review: [iteration 0.11 review](../security/ADVERSARIAL_REVIEW_v0.11.0.md)
- Verification: canonical URL edge tests, complete repository checks, packed-consumer scan, and Node matrix.
