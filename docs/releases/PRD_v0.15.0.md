# Hydration Doctor 0.15.0 — SARIF Static Analysis Reports

## Problem

Static-analysis candidates are only emitted as JSON. GitHub code scanning and other developer tools commonly ingest SARIF, while users need analyzer output to remain explicitly advisory.

## Scope

- Add a SARIF 2.1.0 formatter for static-analysis reports and export it from the package API.
- Add `analyze --format json|sarif` while keeping JSON as the default.
- Map candidate rules to stable rule IDs and preserve file URI, line, column, severity, and advisory explanation.
- Escape/encode values through JSON serialization and keep output writes exclusive and owner-only.

## Acceptance

1. SARIF output declares version 2.1.0 and the official schema URI.
2. Findings map deterministically to valid rule/result locations; parse errors remain distinct.
3. Hostile text is safely represented and no source content beyond existing evidence fields is included.
4. CLI defaults and existing JSON API behavior remain compatible.

## Risks and boundaries

SARIF interoperability does not make candidate findings confirmed defects. The output should avoid secret-bearing source excerpts and use only relative file URIs.

## Verification

Validate representative output with an independent SARIF validator when available, add formatter/CLI tests, run repository checks and consumer smoke, and record an adversarial review before closing the linked issue.
