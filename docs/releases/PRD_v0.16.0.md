# Hydration Doctor 0.16.0 — Keyboard Interaction Checks

## Problem

Configured interaction flows cover click, fill, and submit, but cannot exercise keyboard-only behavior such as Enter activation or Escape dismissal after hydration.

## Scope

- Add a `press` interaction using a required selector and a bounded, validated key name.
- Reuse checkpoint and expectation behavior from existing interactions.
- Record the interaction result without including typed secrets or key text in diagnostics.
- Add real-browser fixtures and CLI/API configuration documentation.

## Acceptance

1. A keyboard action executes at the selected element in the requested checkpoint.
2. Existing selector, text, URL, and value expectations work after the action.
3. Invalid key values and malformed selectors fail configuration cleanly.
4. A keyboard activation fixture passes and a broken behavior fixture is reported as a verified finding.

## Risks and boundaries

The feature tests browser-observable keyboard behavior and does not guarantee accessibility. Key values must be passed to Playwright without evaluating page-provided code.

## Verification

Add config and real-browser tests, run repository checks and consumer smoke, and record adversarial review before closing the linked issue.
