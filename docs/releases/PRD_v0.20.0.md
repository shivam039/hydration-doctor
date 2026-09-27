# Hydration Doctor 0.20.0 — Form State Interactions

## Problem

Configured interactions can click, fill, press, and submit, but cannot directly exercise select elements or checkbox/radio state changes that may be reset during client initialization.

## Scope and acceptance

- Add `select` with a required string value, plus `check` and `uncheck` actions.
- Support `expect.value` for fill/select and boolean `expect.checked` for check/uncheck.
- Reuse route readiness gates and bounded Playwright timeouts.
- Never serialize selectors, option values, or checked state into interaction evidence or failures.

## Adversarial review

Check incompatible config payloads, wrong/missing controls, disabled controls, selected-value/state assertions, readiness behavior, and report redaction. `select` currently uses a single string option value; applications with multiple select workflows should use distinct configured actions and verify their state deliberately.

## Verification

Config tests cover accepted/rejected shapes. A real browser fixture changes one select and checks/unchecks two controls; the report must pass and omit private option values and selectors. Full checks, consumer scan, and CI matrix precede issue closure.
