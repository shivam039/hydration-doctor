# Hydration Doctor — Master Epic Roadmap

This roadmap records scope, dependencies, acceptance, and evidence for the 18 epics in the product brief. Status describes repository evidence; an unchecked item is not complete. Dependency order follows the five implementation phases. HD-15 is continuous across all phases.

## Progress ledger

- **Repository baseline (2026-09-25):** inspected authenticated repository `shivam039/hydration-doctor`; it was empty (no commits or files). No pre-existing code/configuration to preserve.
- **Issue queue:** all 18 master-epic GitHub issues and all eight next-release issues (#22–#29) are closed with acceptance evidence. Their closures do not claim the full breadth of every master-epic description is finished; remaining release gaps are documented below.
- **Five release iterations (2026-09-27):** PRDs [0.3.0](../releases/PRD_v0.3.0.md), [0.4.0](../releases/PRD_v0.4.0.md), [0.5.0](../releases/PRD_v0.5.0.md), [0.6.0](../releases/PRD_v0.6.0.md), and [0.7.0](../releases/PRD_v0.7.0.md) were posted; their implementation issues [#25](https://github.com/shivam039/hydration-doctor/issues/25), [#26](https://github.com/shivam039/hydration-doctor/issues/26), [#27](https://github.com/shivam039/hydration-doctor/issues/27), [#28](https://github.com/shivam039/hydration-doctor/issues/28), and [#29](https://github.com/shivam039/hydration-doctor/issues/29) are closed with CI evidence.
- **Verification (2026-09-27):** `npm run check` passed: ESLint, 49 Node tests, and Prettier. Coverage includes CLI commands, real Chromium navigation/hydration/interactivity, empty-data and masked visual fixtures, React hydration fixtures, Next.js 15.5.26 App/Pages Router direct-load/refresh in development and production, production Suspense streaming/readiness, auth and local-storage restoration, persistent desktop/mobile visual baseline profiles, secret-safe input-reset assertions, and JS/JSX analyzer fixtures. `npm audit --omit=dev` found zero production vulnerabilities. `npm run test:consumer` installs the packed tarball into a fresh project and completes a real-browser scan. GitHub matrix run [#36296435023](https://github.com/shivam039/hydration-doctor/actions/runs/36296435023) passed on Node 20, 22, and 24, including package dry-run and consumer scan. [Adversarial review record](security/ADVERSARIAL_REVIEW_2026-09-27.md) documents findings and residual risks. No package release is claimed.
- **Implementation checkpoint:** [PR #19](https://github.com/shivam039/hydration-doctor/pull/19) and adversarial fixes in [PR #20](https://github.com/shivam039/hydration-doctor/pull/20) are merged. Follow-up work is in [draft PR #21](https://github.com/shivam039/hydration-doctor/pull/21). No release has been published.
- **GitHub issues:** created and confirmed with `gh`: [HD-01 #1](https://github.com/shivam039/hydration-doctor/issues/1), [HD-02 #2](https://github.com/shivam039/hydration-doctor/issues/2), [HD-03 #3](https://github.com/shivam039/hydration-doctor/issues/3), [HD-04 #4](https://github.com/shivam039/hydration-doctor/issues/4), [HD-05 #5](https://github.com/shivam039/hydration-doctor/issues/5), [HD-06 #6](https://github.com/shivam039/hydration-doctor/issues/6), [HD-07 #7](https://github.com/shivam039/hydration-doctor/issues/7), [HD-08 #8](https://github.com/shivam039/hydration-doctor/issues/8), [HD-09 #9](https://github.com/shivam039/hydration-doctor/issues/9), [HD-10 #10](https://github.com/shivam039/hydration-doctor/issues/10), [HD-11 #11](https://github.com/shivam039/hydration-doctor/issues/11), [HD-12 #12](https://github.com/shivam039/hydration-doctor/issues/12), [HD-13 #13](https://github.com/shivam039/hydration-doctor/issues/13), [HD-14 #14](https://github.com/shivam039/hydration-doctor/issues/14), [HD-15 #15](https://github.com/shivam039/hydration-doctor/issues/15), [HD-16 #16](https://github.com/shivam039/hydration-doctor/issues/16), [HD-17 #17](https://github.com/shivam039/hydration-doctor/issues/17), [HD-18 #18](https://github.com/shivam039/hydration-doctor/issues/18).
- **Next release PRD:** [Hydration Doctor 0.2.0](../releases/PRD_v0.2.0.md); issues [#22](https://github.com/shivam039/hydration-doctor/issues/22), [#23](https://github.com/shivam039/hydration-doctor/issues/23), and [#24](https://github.com/shivam039/hydration-doctor/issues/24) are closed with verification evidence.
- **Follow-up release PRDs:** [0.3.0](../releases/PRD_v0.3.0.md), [0.4.0](../releases/PRD_v0.4.0.md), [0.5.0](../releases/PRD_v0.5.0.md), [0.6.0](../releases/PRD_v0.6.0.md), and [0.7.0](../releases/PRD_v0.7.0.md) were completed as five sequential iterations; all linked issues are closed. These are roadmap increments, not published npm releases.
- **Release state:** not ready for a stable 1.0 release. Phase 1 remains in progress; selected HD-05, HD-06, HD-08, HD-10–HD-14 capabilities are implemented and verified. Advanced framework breadth, comprehensive fixture coverage, and stable-API/migration evidence remain outstanding.

## Epic index

| ID    | Epic                                    |      Phase | Depends on                 | Status                         |
| ----- | --------------------------------------- | ---------: | -------------------------- | ------------------------------ |
| HD-01 | Repository Foundation                   |          1 | —                          | Complete                       |
| HD-02 | CLI and Configuration                   |          1 | HD-01                      | Issue acceptance closed        |
| HD-03 | Browser Runtime Engine                  |          1 | HD-01, HD-02               | Complete                       |
| HD-04 | Navigation Consistency                  |          1 | HD-02, HD-03               | Complete                       |
| HD-05 | SSR and Hydration Instrumentation       |          2 | HD-03                      | Complete                       |
| HD-06 | React and Next.js Adapters              |          2 | HD-05                      | Issue acceptance closed        |
| HD-07 | Hydration Interactivity Testing         |          2 | HD-03, HD-05               | Complete (click fixture scope) |
| HD-08 | DOM and Structural Comparison           |          2 | HD-03                      | Complete                       |
| HD-09 | Loading, State, and Data Consistency    |          2 | HD-04, HD-05               | Issue acceptance closed        |
| HD-10 | Visual and Layout Regression            |          3 | HD-08                      | Issue acceptance closed        |
| HD-11 | Root-Cause Diagnostics                  |          3 | HD-05, HD-08, HD-09, HD-10 | Issue acceptance closed        |
| HD-12 | Optional Static Analysis                |          3 | HD-01                      | Issue acceptance closed        |
| HD-13 | Reporting and Developer Experience      |          4 | HD-08, HD-10, HD-11, HD-14 | Complete                       |
| HD-14 | Security, Privacy, and Reliability      |          4 | HD-01 onward               | Complete                       |
| HD-15 | Fixtures and Automated Testing          | Continuous | HD-01 onward               | In progress (continuous)       |
| HD-16 | CI/CD and npm Release Engineering       |          5 | HD-01, HD-15               | Issue acceptance closed        |
| HD-17 | Documentation and Open-Source Readiness |          5 | HD-02, HD-13, HD-14        | Issue acceptance closed        |
| HD-18 | Extensibility and Stable Release        |          5 | HD-01–HD-17                | Issue acceptance closed        |

## Epics, acceptance, and completion evidence

### HD-01 — Repository Foundation

Establish a standalone JavaScript ESM npm package with executable bin, exports, Node LTS engines, package metadata, lockfile, scripts, lint/format/test/browser tooling, source directories, tests, fixtures, docs, examples, workflows, MIT license, and repository hygiene files. Keep runtime dependencies minimal and errors/logging/exit codes consistent.

**Acceptance:** a fresh checkout installs reproducibly, validates, runs tests, and executes help/version. **Evidence:** package metadata, lockfile, scripts, workflows, and captured successful command output.

### HD-02 — CLI and Configuration

Implement `init`, `scan`, `doctor`, help and version; config-file and direct URL/route/browser/reporter options; validated JavaScript schema for routes, navigation, assertions, readiness, timeouts, browser, viewport/device, reports and exclusions. Document CLI-over-config precedence. Do not overwrite existing config. Explain browser setup. Exit 0=pass, 1=verified finding, 2=setup/config/execution failure; inconclusive is not clean pass.

**Acceptance:** each command and validation path has tests and usage documentation. **Evidence:** CLI/config tests, help output, and examples.

### HD-03 — Browser Runtime Engine

Reusable Playwright lifecycle; isolated contexts, Chromium/Firefox/WebKit, browser environment and optional auth state; console/page/request/response/redirect/navigation events; explicit selector/URL/application readiness, bounded timeouts and cancellation, concurrency/retries, crash reporting, preserved pre-readiness events, and deterministic cleanup. Never infer readiness from arbitrary sleeps.

**Acceptance:** healthy/failing applications run reliably without leaked processes. **Evidence:** real-browser fixture runs, timeout/cleanup tests, and collected event records.

### HD-04 — Navigation Consistency

Independent direct, client-side, refresh, back/forward, repeated, deep-link, redirect, query and hash scenarios. Compare final URL, expected visibility/text, and runtime failures; prove client navigation was client-side; distinguish expected redirects; support paths/clicks and equivalent isolated/shared-auth state.

**Acceptance:** direct-load-only and refresh-only regressions are detected. **Evidence:** targeted fixtures and scenario report showing reproducible differences.

### HD-05 — SSR and Hydration Instrumentation

Capture initial document response/SSR evidence and observable DOM checkpoints; collect React hydration warnings and safely supported recoverable errors; account for streaming/Suspense and CSR-only pages. A load event or arbitrary later DOM difference alone is not proof of hydration mismatch. Do not mutate the app or require unstable React internals.

**Acceptance:** known mismatch fixtures yield reproducible evidence and unrelated updates are not classified as hydration errors. **Evidence:** positive and negative runtime fixtures.

### HD-06 — React and Next.js Adapters

Framework-independent core with optional React/Next capability detection covering client routing, App/Pages Router, Server/Client Components, Suspense/streaming, dynamic imports, redirects, layouts, loading/error boundaries, transitions and prefetch. Record tested version compatibility.

**Acceptance:** React and both Next router fixture applications demonstrate supported capabilities. **Evidence:** production-build fixture matrix and compatibility table.

### HD-07 — Hydration Interactivity Testing

Configurable click/input/form interactions with before-ready and readiness-gated checkpoints and expected outcomes, without React internals. Input reset evidence, navigation steps, and slow network/CPU scenarios remain planned.

**Acceptance:** broken pre-hydration interaction fails; correctly gated interaction passes. **Evidence:** paired browser fixtures.

### HD-08 — DOM and Structural Comparison

Configurable snapshots; expected presence/visibility; structure/text/attribute differences; missing/duplicate elements; normalization and ignored/dynamic values; equivalent checkpoints and evidence references. Raw HTML equality is insufficient.

**Acceptance:** meaningful regressions are found while configured volatile content is ignored. **Evidence:** structural positive/negative comparison tests.

### HD-09 — Loading, State, and Data Consistency

Explicit assertions for loading indicators, completion/empty content, state initialization, refresh/storage restoration, failed data and error boundaries, and repeatable races. Application-specific expectations distinguish legitimate empty data and network errors from hydration findings.

**Acceptance:** expected empty dataset passes; violated configured expectation fails; suspected intermittent issue can be repeated within a bound. **Evidence:** deterministic data fixtures and scenario results.

### HD-10 — Visual and Layout Regression

Optional reproducible desktop/mobile screenshots and cross-navigation comparisons, baselines/diffs/thresholds, masks, font/animation stabilization where possible, explicit missing UI assertions and supported layout shift observation. Pixel differences are not hydration diagnoses.

**Acceptance:** missing-sidebar fixture yields useful screenshot and structural finding. **Evidence:** fixture image artifacts and classified result.

### HD-11 — Root-Cause Diagnostics

Evidence-backed categories: confirmed hydration warning/error, navigation inconsistency, missing UI, failed network, client-state issue, loading/readiness, redirect, runtime exception, visual regression, or inconclusive. Each finding includes evidence, scenario, reproduction, severity and investigation suggestions; correlate/deduplicate without fabricated source locations or overstated hypotheses.

**Acceptance:** known fixtures classify correctly and unrelated failures remain distinct. **Evidence:** classification tests and sample reports.

### HD-12 — Optional Static Analysis

Optional AST-based JS/JSX candidates for browser-only APIs, nondeterminism, locale/timezone, environment branches, suppression, invalid nesting (when reliable), and render side effects. Include file/line, exclusions, false-positive handling; never rewrite source or call a static candidate a runtime failure.

**Acceptance:** intentional patterns have accurate locations. **Evidence:** analyzer tests with positive, negative and excluded examples.

### HD-13 — Reporting and Developer Experience

Terminal summary, versioned JSON, self-contained escaped HTML with local evidence, screenshots/traces and CI output. Include scenario results, status, reproduction, evidence, classification, environment, timing, suggestions, schema/run/commit metadata. Bound artifacts, retain safely, redact secrets; no default telemetry.

**Acceptance:** every reported issue can be reproduced from report details. **Evidence:** schema validation, HTML escaping/redaction checks, example report.

### HD-14 — Security, Privacy, and Reliability

No credentials/cookies/auth headers/sensitive bodies in evidence by default; explicit sensitive-evidence opt-in, redaction, constrained output, URL/external-scan validation, documented config trust boundary, safe handling of malformed pages/redirects/crashes/timeouts, HTML injection defenses, dependency and publishing-permission audit; no mandatory service/telemetry.

**Acceptance:** security regression tests pass and fixture secrets never reach reports. **Evidence:** adversarial tests, dependency/package audit, permission review.

### HD-15 — Fixtures and Automated Testing (continuous)

Deterministic fixtures: healthy React CSR, Next App/Pages SSR, text/structure mismatch, browser-only misuse, direct/refresh/client navigation regressions, ignored/reset interactions, streaming Suspense, delayed import, failed API, legitimate empty data, stuck loading, auth redirect, restoration, dynamic content, intermittent race. Unit/integration/CLI/real-browser positive, negative and regression tests; production Next builds, supported browser/framework matrix, tarball consumer install; no paid APIs.

**Acceptance:** every advertised detection has real fixture evidence. **Evidence:** fixture inventory with runnable commands and recorded results.

### HD-16 — CI/CD and npm Release Engineering

PR validation, lint/unit/integration/browser tests, dependency checks, pack/consumer smoke, supported Node matrix, compatibility/coverage, changelog, provenance where supported, approval-gated manual publication and minimal permissions. Never publish from PRs or expose npm credentials to untrusted workflows. Confirm package availability and packed-file exclusions.

**Acceptance:** fresh consumer installs package and runs a successful scan. **Evidence:** CI runs, tarball manifest and consumer log; no release until separately approved.

### HD-17 — Documentation and Open-Source Readiness

Runnable README quick start, config/CLI, React, Next App/Pages, CI, troubleshooting, classification, report schema, security, contribution, conduct, changelog, release, architecture/extension docs. Explain limitations and tested versions.

**Acceptance:** a new developer can install, configure, scan, interpret and contribute. **Evidence:** executable examples and doc links checked against supported behavior.

### HD-18 — Extensibility and Stable Release

Grounded extension points for assertions/adapters/reporters/static rules, future frameworks, stable config/report schemas, compatibility/migration tests, cross-epic/security/package audit and evidence-based release readiness. Separate implemented and planned capability claims.

**Acceptance:** independently installable package, documented public interfaces, reproducible verification, and honest readiness report. **Evidence:** consumer install, API compatibility tests, final matrix and limitations.

## Execution sequence

1. **Phase 1:** HD-01–HD-04, working CLI and navigation verification engine.
2. **Phase 2:** HD-05–HD-09, SSR/CSR, adapters, interaction, structural and state diagnostics.
3. **Phase 3:** HD-10–HD-12, visual, evidence-based diagnoses and optional static checks.
4. **Phase 4:** HD-13–HD-15, reporting, hardening and broad fixtures.
5. **Phase 5:** HD-16–HD-18, CI, docs, compatibility and release readiness.

HD-15 starts in Phase 1 and remains continuous. Use isolated worktrees only for independent tasks; maintain one integration owner. Keep `main` stable; use reviewed feature branches/PRs. No force-push, merge, publication or release without explicit approval.

## Definition of done

The master epic is done only when every epic has evidence; advertised capabilities have passing tests; React/Next fixtures prove direct/client/refresh regressions; hydration diagnoses are distinct from unrelated runtime failures; reports are reproducible; security/privacy pass; packaging/consumer installation and supported CI matrix pass; documentation matches tested behavior; and limitations are explicit. Until then the readiness status remains **not release-ready**.
