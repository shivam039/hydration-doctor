# Hydration Doctor 0.22.0 — Exact Rule Suppressions

## Problem

Advisory static candidates can be intentional, but there is no source-local way to suppress one known finding while retaining neighboring findings.

## Scope and acceptance

- Add same-line `hydration-doctor-ignore <rule-id>` and next-line `hydration-doctor-ignore-next-line <rule-id>` comments.
- Accept only exact documented candidate rule IDs; optional comma-separated IDs remain explicit.
- Ignore malformed, unknown, wildcard, broad, and parse-error suppression attempts.
- Add `suppressedFindings` count without copying directive/source text to output.
- Keep suppression behavior consistent across JS/JSX and TS/TSX.

## Adversarial review

Probe same-line boundaries, next-line boundaries, multiple IDs, unknown and wildcard IDs, strings/comments, TypeScript comments, and parse-error handling. Verify the report contains only a count and no directive text or suppressed source values.

## Verification

Positive and negative analyzer fixtures, full repository checks, packed consumer scan, and CI matrix are required before issue closure.
