# Public API

The package exports the following entry points from `hydration-doctor`:

- `scan(config, overrides?)` validates the config, runs configured browser scenarios, and returns the JSON report object. Pass an `AbortSignal` as `overrides.signal` to cancel; the promise rejects with the signal's reason and does not return a partial report.
- `analyzeStaticSources(directory, options?)` parses bounded JS/JSX and TypeScript/TSX files and returns source-pattern candidates without changing files. `options.excludePatterns` accepts bounded relative source globs.
- `defineConfig(config)` is an identity helper for typed/config-editor-friendly config files.
- `loadConfig(path)` loads and validates a trusted JavaScript config module.
- `validateConfig(config)` validates and normalizes configuration or throws an error.
- `createReactDiagnosticsAdapter({ onRecoverableError })` formats React's public recoverable-error callback for an application-owned handler. It does not connect to the CLI automatically.
- `formatTerminalReport(report)`, `formatJsonReport(report)`, `formatHtmlReport(report)`, `formatJUnitReport(report)`, and `formatSarifReport(report)` format report objects. SARIF output is intended for static-analysis candidates and parse errors.
- `DoctorError` and `getExitCode(error)` are helpers for callers building integrations around CLI-style results.
- `redactSensitiveText(text)` and `sanitizeUrl(url)` provide the package's conservative redaction helpers.

The `hydration-doctor/config` subpath exports `defineConfig`, `loadConfig`, and `validateConfig`.

The scan result uses `schemaVersion: 1`. The [JSON Schema for report version 1](schema/report-v1.schema.json) defines the structural contract. Reports contain route/scenario results and diagnostics; see [reading reports](REPORTS.md) for meaning and privacy limits. Additive report fields may appear within schema version 1. Consumers should tolerate unknown fields and should not depend on incidental diagnostic prose.

`scan(config, { signal })` accepts a standard `AbortSignal`. If it is already aborted, the scan rejects before launching a browser. If it aborts during a run, active browser contexts are closed and the scan promise rejects with `signal.reason`; no partial report is returned. Abort reasons are caller-controlled and may contain sensitive text, so avoid logging private data in them.

For persistent visual comparison, set `routes[].visual.baseline` to a simple PNG filename and optionally set `baselineDir`. A normal scan reads but never writes that file; the CLI's `--update-baselines` flag explicitly creates or replaces configured baseline files. A missing baseline produces an inconclusive scan result.

Hydration Doctor is experimental and pre-1.0. The package version is a repository development version, not evidence of npm publication. Public API and configuration stability is not guaranteed; breaking changes may occur between 0.x versions without migration guarantees. See the [release process](RELEASING.md) and [changelog](../CHANGELOG.md).

The export names and representative helper behavior are pinned by [`test/public-api.test.js`](../test/public-api.test.js). A fresh packed-package installation and browser scan is covered by `npm run test:consumer`.
