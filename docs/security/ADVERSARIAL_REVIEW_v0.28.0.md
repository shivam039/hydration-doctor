# Adversarial review — 0.28.0 query-driven App Router navigation

## Findings and mitigations

- **URL changes without matching content:** The destination is a server page that reads the query parameter and emits a distinct readiness marker. The scanner asserts the exact query URL and expected text during client navigation; the browser test also checks content after back and forward.
- **Navigation silently becomes a full document request:** The scanner's existing navigation evidence detects document requests; the new scenario asserts that this finding is absent.
- **Direct-load-only test gives false confidence:** The same destination is scanned directly, refreshed, and reached through the source `<Link>` transition.
- **Sensitive query values leak into evidence:** The fixture uses only the literal non-sensitive `view=activity` value. This does not establish that arbitrary query values are safe to include in reports; users must avoid credentials in route paths and use the documented redaction behavior.
- **Framework claim is broader than evidence:** The fixture is pinned to Next.js 15.5.26 / React 18.3.1 and one string-valued query selection. It does not claim general RSC, rewrite, middleware, or streaming-transition coverage.
- **Consumer test uses a mismatched browser revision:** The clean consumer install can resolve a newer allowed Playwright version than the repository lockfile. The packed-consumer script now installs Chromium through that consumer's own Playwright CLI before launching the installed package.

## Residual limitations

The browser-history assertion verifies one known query value and does not exercise multiple query keys, dynamic segments, server actions, or prefetch races. Production behavior remains covered only by the pinned Chromium fixture.
