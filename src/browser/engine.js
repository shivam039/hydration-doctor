import { chromium, devices, firefox, webkit } from "playwright";
import { createHash } from "node:crypto";
import { assertRouteExpectations } from "../comparison/assertions.js";
import {
  captureServerSnapshot,
  captureSnapshot,
  compareSnapshots,
} from "../comparison/snapshots.js";
import { redactSensitiveText, sanitizeUrl } from "../utils/redact.js";
import {
  classifyRuntimeEvents,
  classifyScenarioFindings,
  hasConfirmedHydrationWarning,
} from "../diagnostics/classify.js";

const browserTypes = { chromium, firefox, webkit };

export async function withBrowser(config, callback) {
  const browserType = browserTypes[config.browser];
  let browser;
  try {
    browser = await browserType.launch({ headless: true });
  } catch (error) {
    if (/Executable doesn't exist|browserType\.launch/i.test(error.message)) {
      throw new Error(
        `Playwright ${config.browser} is not installed. Run: npx playwright install ${config.browser}`,
      );
    }
    throw new Error(`Could not launch ${config.browser}: ${error.message}`);
  }
  try {
    return await callback(browser);
  } finally {
    await browser.close();
  }
}

export async function runPage(browser, url, config, scenario) {
  const device = config.device ? devices[config.device] : {};
  if (config.device && !device)
    throw new Error(`Unknown Playwright device descriptor: ${config.device}`);
  const context = await browser.newContext({
    ...device,
    viewport: config.viewport,
    locale: config.locale,
    timezoneId: config.timezoneId,
    colorScheme: config.colorScheme,
    reducedMotion: config.reducedMotion,
    storageState: config.storageState,
  });
  const allowedDocumentOrigins = new Set([new URL(config.baseUrl).origin]);
  for (const route of config.routes) {
    if (route.expectedUrl)
      allowedDocumentOrigins.add(
        new URL(route.expectedUrl, config.baseUrl).origin,
      );
  }
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (request.isNavigationRequest()) {
      const origin = new URL(request.url()).origin;
      if (!allowedDocumentOrigins.has(origin)) {
        await route.abort("blockedbyclient");
        return;
      }
    }
    await route.continue();
  });
  const page = await context.newPage();
  const events = {
    console: [],
    pageErrors: [],
    failedRequests: [],
    responses: [],
    documentNavigations: 0,
    redirects: [],
  };
  page.on("console", (message) => {
    if (message.type() === "error")
      events.console.push({
        type: "error",
        text: redactSensitiveText(message.text()),
      });
  });
  page.on("pageerror", (error) =>
    events.pageErrors.push(redactSensitiveText(error.message)),
  );
  page.on("requestfailed", (request) =>
    events.failedRequests.push({
      url: sanitizeUrl(request.url()),
      reason: redactSensitiveText(request.failure()?.errorText ?? "unknown"),
    }),
  );
  page.on("response", (response) => {
    if (
      response.request().isNavigationRequest() &&
      response.request().resourceType() === "document"
    ) {
      events.documentNavigations += 1;
      if (response.status() >= 300 && response.status() < 400)
        events.redirects.push({
          from: sanitizeUrl(response.url()),
          status: response.status(),
          location: response.headers().location
            ? sanitizeUrl(
                new URL(response.headers().location, response.url()).href,
              )
            : null,
        });
    }
    events.responses.push({
      url: sanitizeUrl(response.url()),
      status: response.status(),
    });
  });
  try {
    let response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: config.timeout,
    });
    if (!response)
      throw new Error(`No document response received for ${sanitizeUrl(url)}`);
    let documentCapture = await captureDocumentEvidence(
      response,
      config,
      scenario,
    );
    if (scenario.name === "direct")
      await assertRouteExpectations(page, scenario.route, config.timeout);
    const result = {
      scenario: scenario.name,
      route: redactSensitiveText(scenario.route.path),
      url: sanitizeUrl(page.url()),
      status: response.status(),
      passed: false,
      findings: [],
      diagnostics: [],
      events,
      documentEvidence: documentCapture.evidence,
    };
    let finalUrl = page.url();
    if (response.status() >= 400 && scenario.name !== "refresh")
      result.findings.push(`Document returned HTTP ${response.status()}.`);
    if (scenario.name === "refresh") {
      events.documentNavigations = 0;
      response = await page.reload({
        waitUntil: "domcontentloaded",
        timeout: config.timeout,
      });
      if (response)
        documentCapture = await captureDocumentEvidence(
          response,
          config,
          scenario,
        );
      await assertRouteExpectations(page, scenario.route, config.timeout);
      finalUrl = page.url();
      result.url = sanitizeUrl(finalUrl);
      result.status = response?.status() ?? result.status;
      result.documentEvidence = documentCapture.evidence;
      if (!response || response.status() >= 400)
        result.findings.push(
          `Refresh returned HTTP ${response?.status() ?? "no response"}.`,
        );
    }
    if (scenario.name === "client-navigation") {
      const before = events.documentNavigations;
      await page
        .locator(config.navigation.click)
        .click({ timeout: config.timeout });
      await page.waitForURL(
        (candidate) => candidate.href === scenario.targetUrl,
        { timeout: config.timeout },
      );
      if (events.documentNavigations !== before)
        result.findings.push(
          "Navigation used a new document request; expected client-side navigation.",
        );
      await assertRouteExpectations(page, scenario.route, config.timeout);
      finalUrl = page.url();
      result.url = sanitizeUrl(finalUrl);
      result.events.history = await verifyHistory(
        page,
        config,
        scenario,
        result,
      );
    }
    const expectedUrl = scenario.route.expectedUrl
      ? new URL(scenario.route.expectedUrl, config.baseUrl).href
      : scenario.name === "client-navigation"
        ? scenario.targetUrl
        : url;
    if (finalUrl !== expectedUrl) {
      result.findings.push(
        scenario.route.expectedUrl
          ? `Final URL ${sanitizeUrl(finalUrl)} did not match expected URL ${sanitizeUrl(expectedUrl)}.`
          : `Unexpected redirect: expected ${sanitizeUrl(url)} but ended at ${sanitizeUrl(finalUrl)}.`,
      );
    }
    if (scenario.route.snapshot) {
      const snapshot = await captureSnapshot(page, scenario.route.snapshot);
      result.snapshot = sanitizeSnapshot(snapshot);
      if (scenario.name !== "client-navigation" && documentCapture.html) {
        const serverSnapshot = await captureServerSnapshot(
          page,
          documentCapture.html,
          scenario.route.snapshot,
        );
        if (serverSnapshot) {
          result.ssrSnapshot = sanitizeSnapshot(serverSnapshot);
          const differences = compareSnapshots(
            result.ssrSnapshot,
            result.snapshot,
          );
          if (differences.length) {
            result.ssrClientDifferences = differences;
            result.diagnostics.push({
              category: "ssr-client-output-difference",
              confidence: "observed",
              severity: "warning",
              evidence: differences,
              explanation:
                "The configured snapshot differs between the initial server response and the observed client DOM. This difference alone does not prove a hydration error.",
            });
            result.findings.push(
              "Configured SSR and client DOM snapshots differ; see evidence. This does not alone prove a hydration error.",
            );
          }
        }
      }
    }
    result.diagnostics.push(
      ...classifyRuntimeEvents(events),
      ...classifyScenarioFindings(result.findings),
    );
    if (events.console.length)
      result.findings.push(
        `${events.console.length} browser console error(s); see diagnostics for evidence.`,
      );
    if (events.pageErrors.length)
      result.findings.push(
        `${events.pageErrors.length} uncaught page error(s).`,
      );
    result.passed =
      result.status < 400 &&
      result.findings.length === 0 &&
      events.pageErrors.length === 0 &&
      events.console.length === 0 &&
      !hasConfirmedHydrationWarning(result.diagnostics);
    return result;
  } catch (error) {
    return {
      scenario: scenario.name,
      route: redactSensitiveText(scenario.route.path),
      url: sanitizeUrl(page.url()),
      passed: false,
      findings: [redactSensitiveText(error.message)],
      diagnostics: classifyScenarioFindings([
        redactSensitiveText(error.message),
      ]),
      events,
    };
  } finally {
    await context.close();
  }
}

