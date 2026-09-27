# Hydration Doctor

> **Experimental, pre-1.0 software.** The public API and configuration may change between releases. Breaking changes can occur without migration guarantees. This project is not yet recommended for production-critical adoption. No npm release is implied by the repository roadmap or version metadata.

See the [changelog](CHANGELOG.md) for repository increments and the [release process](docs/RELEASING.md) for publication requirements.

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

CLI values for browser, global viewport, reporter, timeout, concurrency, and retries override their global configuration values. Route-specific viewport/device profiles take precedence for that route. Choose distinct `visual.baseline` filenames for different route profiles. Concurrency is bounded to 1–8 independent browser contexts. Retries are additional attempts; a scenario that fails once remains failed even if a retry passes, and the report marks the inconsistent attempts. `--reporter html,json` enables multiple report formats. With one reporter, `--output` is the exact output file; with multiple reporters it names an output directory. Existing files are never overwritten. Exit codes are 0 for a pass, 1 for a verified scenario failure, and 2 for invalid setup/configuration or execution error.

## Configuration

- `baseUrl`: required HTTP(S) origin/base URL, without credentials.
- `routes`: non-empty array of path strings or objects with `path`, optional `expectedSelector`, `expectedText`, `readySelector`, `expectedUrl`, route-level `viewport`, and Playwright `device` descriptor.
- `navigation`: optional `{ from, click, to }` to check the configured target route through a click from the entry route.
- `expectedUrl`: optional final URL for routes that intentionally redirect. Without it, a changed final URL is reported as an unexpected redirect.
- `readySelector`: optional application-owned selector to wait for before evaluating the expected UI. This is useful when a page exposes an explicit hydration-complete marker.
- `interactions`: optional ordered route steps for `click`, `fill`, `press`, `submit`, `select`, `check`, or `uncheck`. Each step requires a CSS `selector`; `fill` and `select` require a string `value`, and `press` requires a key name such as `Enter` or `Shift+Enter` (maximum 32 safe characters). Set `checkpoint: "ready"` to wait for the route's `readySelector` before acting, or omit it to act immediately after DOM content loads. Fill/select steps can assert `expect: { value }`; check/uncheck steps can assert `expect: { checked: true|false }`. Hydration Doctor waits for the route's `readySelector` first when configured, then verifies the expected state. Reports include only the step number, action type, and pass status; selectors, keys, and entered/expected values are omitted. For example:

  ```js
  {
    path: "/account",
    readySelector: 'html[data-hydrated="true"]',
    interactions: [
      { type: "click", selector: "#save", checkpoint: "ready", expect: { text: "Saved" } },
      { type: "press", selector: "#command", key: "Enter", checkpoint: "ready", expect: { text: "Opened" } },
      { type: "select", selector: "#plan", value: "premium", checkpoint: "ready", expect: { value: "premium" } },
      { type: "check", selector: "#alerts", checkpoint: "ready", expect: { checked: true } },
    ],
  }
  ```

  Interactions run on direct-load and refresh scenarios. A failed action or unmet step expectation fails that scenario. This does not inspect framework internals or model slow CPU/network conditions.

