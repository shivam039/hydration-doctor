# Hydration Doctor

Hydration Doctor is an open-source CLI for checking route behavior across direct navigation, hard refresh, and configured client-side navigation. It is an early implementation: Phase 1 checks navigation and expected UI. It does not yet prove an arbitrary DOM difference is a hydration mismatch.

## Quick start

Requires Node.js 20.11 or newer.

```sh
npm install
npx playwright install chromium
npx hydration-doctor init
```

Edit `hydration-doctor.config.js`:

```js
export default {
  baseUrl: "http://localhost:3000",
  routes: [
    { path: "/", expectedSelector: "main" },
    { path: "/account", expectedSelector: "h1", expectedText: "Account" },
  ],
  navigation: { from: "/", click: 'a[href="/account"]', to: "/account" },
};
```

Start your app, then run `npx hydration-doctor scan --config hydration-doctor.config.js`. A direct URL can also be checked with `npx hydration-doctor scan --url http://localhost:3000/account`. `doctor` checks whether the selected Playwright browser is installed and launches.

`--browser` and `--reporter` override configuration. `--output report.json` writes a JSON copy and refuses to overwrite a file. Exit codes are 0 for a pass, 1 for a verified scenario failure, and 2 for invalid setup/configuration or execution error. Current reporters are `text` and `json`.

## Configuration

- `baseUrl`: required HTTP(S) origin/base URL, without credentials.
- `routes`: non-empty array of path strings or objects with `path`, optional `expectedSelector`, and optional `expectedText`.
- `navigation`: optional `{ from, click, to }` to check the configured target route through a click from the entry route.
- `timeout`: per-operation milliseconds, 1–120000 (default 10000).
- `browser`: `chromium`, `firefox`, or `webkit` (default `chromium`).
- `viewport`: `{ width, height }` (default 1280×800).
- `reporter`: `text` or `json` (default `text`).

Configuration files are executable trusted JavaScript modules. Do not load an untrusted config. The CLI does not overwrite an existing config when running `init`.

## Scope and limitations

The Phase 1 scan records console errors, uncaught page errors, failed requests, response statuses, redirects and document navigations. It runs direct and refresh scenarios in isolated browser contexts. Configured client navigation is checked for a full document request. Findings describe observations; they do not claim a root cause. Authentication state, SSR snapshots, hydration-specific instrumentation, HTML reports, screenshots, static analysis and additional fixture coverage are planned, not implemented.

See [the master roadmap](docs/roadmap/MASTER_EPIC.md) for epic scope and evidence status.
