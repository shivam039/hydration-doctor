# Adversarial Review — Release 0.12.0

## Scope

Reviewed browser-engine matrix inputs, fixture network scope, pass/failure assertions, cleanup behavior, CI permissions, and compatibility claims.

## Findings and fixes

| Finding                                                                                                                                                   | Severity | Fix                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime support for Firefox and WebKit was advertised without project CI evidence; only Chromium was installed in the main workflow.                      | Medium   | Add a separate Node 22 matrix with one Playwright engine per job; leave the Node 20/22/24 full Chromium suite intact.                                     |
| A smoke test that only asserts browser launch could pass while route assertions or diagnostic classification are broken.                                  | Medium   | Check direct load and refresh for a healthy route and a missing-selector route, including `missing-expected-ui` classification.                           |
| The smoke test exposed that missing-selector messages were not recognized by the diagnostic classifier, even though missing expected text was classified. | Medium   | Match the actual configured-selector failure message and add a focused regression test; keep it categorized as observed missing UI rather than hydration. |
| Failing assertions could leave the local fixture server running and stall CI.                                                                             | Medium   | Wrap all assertions in `try/finally` and close the server; the scanner closes contexts/browser in its own `finally` lifecycle.                            |
| A broad browser matrix could be mistaken for full browser/framework support.                                                                              | Medium   | Keep the matrix to deterministic local routes and document that full Next.js, visual, and feature coverage remains Chromium-only.                         |

## Residual limits

Node 20 CI exposed that the scanner could reject before a sibling worker finished removing its cancellation listener. The scanner now waits for all workers to settle before propagating cancellation, so cleanup completes before the caller receives the rejection.

Smoke checks exercise only a small selector/navigation path under the locked Playwright browser builds. They do not cover Next.js fixtures, persistent visual baselines, streaming, or browser-version variance across operating systems.

## Verification

Run `npm run test:browser-smoke -- chromium`, `-- firefox`, and `-- webkit`; run `npm run check` and `npm run test:consumer`; confirm all three GitHub browser-matrix legs pass. Evidence is linked from issue #34.
