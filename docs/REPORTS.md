# Reading reports

Hydration Doctor emits a versioned JSON document (`schemaVersion: 1`), an escaped self-contained HTML report, JUnit XML, SARIF 2.1.0 for static analysis, or a terminal summary. JSON contains a run ID, sanitized base URL, browser name, overall status, and one result for each direct, refresh, and configured client-navigation scenario. Select `junit` with `reporter` and set `--output results.xml` (or include it in a multi-reporter output directory) for CI test-result ingestion. Each scenario becomes one testcase; an inconclusive scan marks its cases skipped.

Use `hydration-doctor analyze --source ./src --format sarif --output results.sarif` to write SARIF 2.1.0. JSON remains the default. SARIF maps candidate rules and parse failures to stable rule IDs, uses relative encoded source paths, and omits source excerpts and candidate evidence values. Candidates remain advisory; SARIF output does not establish a runtime hydration failure.

Each result includes its scenario, route, sanitized URL, pass status, findings, diagnostics, and bounded browser events. A diagnostic records a category, confidence, severity, observed evidence, and a scenario-level reproduction recipe. Some categories also include an explanation. Reproduction recipes describe the browser action without inventing source locations. Snapshot and document evidence appear only when configured. Interactions include only action type, step number, and pass status; configured selectors and entered values are not copied into interaction evidence.

Interpretation guidance:

- `confirmed-hydration-warning` means a recognized hydration warning was observed in the browser console. It does not identify a source location or root cause.
- `navigation-dependent-rendering-inconsistency`, `client-navigation-rendering-inconsistency`, and SSR/client snapshot differences mean configured outputs differed. A difference alone does not prove a hydration failure.
- `visual-rendering-difference` reports a bounded pixel comparison between a direct-load screenshot and the same route after refresh. `visual-capture-incomplete` means the requested image could not be compared. Neither category is a hydration diagnosis. HTML reports embed the captured PNGs and diff when available.
- Configuring `routes[].visual.baseline` adds cross-run evidence in `visualBaseline`. Status is `matched`, `different`, `missing`, `invalid`, `inconclusive`, or `updated`. A missing baseline makes the scan inconclusive; a changed baseline is a visual finding, not proof of hydration failure. HTML reports attach the bounded diff image when available.
- Failed fill-value assertions are reported as `interaction-outcome-failure`. The report identifies the scenario and step without including the entered or expected value; the finding alone does not establish hydration as the cause.
- `browser-console-error`, `browser-runtime-exception`, `failed-network-request`, `failed-network-dependency`, `unexpected-redirect`, `loading-readiness-failure`, and `missing-expected-ui` describe observed behavior. They should not be relabeled as hydration errors without separate evidence.
- A passed run means configured checks passed. It does not prove every route or interaction in the application is correct.

Reports may contain application text and DOM attributes when snapshots are enabled. HTML evidence is opt-in and bounded. Configured screenshots can include any visible application data. Review artifacts before sharing them. See [security guidance](security/ADVERSARIAL_REVIEW_2026-09-27.md) for collection limits and redaction behavior.

The structural contract for `schemaVersion: 1` is published as the [JSON Schema](schema/report-v1.schema.json). Consumers should reject unknown schema versions and tolerate additional fields within version 1. Diagnostic categories and explanatory prose can grow over time; integrations should branch on schema version and stable category identifiers rather than prose.