- `snapshot`: optional `{ selector, compareText, attributes, ignoreSelectors }` checkpoint compared between direct load and refresh. Text and attributes are excluded by default; `ignoreSelectors` removes volatile subtrees. Snapshots are capped at 100 elements, 512 characters per captured value, five attributes, and 20 ignore selectors; reports identify truncated comparisons. A difference is reported as navigation-dependent rendering inconsistency, not as proof of hydration failure.
- `visual`: optional route setting `{ maxDiffRatio, maskSelectors, baseline }` for captured-viewport PNG comparisons. The direct-load image is compared with refresh within a run. Set `baseline` to a simple PNG filename to compare with a persistent baseline in `baselineDir` (defaults to `.hydration-doctor/baselines`). Use separate names such as `account-desktop.png` and `account-mobile.png` in separate viewport profile runs. A missing baseline makes the scan inconclusive. Create or replace one explicitly with `hydration-doctor scan --config <path> --update-baselines`; ordinary scans never write baselines. Up to 20 dynamic selectors can be masked. At most five routes per scan capture images; viewports over two million pixels and images over 256 KiB are skipped and reported incomplete. Pixel differences are visual rendering differences, never hydration failures.
- `timeout`: per-operation milliseconds, 1–120000 (default 10000).
- `concurrency`: number of independent scenarios to run at once, 1–8 (default 1).
- `retries`: additional attempts for a scenario, 0–5 (default 0). A pass after a failure is still a failed, intermittent result.
- Route checks that have the same normalized target and assertions are duplicates. Separate assertions may intentionally check the same URL; repeated snapshot/visual targets are rejected because comparison evidence is associated by target. Query strings and fragments remain part of the target.
- `browser`: `chromium`, `firefox`, or `webkit` (default `chromium`).
- `viewport`: `{ width, height }` (default 1280×800). `device`, `locale`, `timezoneId`, `colorScheme`, and `reducedMotion` configure the browser context.
- Route-level `viewport`: optional `{ width, height }` bounded to 1–7680 per dimension. Route-level `device` names a Playwright descriptor such as `iPhone SE`; it overrides the global device and uses the descriptor's viewport unless route `viewport` is also set. Route viewport/device values allow desktop, tablet, and mobile profiles in one scan. A descriptor emulates browser settings such as touch/DPR; it does not establish full compatibility for that browser/device combination.
- `storageState`: optional Playwright storage state path or object for authenticated checks. The scanner does not print its contents.
- `allowOrigins`: optional list of additional HTTP(S) origins whose requests the browser may make. By default, all cross-origin requests are blocked, including scripts, images, APIs, and frames. Origins named in `allowOrigins` and explicit `expectedUrl` redirect destinations are permitted. Service workers are disabled in scan contexts so they cannot bypass request interception.
- `includeHtmlEvidence`: opt-in to include a redacted initial document HTML excerpt in JSON evidence. Off by default; capture is limited to uncompressed responses with a known size of at most 256 KiB. Oversized, compressed, or streaming responses are summarized without storing their body.
- `reporter`: `text`, `json`, `html`, or `junit`, or an array/comma-separated combination such as `html,json,junit` (default `text`). JUnit XML is suitable for CI test result ingestion.

Optional source candidates can be inspected separately with `npx hydration-doctor analyze --source ./src`. The analyzer reports JavaScript/JSX and TypeScript/TSX browser-global reads, `Date.now()`/`Math.random()`, and `process.env` references with file/line/column. Add relative glob exclusions with `--exclude 'src/generated/**,**/*.stories.tsx'`. These are candidate patterns, not runtime errors or proof of a hydration failure. It skips common generated/dependency directories, caps input to 500 files of at most 1 MiB each, and never edits source files. See [static analysis details](docs/STATIC_ANALYSIS.md).

Configuration files are executable trusted JavaScript modules. Do not load an untrusted config. The CLI does not overwrite an existing config when running `init`. HTML, JSON, and JUnit report files are created with owner-only permissions where the operating system supports them. Snapshots, configured screenshots, and explicitly enabled HTML evidence can place private application content in reports; review reports before sharing.

## Guides

- [Reading JSON, HTML, and terminal reports](docs/REPORTS.md)
- [Public API and compatibility status](docs/API.md)
- [Release readiness assessment](docs/RELEASE_READINESS.md)
- [Troubleshooting browser, route, and snapshot checks](docs/TROUBLESHOOTING.md)
- [Automated fixture inventory and evidence](docs/FIXTURE_INVENTORY.md)
- [React and Next.js compatibility evidence](docs/FRAMEWORK_COMPATIBILITY.md)
- [Optional static analysis and its limits](docs/STATIC_ANALYSIS.md)
- [Contributing and running the checks](CONTRIBUTING.md)
- [Master epic and implementation status](docs/roadmap/MASTER_EPIC.md)

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

The scan records up to 50 console errors, page exceptions, failed requests, responses, and redirects per scenario; excess counts are recorded as dropped. It runs direct and refresh scenarios in isolated browser contexts, and configured client navigation checks back/forward behavior and detects full-document fallback. Cross-origin network requests are blocked unless configured in `allowOrigins` or as an explicit redirect destination. A real React 18 mismatch fixture proves that known hydration-warning signatures are reported distinctly from generic console errors. The warning is evidence that the browser emitted that message; it does not establish the source or root cause. The self-contained HTML reporter escapes untrusted report content and only creates HTTP(S) links. Screenshots, static analysis, Next.js adapters and broader framework coverage remain planned.

See [the master roadmap](docs/roadmap/MASTER_EPIC.md) for epic scope and evidence status.
