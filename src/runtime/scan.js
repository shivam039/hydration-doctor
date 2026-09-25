import { withBrowser, runPage } from "../browser/engine.js";
import { compareSnapshots } from "../comparison/snapshots.js";
import { validateConfig } from "../config/index.js";
import { redactSensitiveText, sanitizeUrl } from "../utils/redact.js";

export async function scan(config, overrides = {}) {
  const signal = overrides.signal;
  const effective = validateConfig({
    ...config,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => key !== "signal"),
    ),
  });
  const base = new URL(effective.baseUrl);
  const results = await withBrowser(effective, async (browser) => {
    const jobs = [];
    for (const route of effective.routes) {
      const target = new URL(route.path, base).href;
      jobs.push({ url: target, scenario: { name: "direct", route } });
      jobs.push({ url: target, scenario: { name: "refresh", route } });
      if (
        effective.navigation &&
        target === new URL(effective.navigation.to, base).href
      ) {
        const entryRoute = { path: effective.navigation.from };
        const entryUrl = new URL(entryRoute.path, base).href;
        jobs.push({
          url: entryUrl,
          scenario: {
            name: "client-navigation",
            route,
            targetUrl: target,
          },
        });
      }
    }
    const collected = new Array(jobs.length);
    let nextIndex = 0;
    const worker = async () => {
      while (true) {
        if (signal?.aborted)
          throw signal.reason ?? new Error("Scan cancelled.");
        const index = nextIndex++;
        if (index >= jobs.length) return;
        const { url, scenario } = jobs[index];
        const attempts = [];
        for (let attempt = 0; attempt <= effective.retries; attempt += 1) {
          const result = await runPage(browser, url, effective, scenario);
          attempts.push({
            attempt: attempt + 1,
            passed: result.passed,
            findings: result.findings,
          });
          collected[index] = result;
          if (result.passed) break;
        }
        if (attempts.length > 1) {
          const allPassed = attempts.every((attempt) => attempt.passed);
          collected[index].attempts = attempts;
          collected[index].passed = allPassed;
          if (!allPassed && attempts.some((attempt) => attempt.passed)) {
            collected[index].findings.push(
              "Scenario results varied between attempts; this run remains failed.",
            );
          }
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(effective.concurrency, jobs.length) }, () =>
        worker(),
      ),
    );
    return collected;
  });
  for (const configuredRoute of effective.routes) {
    const rawRoute =
      typeof configuredRoute === "string"
        ? configuredRoute
        : configuredRoute.path;
    const route = redactSensitiveText(rawRoute);
    if (!configuredRoute.snapshot) continue;
    const direct = results.find(
      (result) => result.scenario === "direct" && result.route === route,
    );
    const refresh = results.find(
      (result) => result.scenario === "refresh" && result.route === route,
    );
    if (!direct?.snapshot || !refresh?.snapshot) continue;
    const differences = compareSnapshots(direct.snapshot, refresh.snapshot);
    if (!differences.length) continue;
    const diagnostic = {
      category: "navigation-dependent-rendering-inconsistency",
      confidence: "observed",
      severity: "error",
      evidence: differences,
      explanation:
        "The configured DOM snapshot differed between direct navigation and refresh. This does not by itself prove a hydration mismatch or identify a root cause.",
    };
    for (const result of [direct, refresh]) {
      result.diagnostics ??= [];
      result.diagnostics.push(diagnostic);
      result.findings.push(
        "Configured DOM snapshot differs between direct navigation and refresh; see diagnostic evidence.",
      );
      result.passed = false;
    }
  }
  return {
    schemaVersion: 1,
    runId: `hd-${Date.now().toString(36)}`,
    browser: effective.browser,
    baseUrl: sanitizeUrl(effective.baseUrl),
    status: results.every((result) => result.passed) ? "passed" : "failed",
    results,
  };
}
