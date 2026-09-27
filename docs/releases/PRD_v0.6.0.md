# Next release PRD: Hydration Doctor 0.6.0

**Status:** Planned  
**Iteration:** 4 of 5  
**Audience:** Developers comparing responsive layouts in CI or local scans

## User problem

Visual baselines are viewport-specific, but changing the viewport currently requires editing configuration. This makes it harder to run reproducible desktop and mobile checks and increases the chance that one profile overwrites or is compared against another profile's baseline.

## Goal

Add a validated `--viewport WIDTHxHEIGHT` CLI override and document/test independent desktop and mobile baselines for a responsive fixture.

## Non-goals

- Emulating a full device/browser hardware profile from viewport dimensions alone.
- Running multiple viewport profiles in one scan invocation.
- Automatically updating baselines during ordinary scans.
- Treating pixel changes as confirmed hydration errors.

## Acceptance criteria

1. `scan --viewport 390x844` overrides configured viewport dimensions; malformed and out-of-range values fail with actionable setup errors.
2. A responsive fixture is scanned at desktop and mobile sizes using separate persistent baseline filenames.
3. Reports expose the actual image dimensions and independent baseline comparison results.
4. Normal scans still do not write/update baselines; explicit update mode remains required.
5. CLI and visual baseline documentation explain viewport profiles and rendering-environment limits.

## Issue

- **HD-NR-7:** viewport CLI override and responsive visual profiles — tracked as a GitHub issue during iteration 4.

## Verification

Run focused CLI and visual tests, then `npm run check` and `npm run test:consumer`. Close the issue only after GitHub Actions passes the supported Node matrix.

## Limitations

Viewport dimensions alone do not emulate device pixel ratio, touch input, browser chrome, or mobile operating-system fonts. Keep baselines tied to a reproducible browser and operating-system environment.
