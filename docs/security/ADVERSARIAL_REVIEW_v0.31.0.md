# Adversarial review — 0.31.0 delayed responses and state races

## Findings and mitigations

- **Client-navigation interactions were not executed:** The state-race scenario could navigate to its destination but never start either request, weakening the race evidence. The scanner now executes destination interactions after the URL transition and on forward-history return before readiness/expected-content assertions; the test requires the interactions to settle and validates both latest-wins and stale-control outcomes.
- **Fast response hides the late stale overwrite:** The fixture exposes an all-requests-settled marker. Scanner assertions wait for it before checking selected account text.
- **The stale route is mislabeled as hydration failure:** The expected visible account text fails after both requests settle; the review checks the finding remains an expected-UI issue and does not claim a React hydration mismatch.
- **Test depends on external identity or data services:** Both endpoints are local Next.js route handlers with fixed response labels and bounded delays.
- **Timing-only success is flaky:** Delays create an ordering window; readiness and result assertions use explicit DOM markers. Waits remain bounded.
- **Arbitrary request parameters create resource abuse:** The fixture accepts only `slow` and `fast`; their delays are fixed at 600 ms and 75 ms.
- **Latest-wins mechanism is overgeneralized:** The fixture verifies one local component state pattern. It does not prove correctness for real providers, caches, server actions, or application state libraries.

## Residual limitations

This fixture simulates response order through a local API. It does not throttle CPU or the browser's network stack, and it is not evidence for real authentication-provider behavior.
