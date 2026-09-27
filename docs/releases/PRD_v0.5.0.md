# Next release PRD: Hydration Doctor 0.5.0

**Status:** Implemented, verified, and issue #27 closed
**Iteration:** 3 of 5  
**Audience:** JavaScript/JSX application developers reviewing possible server/client render differences

## User problem

The optional static analyzer flags `Date.now()` and `Math.random()`, but misses two common sources of server/client variance: constructing the current date with `new Date()` and locale-sensitive formatting. Developers need candidate signals before browser reproduction without the analyzer claiming it proved a runtime failure.

## Goal

Extend bounded JS/JSX analysis to identify zero-argument `Date` construction and locale-dependent date/number formatting patterns with accurate locations and candidate-only confidence.

## Non-goals

- TypeScript parsing, type-aware data flow, or proving that code executes during render.
- Automatically modifying source or failing scans because a candidate exists.
- Treating candidates as confirmed hydration errors.

## Acceptance criteria

1. `new Date()` is reported as a nondeterministic date candidate; explicit fixed-argument construction is not.
2. `Intl.DateTimeFormat` and `toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` calls are reported as locale-dependent candidates.
3. Findings include the correct source file and one-based line/column and remain `candidate` confidence.
4. Existing JS/JSX exclusions, parse-error handling, bounds, and scan exit behavior remain unchanged.
5. Static-analysis docs explain these are hypotheses requiring runtime evidence.

## Issue

- **HD-NR-6:** current-time and locale-sensitive static candidates — [issue #27](https://github.com/shivam039/hydration-doctor/issues/27).

## Verification

Run focused static analyzer tests, then `npm run check` and `npm run test:consumer`. Close the issue only after GitHub Actions passes the supported Node matrix.

## Limitations

These syntax-pattern candidates do not determine execution context, timezone configuration, or whether server and browser output actually differs.