async function verifyHistory(page, config, scenario, result) {
  const entryUrl = new URL(config.navigation.from, config.baseUrl).href;
  const targetUrl = scenario.targetUrl;
  const history = { back: false, forward: false };
  try {
    await page.goBack({
      waitUntil: "domcontentloaded",
      timeout: config.timeout,
    });
    await page.waitForURL(entryUrl, { timeout: config.timeout });
    history.back = true;
  } catch (error) {
    result.findings.push(`Browser back navigation failed: ${error.message}`);
    return history;
  }
  try {
    await page.goForward({
      waitUntil: "domcontentloaded",
      timeout: config.timeout,
    });
    await page.waitForURL(targetUrl, { timeout: config.timeout });
    await assertRouteExpectations(page, scenario.route, config.timeout);
    history.forward = true;
  } catch (error) {
    result.findings.push(`Browser forward navigation failed: ${error.message}`);
  }
  return history;
}

function sanitizeSnapshot(snapshot) {
  return {
    selector: redactSensitiveText(snapshot.selector),
    elements: snapshot.elements.map((element) => ({
      ...element,
      text:
        element.text === undefined
          ? undefined
          : redactSensitiveText(element.text),
      attributes: Object.fromEntries(
        Object.entries(element.attributes).map(([name, value]) => [
          name,
          redactSensitiveText(value),
        ]),
      ),
    })),
  };
}

async function captureDocumentEvidence(response, config, scenario) {
  const headers = response.headers();
  const evidence = {
    url: sanitizeUrl(response.url()),
    status: response.status(),
    contentType: headers["content-type"] ?? null,
    byteLength: Number.isSafeInteger(Number(headers["content-length"]))
      ? Number(headers["content-length"])
      : null,
    sha256: null,
    complete: false,
  };
  const needsHtml =
    config.includeHtmlEvidence ||
    (scenario.name !== "client-navigation" && scenario.route.snapshot);
  if (!needsHtml) return { evidence, html: null };
  const maxBytes = 256 * 1024;
  if (evidence.byteLength === null) {
    evidence.captureNote =
      "Response size is unknown (possibly streaming); body capture was skipped.";
    return { evidence, html: null };
  }
  if (evidence.byteLength > maxBytes) {
    evidence.captureNote = `Response exceeds the ${maxBytes}-byte evidence limit.`;
    return { evidence, html: null };
  }
  let timer;
  const timeoutMs = Math.min(config.timeout ?? 10000, 2000);
  const body = await Promise.race([
    response.body(),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
  if (!body) {
    evidence.captureNote = `Document body was not complete within ${timeoutMs}ms.`;
    return { evidence, html: null };
  }
  const html = body.toString("utf8");
  evidence.byteLength = body.byteLength;
  evidence.sha256 = createHash("sha256").update(body).digest("hex");
  evidence.complete = true;
  if (config.includeHtmlEvidence) evidence.html = redactSensitiveText(html);
  return { evidence, html };
}
