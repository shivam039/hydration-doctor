import { withBrowser, runPage } from "../browser/engine.js";
import { compareSnapshots } from "../comparison/snapshots.js";
import { compareVisualEvidence } from "../comparison/visual.js";
import {
  readVisualBaseline,
  writeVisualBaseline,
} from "../comparison/baselines.js";
import { validateConfig } from "../config/index.js";
import { redactSensitiveText, sanitizeUrl } from "../utils/redact.js";

export async function scan(config, overrides = {}) {
  const signal = overrides.signal;
  if (
    signal !== undefined &&
    (!signal ||
      typeof signal.aborted !== "boolean" ||
      typeof signal.addEventListener !== "function" ||
      typeof signal.removeEventListener !== "function")
  ) {
    throw new TypeError("overrides.signal must be an AbortSignal.");
  }
  throwIfAborted(signal);
  const effective = validateConfig({
    ...config,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => key !== "signal"),
    ),
  });
  const base = new URL(effective.baseUrl);
  const results = await withBrowser(
    effective,
    async (browser) => {
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
            const result = await runPage(
              browser,
              url,
              effective,
              scenario,
              signal,
            );
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
      const workerResults = await Promise.allSettled(
        Array.from(
          { length: Math.min(effective.concurrency, jobs.length) },
          () => worker(),
        ),
      );
      const workerFailure = workerResults.find(
        (result) => result.status === "rejected",
      );
      if (workerFailure) throw workerFailure.reason;
      return collected;
    },
    signal,
  );
  throwIfAborted(signal);
  for (const configuredRoute of effective.routes) {
    const rawRoute =
      typeof configuredRoute === "string"
        ? configuredRoute
        : configuredRoute.path;
    const route = redactSensitiveText(rawRoute);
    if (!configuredRoute.snapshot && !configuredRoute.visual) continue;
    const direct = results.find(
      (result) => result.scenario === "direct" && result.route === route,
    );
    const refresh = results.find(
      (result) => result.scenario === "refresh" && result.route === route,
    );
    if (direct?.snapshot && refresh?.snapshot) {
      const differences = compareSnapshots(direct.snapshot, refresh.snapshot);
      if (differences.length) {
        const diagnostic = {
          category: "navigation-dependent-rendering-inconsistency",
          confidence: "observed",
          severity: "error",
          evidence: differences,
          explanation:
            "The configured DOM snapshot differed between direct navigation and refresh. This does not by itself prove a hydration mismatch or identify a root cause.",
          reproduction: refresh.reproduction ?? direct.reproduction,
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
    }
    if (configuredRoute.visual && direct && refresh) {
      const maxDiffRatio = configuredRoute.visual.maxDiffRatio ?? 0;
      const comparison = compareVisualEvidence(
        direct.visualScreenshot,
        refresh.visualScreenshot,
        maxDiffRatio,
      );
      if (!comparison) {
        const captureNotes = [
          direct.visualScreenshot?.captureNote,
          refresh.visualScreenshot?.captureNote,
        ].filter(Boolean);
        const diagnostic = {
          category: "visual-capture-incomplete",
          confidence: "observed",
          severity: "warning",
          evidence: captureNotes,
          explanation:
            "The configured screenshots could not be compared. No visual pass or hydration conclusion can be drawn.",
          reproduction: refresh.reproduction ?? direct.reproduction,
        };
        for (const result of [direct, refresh]) {
          result.visualComparison = { complete: false, captureNotes };
          result.diagnostics ??= [];
          result.diagnostics.push(diagnostic);
          result.findings.push(
            "Configured visual comparison could not be completed; see diagnostics.",
          );
          result.passed = false;
        }
        continue;
      }
      const evidence = {
        complete: true,
        baselineScenario: "direct",
        comparedScenario: "refresh",
        ...comparison,
      };
      const diagnostic = {
        category: "visual-rendering-difference",
        confidence: "observed",
        severity: comparison.passed ? "info" : "warning",
        evidence: {
          changedPixels: comparison.changedPixels,
          totalPixels: comparison.totalPixels,
          changedPixelRatio: comparison.changedPixelRatio,
          maxDiffRatio,
          width: comparison.width,
          height: comparison.height,
        },
        explanation:
          "Configured viewport pixels differed between direct load and refresh. Pixel differences are not proof of a hydration error.",
        reproduction: refresh.reproduction ?? direct.reproduction,
      };
      for (const result of [direct, refresh]) {
        result.visualComparison = evidence;
        result.diagnostics ??= [];
        result.diagnostics.push(diagnostic);
        if (!comparison.passed) {
          result.findings.push(
            `Configured screenshot difference ratio ${comparison.changedPixelRatio} exceeded the ${maxDiffRatio} threshold.`,
          );
          result.passed = false;
        }
      }
      if (comparison.diffImage) {
        direct.visualDiff = {
          mimeType: comparison.diffMimeType,
          data: comparison.diffImage,
        };
      }
    }
  }
  for (const configuredRoute of effective.routes) {
    if (!configuredRoute.visual?.baseline) continue;
    const rawRoute = configuredRoute.path;
    const route = redactSensitiveText(rawRoute);
    const direct = results.find(
      (result) => result.scenario === "direct" && result.route === route,
    );
    const refresh = results.find(
      (result) => result.scenario === "refresh" && result.route === route,
    );
    const baselineEvidence = {};
    if (!direct?.visualScreenshot?.complete) {
      baselineEvidence.status = "inconclusive";
      baselineEvidence.reason =
        "Direct-load screenshot capture was incomplete.";
    } else if (effective.updateBaselines) {
      await writeVisualBaseline(
        effective.baselineDir,
        configuredRoute.visual.baseline,
        Buffer.from(direct.visualScreenshot.data, "base64"),
      );
      baselineEvidence.status = "updated";
      baselineEvidence.file = configuredRoute.visual.baseline;
    } else {
      const image = await readVisualBaseline(
        effective.baselineDir,
        configuredRoute.visual.baseline,
      );
      if (!image) {
        baselineEvidence.status = "missing";
        baselineEvidence.reason =
          "Run `hydration-doctor scan --config <path> --update-baselines` to create this baseline explicitly.";
      } else {
        try {
          const comparison = compareVisualEvidence(
            { complete: true, data: image.toString("base64") },
            direct.visualScreenshot,
            configuredRoute.visual.maxDiffRatio ?? 0,
          );
          baselineEvidence.status = comparison.passed ? "matched" : "different";
          baselineEvidence.changedPixels = comparison.changedPixels;
          baselineEvidence.totalPixels = comparison.totalPixels;
          baselineEvidence.changedPixelRatio = comparison.changedPixelRatio;
          baselineEvidence.maxDiffRatio = comparison.maxDiffRatio;
          baselineEvidence.width = comparison.width;
          baselineEvidence.height = comparison.height;
          if (comparison.diffImage) {
            direct.visualBaselineDiff = {
              mimeType: comparison.diffMimeType,
              data: comparison.diffImage,
            };
          }
        } catch {
          baselineEvidence.status = "invalid";
          baselineEvidence.reason =
            "Baseline was not a readable PNG image; replace it with an explicit baseline update.";
        }
      }
    }
    const diagnostic = {
      category:
        baselineEvidence.status === "different"
          ? "visual-baseline-difference"
          : baselineEvidence.status === "missing" ||
              baselineEvidence.status === "invalid" ||
              baselineEvidence.status === "inconclusive"
            ? "visual-baseline-incomplete"
            : "visual-baseline-status",
      confidence: "observed",
      severity:
        baselineEvidence.status === "different"
          ? "error"
          : baselineEvidence.status === "missing" ||
              baselineEvidence.status === "invalid" ||
              baselineEvidence.status === "inconclusive"
            ? "warning"
            : "info",
      evidence: baselineEvidence,
      explanation:
        "Persistent visual baseline evidence describes pixel differences only and does not prove a hydration error.",
      reproduction: direct?.reproduction ?? refresh?.reproduction,
    };
    for (const result of [direct, refresh].filter(Boolean)) {
      result.visualBaseline = baselineEvidence;
      result.diagnostics ??= [];
      result.diagnostics.push(diagnostic);
      if (baselineEvidence.status === "different") {
        result.findings.push(
          `Persistent visual baseline difference ratio ${baselineEvidence.changedPixelRatio} exceeded the ${baselineEvidence.maxDiffRatio} threshold.`,
        );
        result.passed = false;
      }
    }
  }
  const hasInconclusiveBaseline = results.some(
    (result) =>
      result.visualBaseline?.status === "missing" ||
      result.visualBaseline?.status === "invalid" ||
      result.visualBaseline?.status === "inconclusive",
  );
  return {
    schemaVersion: 1,
    runId: `hd-${Date.now().toString(36)}`,
    browser: effective.browser,
    baseUrl: sanitizeUrl(effective.baseUrl),
    status: results.some((result) => !result.passed)
      ? "failed"
      : hasInconclusiveBaseline
        ? "inconclusive"
        : "passed",
    results,
  };
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw signal.reason ?? new Error("Scan cancelled.");
}
