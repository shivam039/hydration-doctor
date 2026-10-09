# Adversarial review — 0.29.0 dynamic App Router segments

## Findings and mitigations

- **Correct URL but stale UI:** The `[slug]` server page renders a slug-specific readiness marker. The scanner checks the expected URL and text after direct load, refresh, and client navigation.
- **Full document navigation mistaken for a client transition:** The scenario asserts that the scanner did not report a new document request.
- **History verifies location only:** Browser back/forward checks assert the visible source text and destination text in addition to URLs.
- **Untrusted route parameter becomes markup:** React renders the route parameter as a text child, which escapes markup. The fixture uses a fixed local `activity` slug and does not claim production input validation.
- **Compatibility overstatement:** Evidence covers one production dynamic segment on pinned Next.js/React and Chromium; catch-all routes, rewrites, middleware, and all RSC behaviors remain unverified.

## Residual limitations

Only a simple single-segment string parameter is tested. Encoded, Unicode, catch-all, optional catch-all, and not-found cases are outside this iteration.
