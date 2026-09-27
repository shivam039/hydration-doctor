# Adversarial Review — Release 0.11.0

## Scope

Reviewed route target identity, URL canonicalization, validation error content, and work bounds for malformed or oversized route lists.

## Findings and fixes

| Finding                                                                                                                                                        | Severity | Fix                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Repeated route paths produced indistinguishable result keys, so snapshot and visual evidence lookup could attach comparisons to the wrong route definition.    | Medium   | Reject duplicate canonical targets before scanning and report both route indexes.                                                        |
| Relative and absolute same-origin forms, host casing, default ports, dot segments, and percent-escape hex casing could otherwise bypass a simple string check. | Medium   | Resolve with the WHATWG URL parser, compare normalized `href` values, and normalize percent-escape hex case.                             |
| Including target URLs in a duplicate error could reveal sensitive query values.                                                                                | Medium   | Error text contains only the two config indexes; regression tests use an access token and assert neither its name nor value is included. |
| Duplicate detection over an invalid unbounded route array could add unnecessary work before the existing route-count error.                                    | Low      | Skip normalization when the list exceeds the 50-route limit.                                                                             |

## Residual limits

An adversarial compatibility check found the repository already supports multiple assertion sets for one page: its empty-data regression test compares two expected texts on the same path. Blanket rejection would have broken that valid behavior. The validator therefore rejects identical checks and repeated targets with snapshot/visual comparison settings, while allowing same-target checks with distinct assertions or interactions.

Query parameter order and fragments remain distinct because applications may use them to select content or client state. Server-specific aliases, redirects, and path decoding are not inferred; only URL-parser normalization is applied. Encoded slash and literal slash remain distinct targets.

## Verification

Config tests cover string/object forms, relative/absolute targets, default ports, dot segments, percent-escape case, query/fragment distinctions, input immutability, and secret-free errors. Full checks and CI evidence are linked from issue #33.
