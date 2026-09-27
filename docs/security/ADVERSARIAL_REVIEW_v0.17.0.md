# Adversarial review — 0.17.0 delayed client module fixture

Reviewed the delayed import lifecycle, fallback/readiness assertions, missing-content classification, test time bounds, and production server cleanup.

## Findings and fixes

- **An unmounted component could update state after a delayed import resolves.** The fixture clears its timer on unmount and checks an active flag before accepting an import result. Import failures render a bounded visible error state instead of becoming an unhandled rejection.
- **The test could mistake a loading fallback or elapsed time for readiness.** It observes the fallback before import, confirms the ready selector is initially absent, then waits for the explicit ready selector. The scanner route uses the same application-owned selector and expected text.
- **Missing module content could be mislabeled as a hydration defect.** The negative fixture loads the module but renders no expected content. The test requires a bounded `missing-expected-ui` diagnosis and asserts that no hydration diagnosis is produced.
- **Production test failures could leave a server process running.** The production server is registered with the test cleanup hook before route checks; the existing process cleanup helper stops it on success or failure.

## Residual limits

This fixture covers one pinned Next.js 15.5.26 App Router pattern. It does not prove all `import()`/dynamic-loading behavior across bundlers or frameworks, and its controlled delay exists to exercise readiness rather than model production network timing.

## Verification

The production fixture test checks fallback-before-ready, eventual configured readiness on direct load and refresh, bounded missing-content classification, and process cleanup. Full checks, packed consumer scan, and CI evidence will be recorded in issue #40 and the release PR.
