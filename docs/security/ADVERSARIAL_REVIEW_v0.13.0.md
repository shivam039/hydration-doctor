# Adversarial review — 0.13.0 TypeScript analysis

Reviewed parser input bounds, source selection, malformed syntax, AST traversal, location reporting, and the claims made about findings.

## Findings and fixes

- **Nested member expressions could duplicate findings.** `window.location.href` contains both `window.location` and its parent expression. The shared AST visitor now suppresses a member node when it is the object of a larger member expression, keeping the report to one candidate for that chain. Regression coverage exercises this in TypeScript.
- **Malformed TypeScript might have looked like clean analysis.** TypeScript parse failures are added to `parseErrors` with their relative path and parser location; the file is skipped rather than partially walked. A malformed `.ts` fixture verifies the behavior.
- **Type syntax might have been mistaken for unsupported JavaScript.** The TypeScript ESTree parser is selected by extension for `.ts`, `.tsx`, `.mts`, and `.cts`; TSX parsing is enabled only for `.tsx`. Fixtures include interfaces, annotations, generics-compatible syntax, and JSX.
- **Parser package availability in installed consumers.** The parser is a production dependency, because `analyzeStaticSources` is a public API and the packed package must parse TypeScript without development dependencies.

## Residual limits

Static patterns remain advisory and may include expressions that occur only in types or outside render. The analyzer caps source files and bytes but does not impose a separate parser CPU timeout. Unsupported TypeScript syntax is reported as a parse error. It does not resolve project compiler settings or type information.

## Verification

Focused analyzer tests cover JS/JSX compatibility, TS/TSX candidates, malformed TS, and one-based source locations. Full repository checks, packed consumer smoke, and CI matrix evidence are recorded in issue #36 and the release pull request.
