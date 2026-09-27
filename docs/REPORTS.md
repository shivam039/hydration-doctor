# Reading reports

Hydration Doctor emits a versioned JSON document (`schemaVersion: 1`), an escaped self-contained HTML report, or a terminal summary. JSON contains a run ID, sanitized base URL, browser name, overall status, and one result for each direct, refresh, and configured client-navigation scenario.

Each result includes its scenario, route, sanitized URL, pass status, findings, diagnostics, and bounded browser events. A diagnostic records a category, confidence, severity, observed evidence, and a scenario-level reproduction recipe. Some categories also include an explanation. Reproduction recipes describe the browser action without inventing source locations. Snapshot and document evidence appear only when configured. Interactions include only action type, step number, and pass status; configured selectors and entered values are not copied into interaction evidence.

Interpretation guidance:

- `confirmed-hydration-warning` means a recognized hydration warning was observed in the browser console. It does not identify a source location or root cause.
- `navigation-dependent-rendering-inconsistency` and SSR/client snapshot differences mean configured outputs differed. A difference alone does not prove a hydration failure.
- `visual-rendering-difference` reports a bounded pixel comparison between a direct-load screenshot and the same route after refresh. `visual-capture-incomplete` means the requested image could not be compared. Neither category is a hydration diagnosis. HTML reports embed the captured PNGs and diff when available.
- Configuring `routes[].visual.baseline` adds cross-run evidence in `visualBaseline`. Status is `matched`, `different`, `missing`, `invalid`, `inconclusive`, or `updated`. A missing baseline makes the scan inconclusive; a changed baseline is a visual finding, not proof of hydration failure. HTML reports attach the bounded diff image when available.
- `browser-console-error`, `browser-runtime-exception`, `failed-network-request`, `failed-network-dependency`, `unexpected-redirect`, `loading-readiness-failure`, and `missing-expected-ui` describe observed behavior. They should not be relabeled as hydration errors without separate evidence.
- A passed run means configured checks passed. It does not prove every route or interaction in the application is correct.

Reports may contain application text and DOM attributes when snapshots are enabled. HTML evidence is opt-in and bounded. Configured screenshots can include any visible application data. Review artifacts before sharing them. See [security guidance](security/ADVERSARIAL_REVIEW_2026-09-27.md) for collection limits and redaction behavior.

The JSON schema is currently versioned by `schemaVersion`; no separate formal JSON Schema is published yet. Consumers should reject unknown major schema versions and tolerate additional fields.
