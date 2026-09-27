# Adversarial Review — Release 0.10.0

## Scope

Reviewed `AbortSignal` validation, browser launch/context/page lifecycle, concurrent scan workers, cancellation error handling, and listener cleanup.

## Findings and fixes

| Finding                                                                                                                         | Severity | Fix                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A pre-aborted signal could still launch the browser because cancellation was checked only inside queued work.                   | Medium   | Validate and check the signal before config execution/browser launch; a test confirms the exact caller reason is returned.                                     |
| An active browser wait could outlive cancellation until the configured timeout.                                                 | Medium   | Register a per-context abort handler that closes the context; verify a 60-second readiness wait rejects within five seconds.                                   |
| `runPage` converted cancellation into an ordinary failed scenario, allowing a partial report to look like application evidence. | High     | Re-throw the signal reason from the page error path so scan rejects and produces no partial report.                                                            |
| Concurrent workers and context setup races could leave listeners registered after cancellation.                                 | Medium   | Clean up contexts on route/page setup errors, remove listeners in every completion path, and assert add/remove counts balance in both abort and success cases. |
| Arbitrary signal-like objects could fail later with confusing method errors.                                                    | Low      | Validate the standard AbortSignal shape at API entry and provide a direct type error.                                                                          |

## Residual limits

Playwright browser launch itself has no AbortSignal option in this integration; a cancellation that arrives during launch is honored immediately after launch resolves, and the browser is then closed. Abort reasons are caller-controlled and rethrown unchanged, so callers should not put secrets in them or log them indiscriminately.

## Verification

Tests cover pre-aborted and concurrent in-flight cancellation, exact reason propagation, prompt rejection, invalid signal input, and listener cleanup. Full checks and CI evidence are recorded in issue #32.
