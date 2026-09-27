# Adversarial review — 0.21.0 production App Router navigation

- **False client-navigation success:** The fixture uses a real Next.js `<Link>`. The scanner marks a new document request during the click as a finding; the passing assertion requires that finding to be absent.
- **Confusing aggregate evidence:** Document-navigation counters also observe browser history operations, so the test does not mistake their cumulative total for click-only evidence. Back and forward success are asserted separately.
- **Readiness and race handling:** Client navigation waits for exact URL and configured visible destination content under a finite timeout. The negative expectation must fail and must not produce a confirmed hydration classification.
- **Process cleanup:** The production server cleanup hook is installed immediately after spawn and covers every subsequent assertion.
- **Residual limit:** Evidence covers one pinned Next.js/React version and one production App Router `<Link>` route; it does not generalize to all router configurations.
