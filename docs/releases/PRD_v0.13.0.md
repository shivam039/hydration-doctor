# Hydration Doctor 0.13.0 — TypeScript Static Analysis

## Problem

The optional analyzer skips `.ts` and `.tsx` source. Projects using TypeScript therefore miss the same server/client variance candidates that are reported in JavaScript.

## Scope

- Parse `.ts` and `.tsx` files with a supported TypeScript parser while preserving the current JS/JSX behavior.
- Detect the existing browser-global, nondeterminism, environment, and locale candidate patterns in TypeScript syntax.
- Keep parse errors explicit and bounded; retain relative paths and one-based locations.
- Add TS/TSX fixtures, API/CLI documentation, and a focused adversarial review.

## Acceptance

1. A TypeScript candidate is reported with its true source location.
2. Type annotations, interfaces, generics, and TSX do not produce false parse errors.
3. Unsupported or malformed syntax is reported as skipped parse evidence, never a clean analysis.
4. Existing JS/JSX tests remain unchanged in behavior.

## Risks and boundaries

Parsing does not establish that a candidate executes during render or causes a hydration defect. Parser resource use remains bounded by the analyzer file and byte limits. The parser is a runtime dependency because the public analyzer runs from consumer installs.

## Verification

Run focused analyzer tests, repository checks, packed consumer smoke, and the supported Node CI matrix. Record adversarial findings and residual limits before closing the linked issue.
