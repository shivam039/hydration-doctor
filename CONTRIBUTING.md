# Contributing

## Local setup

Use Node.js 20.11 or newer, install dependencies, and install Chromium:

```sh
npm ci
npx playwright install chromium
npm run check
npm run test:consumer
```

`npm run check` runs ESLint, the unit/integration/CLI/browser tests, and formatting checks. `npm run test:consumer` packs the project, installs that tarball into a fresh temporary consumer directory, and runs a browser scan against a local fixture.

## Changes and pull requests

- Add deterministic fixtures and a regression test for each new or corrected detection.
- Keep diagnostic claims tied to observed evidence; do not call arbitrary DOM differences hydration failures.
- Preserve URL sanitization, report bounds, and the cross-origin request allowlist.
- Update README or the relevant docs when configuration, CLI behavior, report fields, or limitations change.
- Run both commands above before opening a pull request. CI checks Node.js 20, 22, and 24 and runs the packed-consumer scan.

Do not add telemetry, paid-service requirements, credentials, or publication from pull requests. Package publication is a separate, explicit release decision.

## Current scope

The CLI currently checks direct navigation, refresh, configured client navigation, route expectations, bounded DOM snapshots, selected React hydration warnings, and configured route interactions. Next.js adapters, visual screenshot baselines, and AST-based static analysis are not implemented; see the [master epic roadmap](docs/roadmap/MASTER_EPIC.md).
