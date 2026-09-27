# Adversarial review — 0.16.0 keyboard interactions

Reviewed key validation, Playwright invocation, duplicate route signatures, checkpoint ordering, failure classification, and report redaction.

## Findings and fixes

- **A configured key could be passed through unsafe control text.** `press.key` must be a non-empty, at-most-32-character ASCII key name/shortcut with no control characters, malformed `+` separators, or page-code evaluation. The validated value is passed only to Playwright's locator `press` API.
- **Different key actions could be treated as duplicate route checks.** The key is now part of the normalized interaction signature used by duplicate route validation.
- **Key values or selectors could leak through reports.** Successful interaction evidence includes only step number, type, and pass status. Failure text includes only the action type and step number. Regression tests assert that the key and expected UI text do not appear in the report.
- **The action could run before configured readiness or be mislabeled on failure.** `checkpoint: "ready"` uses the existing readiness wait; broken keyboard outcomes use the existing `interaction-outcome-failure` category.

## Residual limits

Playwright may reject a syntactically safe but unsupported key name at runtime; this becomes a bounded interaction failure. A passing key action does not establish that the control is accessible or that all assistive technology behavior is correct.

## Verification

Config tests cover accepted shortcuts and invalid, oversized, and control-character values. Chromium fixtures cover ready and broken Enter-key outcomes and verify diagnostic redaction. Full checks, packed consumer scan, and CI evidence will be recorded on issue #39 and the release PR.
