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

CLI values for browser, reporter, timeout, concurrency, and retries override configuration. Concurrency is bounded to 1–8 independent browser contexts. Retries are additional attempts; a scenario that fails once remains failed even if a retry passes, and the report marks the inconsistent attempts. `--reporter html,json` enables multiple report formats. With one reporter, `--output` is the exact output file; with multiple reporters it names an output directory. Existing files are never overwritten. Exit codes are 0 for a pass, 1 for a verified scenario failure, and 2 for invalid setup/configuration or execution error.

## Configuration

- `baseUrl`: required HTTP(S) origin/base URL, without credentials.
- `routes`: non-empty array of path strings or objects with `path`, optional `expectedSelector`, `expectedText`, `readySelector`, and `expectedUrl`.
- `navigation`: optional `{ from, click, to }` to check the configured target route through a click from the entry route.
- `expectedUrl`: optional final URL for routes that intentionally redirect. Without it, a changed final URL is reported as an unexpected redirect.
- `readySelector`: optional application-owned selector to wait for before evaluating the expected UI. This is useful when a page exposes an explicit hydration-complete marker.
- `snapshot`: optional `{ selector, compareText, attributes, ignoreSelectors }` checkpoint compared between direct load and refresh. Text and attributes are excluded by default; `ignoreSelectors` removes volatile subtrees. A difference is reported as navigation-dependent rendering inconsistency, not as proof of hydration failure.
- `timeout`: per-operation milliseconds, 1–120000 (default 10000).
- `concurrency`: number of independent scenarios to run at once, 1–8 (default 1).
- `retries`: additional attempts for a scenario, 0–5 (default 0). A pass after a failure is still a failed, intermittent result.
- `browser`: `chromium`, `firefox`, or `webkit` (default `chromium`).
- `viewport`: `{ width, height }` (default 1280×800). `device`, `locale`, `timezoneId`, `colorScheme`, and `reducedMotion` configure the browser context.
- `storageState`: optional Playwright storage state path or object for authenticated checks. The scanner does not print its contents.
- `includeHtmlEvidence`: opt-in to include a redacted initial document HTML excerpt in JSON evidence. Off by default; capture is limited to responses with a known size of at most 256 KiB. Oversized or streaming responses are summarized without storing their body.
- `reporter`: `text`, `json`, or `html`, or an array/comma-separated combination such as `html,json` (default `text`).

Configuration files are executable trusted JavaScript modules. Do not load an untrusted config. The CLI does not overwrite an existing config when running `init`.

### Optional React recoverable-error hook

React's public `hydrateRoot` options can feed recoverable errors to an application-owned collector:

```js
import { hydrateRoot } from "react-dom/client";
import { createReactDiagnosticsAdapter } from "hydration-doctor";

const adapter = createReactDiagnosticsAdapter({
  onRecoverableError(diagnostic) {
    console.error(
      "Hydration Doctor observed a recoverable React error",
      diagnostic,
    );
  },
});

hydrateRoot(document.getElementById("root"), <App />, adapter);
```

This helper only adapts React's documented callback into a small evidence object. It does not inspect React internals or send data to the CLI automatically.

## Scope and limitations

The scan records console errors, uncaught page errors, failed requests, response statuses, redirects and document navigations. It runs direct and refresh scenarios in isolated browser contexts, and configured client navigation checks back/forward behavior and detects full-document fallback. A real React 18 mismatch fixture proves that known hydration-warning signatures are reported distinctly from generic console errors. The warning is evidence that the browser emitted that message; it does not establish the source or root cause. The self-contained HTML reporter escapes untrusted report content. Screenshots, static analysis, Next.js adapters and broader framework coverage remain planned.

See [the master roadmap](docs/roadmap/MASTER_EPIC.md) for epic scope and evidence status.
