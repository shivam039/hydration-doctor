# Troubleshooting

## Browser launch fails

Run `npx playwright install chromium` (or install the configured `firefox` or `webkit` browser). `hydration-doctor doctor` checks that the selected browser can launch. CI currently installs and exercises Chromium on Node.js 20, 22, and 24.

## A route times out

Check that the application is reachable from the machine running the CLI and that `baseUrl` and the route path are correct. Increase `timeout` only when the application has a known slow operation. If the page intentionally becomes usable after hydration, configure `readySelector` and gate an interaction with `checkpoint: "ready"`.

## A request is blocked

By default the browser may access only the configured base origin. Add an explicitly trusted HTTP(S) origin to `allowOrigins` when an application dependency is served from another origin. Service workers are blocked so they cannot bypass request interception.

## A snapshot differs

Configure a narrow snapshot selector, exclude volatile text/attributes where possible, and use `ignoreSelectors` for dynamic subtrees. A DOM difference is evidence of different output, not proof of a hydration mismatch.

## The scan fails on expected UI

Confirm that `expectedSelector`, `expectedText`, or `readySelector` describes the intended user-visible state. Assertions are application-specific; an empty state can pass when configured as the expected text. Failure reports intentionally omit configured expected text from assertion error messages.

## Interpret the category before investigating

Use [report guidance](REPORTS.md) to distinguish confirmed browser hydration warnings from runtime, network, redirect, loading, and expected-UI findings. A generic console error is not classified as a hydration error.
