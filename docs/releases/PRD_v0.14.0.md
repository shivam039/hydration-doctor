# Hydration Doctor 0.14.0 — Configurable Static Analysis Exclusions

## Problem

The analyzer only supports excluding directory names. Monorepos need a bounded way to omit generated or intentionally noisy source files without editing the project tree.

## Scope

- Add explicit relative-path exclusion patterns to the analyzer API and `analyze --exclude` CLI option.
- Support a documented, small glob grammar (`*`, `**`, and `?`) with slash-normalized paths.
- Reject absolute paths, parent traversal, malformed patterns, and excessive pattern counts/lengths.
- Preserve default excluded directories, symlink skipping, traversal bounds, and visible skipped-file counts.

## Acceptance

1. Matching files are omitted and counted; nonmatching files remain analyzed.
2. Nested `**` and single-directory `*` semantics are tested on POSIX and Windows-style separators.
3. Invalid or unbounded patterns fail with actionable config errors.
4. Exclusion cannot escape the chosen source root or disable resource limits.

## Risks and boundaries

Exclusions can hide useful findings, so documentation must describe matching semantics and skipped counts. They do not alter source files or analyzer defaults.

## Verification

Run focused path-pattern tests, repository checks, consumer smoke, and the Node CI matrix. Record an adversarial review before closing the linked issue.
