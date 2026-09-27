# Adversarial review — 0.26.0 streaming and readiness races

- **Timing-based false pass:** The nested-stream test observes explicit fallback/content selectors in sequence. Fixed delays only create deterministic fixture stages; elapsed time is not treated as readiness evidence.
- **Missing content:** Impossible text on both single and nested stream routes fails under a finite timeout and remains `missing-expected-ui`, not a hydration diagnosis.
- **State race:** The ready fixture changes initial loading markup and sets an application-owned readiness marker together. The stalled fixture keeps the marker absent; both direct and refresh results are checked.
- **Cleanup:** The existing production server test cleanup hook is installed immediately after spawn; the local HTTP fixture server is registered for test cleanup.
- **Residual limit:** Controlled local delays do not model real CDN/CPU behavior or all RSC/streaming configurations.
