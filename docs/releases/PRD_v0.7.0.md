# Next release PRD: Hydration Doctor 0.7.0

**Status:** Implementation in progress
**Iteration:** 5 of 5  
**Audience:** Developers testing forms and controls during hydration

## User problem

A user may type into a server-rendered input before client hydration completes, then lose the value when the application initializes. Hydration Doctor can fill controls and check visible outcomes, but cannot currently assert that an input value survives that lifecycle without exposing the configured value in evidence.

## Goal

Add a value assertion for configured fill interactions, preserve value redaction, and include paired fixtures that prove a pre-hydration input reset fails while a readiness-gated fill succeeds.

## Non-goals

- Inspecting React internals or declaring every input reset a hydration error.
- Recording entered or expected values in JSON, terminal, or HTML reports.
- Automatically interacting with destructive controls.
- Publishing a package or declaring APIs stable.

## Acceptance criteria

1. A fill interaction may specify `expect.value`; it is valid only as a string on a fill interaction.
2. The scanner waits up to the configured timeout for the observed value and fails if hydration resets it.
3. The paired readiness-gated fixture passes when the value is entered after the app-owned readiness selector.
4. Failed interaction outcome evidence identifies the step and scenario but omits the configured and observed values.
5. Findings remain observed interaction failures and are not classified as confirmed hydration errors.
6. CLI/config docs explain the assertion and its redaction behavior.

## Issue

- **HD-NR-8:** detect values reset during hydration without exposing input contents — tracked as a GitHub issue during iteration 5.

## Verification

Run focused browser/config tests, then `npm run check` and `npm run test:consumer`. Close the issue only after GitHub Actions passes the supported Node matrix.

## Limitations

This is an application-configured value assertion. It detects an observed lost-value behavior but does not prove hydration was the cause; reports intentionally omit values for privacy.
