# Hydration Doctor 0.18.0 — Browser Guard Candidates

## Problem

The analyzer reports direct browser-global references but misses `typeof window` guards, a common source of server/client conditional rendering.

## Scope and acceptance

- Report exact-location advisory candidates for `typeof window`, `typeof document`, and `typeof navigator` in JS, JSX, TS, and TSX.
- Do not trigger on unrelated globals, comments, or strings.
- Keep findings advisory; static analysis cannot establish that an expression runs during render or prove hydration failure.
- Preserve bounded parsing and report evidence that does not copy source values.

## Adversarial review

Checked exact AST node boundaries and source locations, unrelated `typeof`, comments/string literals, and report evidence. This rule is intentionally broad: it can report harmless feature detection outside rendering. It does not infer control-flow outcome or claim runtime impact.

## Verification

Focused static-analysis tests, full repository checks, packed consumer scan, and CI matrix are required before issue closure.
