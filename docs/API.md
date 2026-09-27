# Public API

The package exports the following entry points from `hydration-doctor`:

- `scan(config, overrides?)` validates the config, runs configured browser scenarios, and returns the JSON report object.
- `defineConfig(config)` is an identity helper for typed/config-editor-friendly config files.
- `loadConfig(path)` loads and validates a trusted JavaScript config module.
- `validateConfig(config)` validates and normalizes configuration or throws an error.
- `createReactDiagnosticsAdapter({ onRecoverableError })` formats React's public recoverable-error callback for an application-owned handler. It does not connect to the CLI automatically.
- `formatTerminalReport(report)`, `formatJsonReport(report)`, and `formatHtmlReport(report)` format a report object.
- `DoctorError` and `getExitCode(error)` are helpers for callers building integrations around CLI-style results.
- `redactSensitiveText(text)` and `sanitizeUrl(url)` provide the package's conservative redaction helpers.

The `hydration-doctor/config` subpath exports `defineConfig`, `loadConfig`, and `validateConfig`.

The scan result uses `schemaVersion: 1`. Reports contain route/scenario results and diagnostics; see [reading reports](REPORTS.md) for meaning and privacy limits. Additive report fields may appear within schema version 1. Consumers should tolerate unknown fields and should not depend on incidental diagnostic prose.

Hydration Doctor is currently version 0.1.0. The package API and configuration format are documented but not yet declared stable for 1.0 compatibility. Breaking changes may occur before a stable release.

The export names and representative helper behavior are pinned by [`test/public-api.test.js`](../test/public-api.test.js). A fresh packed-package installation and browser scan is covered by `npm run test:consumer`.
