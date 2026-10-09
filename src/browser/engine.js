import { chromium, devices, firefox, webkit } from "playwright";
import { createHash } from "node:crypto";
import { assertRouteExpectations } from "../comparison/assertions.js";
import {
  captureServerSnapshot,
  captureSnapshot,
  compareSnapshots,
} from "../comparison/snapshots.js";
import { captureVisualEvidence } from "../comparison/visual.js";
import { redactSensitiveText, sanitizeUrl } from "../utils/redact.js";
import {
  classifyRuntimeEvents,
  classifyScenarioFindings,
  hasConfirmedHydrationWarning,
} from "../diagnostics/classify.js";

const browserTypes = { chromium, firefox, webkit };

export async function withBrowser(config, callback, signal) {
  throwIfAborted(signal);
  const browserType = browserTypes[config.browser];
  let browser;
  try {
    browser = await browserType.launch({ headless: true });
  } catch (error) {
    if (signal?.aborted) throw abortReason(signal);
    if (/Executable doesn't exist|browserType\.launch/i.test(error.message)) {
      throw new Error(
        `Playwright ${config.browser} is not installed. Run: npx playwright install ${config.browser}`,
      );
    }
    throw new Error(`Could not launch ${config.browser}: ${error.message}`);
  }
  try {
    throwIfAborted(signal);
    return await callback(browser);
  } finally {
    try {
      await browser.close();
    } catch (error) {
      if (!signal?.aborted) throw error;
    }
  }
}

export async function runPage(browser, url, config, scenario, signal) {
  throwIfAborted(signal);
  const deviceName = scenario.route.device ?? config.device;
  const device = deviceName ? devices[deviceName] : {};
  if (deviceName && !device)
    throw new Error(`Unknown Playwright device descriptor: ${deviceName}`);
  const context = await browser.newContext({
    ...device,
    viewport:
      scenario.route.viewport ??
      (scenario.route.device ? device.viewport : config.viewport),
    locale: config.locale,
    timezoneId: config.timezoneId,
    colorScheme: config.colorScheme,
    reducedMotion: config.reducedMotion,
    storageState: config.storageState,
    serviceWorkers: "block",
  });
  const closeContextOnAbort = () => {
    void context.close().catch(() => {});
  };
  signal?.addEventListener("abort", closeContextOnAbort, { once: true });
  if (signal?.aborted) {
    signal.removeEventListener("abort", closeContextOnAbort);
    await context.close().catch(() => {});
    throw abortReason(signal);
  }
  const allowedOrigins = new Set([
    new URL(config.baseUrl).origin,
    ...(config.allowOrigins ?? []),
  ]);
  for (const route of config.routes) {
    if (route.expectedUrl)
      allowedOrigins.add(new URL(route.expectedUrl, config.baseUrl).origin);
  }
  try {
    await context.route("**/*", async (route) => {
      const request = route.request();
      try {
        const requestUrl = new URL(request.url());
        if (
          !["http:", "https:"].includes(requestUrl.protocol) ||
          requestUrl.username ||
          requestUrl.password ||
          !allowedOrigins.has(requestUrl.origin)
        ) {
          await route.abort("blockedbyclient");
          return;
        }
      } catch {
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
  } catch (error) {
    signal?.removeEventListener("abort", closeContextOnAbort);
    await context.close().catch(() => {});
    if (signal?.aborted) throw abortReason(signal);
    throw error;
  }
  let page;
  try {
    page = await context.newPage();
  } catch (error) {
    signal?.removeEventListener("abort", closeContextOnAbort);
    await context.close().catch(() => {});
    if (signal?.aborted) throw abortReason(signal);
    throw error;
  }
  const events = {
    console: [],
    pageErrors: [],
    failedRequests: [],
    responses: [],
    documentNavigations: 0,
    redirects: [],
    dropped: {
      console: 0,
      pageErrors: 0,
      failedRequests: 0,
      responses: 0,
      redirects: 0,
    },
  };
  page.on("console", (message) => {
    if (message.type() === "error")
      pushEvent(events, "console", {
        type: "error",
        text: boundedText(redactSensitiveText(message.text())),
      });
  });
  page.on("pageerror", (error) =>
    pushEvent(
      events,
      "pageErrors",
      boundedText(redactSensitiveText(error.message)),
    ),
  );
  page.on("requestfailed", (request) =>
    pushEvent(events, "failedRequests", {
      url: boundedText(sanitizeUrl(request.url())),
      reason: boundedText(
        redactSensitiveText(request.failure()?.errorText ?? "unknown"),
      ),
    }),
  );
  page.on("response", (response) => {
    if (
      response.request().isNavigationRequest() &&
      response.request().resourceType() === "document"
    ) {
      events.documentNavigations += 1;
      if (response.status() >= 300 && response.status() < 400)
        pushEvent(events, "redirects", {
          from: boundedText(sanitizeUrl(response.url())),
          status: response.status(),
          location: sanitizeRedirectLocation(
            response.headers().location,
            response.url(),
          ),
        });
    }
    pushEvent(events, "responses", {
      url: boundedText(sanitizeUrl(response.url())),
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
    let interactionEvidence = [];
    if (scenario.name === "direct")
      interactionEvidence = await runConfiguredInteractions(
        page,
        scenario.route,
        config.baseUrl,
        config.timeout,
      );
    if (scenario.name === "direct")
      await assertRouteExpectations(page, scenario.route, config.timeout);
    const result = {
      scenario: scenario.name,
      route: redactSensitiveText(scenario.route.path),
      url: sanitizeUrl(page?.url() ?? url),
      status: response.status(),
      passed: false,
      findings: [],
      diagnostics: [],
      events,
      documentEvidence: documentCapture.evidence,
      interactions: interactionEvidence,
    };
    result.reproduction = buildReproduction(scenario, result.url);
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
      result.interactions = await runConfiguredInteractions(
        page,
        scenario.route,
        config.baseUrl,
        config.timeout,
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
      result.interactions = await runConfiguredInteractions(
        page,
        scenario.route,
        config.baseUrl,
        config.timeout,
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
    if (scenario.name !== "client-navigation" && scenario.route.visual) {
      result.visualScreenshot = await captureVisualEvidence(
        page,
        scenario.route.visual,
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
              reproduction: result.reproduction,
            });
            result.findings.push(
              "Configured SSR and client DOM snapshots differ; see evidence. This does not alone prove a hydration error.",
            );
          }
        }
      }
    }
    result.diagnostics.push(
      ...classifyRuntimeEvents(events, result.reproduction),
      ...classifyScenarioFindings(result.findings, result.reproduction),
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
    if (signal?.aborted) throw abortReason(signal);
    return {
      scenario: scenario.name,
      route: redactSensitiveText(scenario.route.path),
      url: sanitizeUrl(page.url()),
      passed: false,
      findings: [redactSensitiveText(error.message)],
      diagnostics: classifyScenarioFindings(
        [redactSensitiveText(error.message)],
        buildReproduction(scenario, sanitizeUrl(page.url())),
      ),
      reproduction: buildReproduction(scenario, sanitizeUrl(page.url())),
      events,
    };
  } finally {
    signal?.removeEventListener("abort", closeContextOnAbort);
    if (signal?.aborted) await context.close().catch(() => {});
    else await context.close();
  }
}

function abortReason(signal) {
  return signal.reason ?? new Error("Scan cancelled.");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortReason(signal);
}

function buildReproduction(scenario, url) {
  const steps =
    scenario.name === "refresh"
      ? ["Open this route directly, then reload it in the browser."]
      : scenario.name === "client-navigation"
        ? [
            "Open the configured navigation entry route.",
            "Activate its configured navigation control and follow the target route.",
          ]
        : ["Open this route directly in the configured browser."];
  return {
    scenario: scenario.name,
    route: redactSensitiveText(scenario.route.path),
    url,
    steps,
  };
}

async function runConfiguredInteractions(page, route, baseUrl, timeout) {
  const evidence = [];
  for (const [index, interaction] of (route.interactions ?? []).entries()) {
    try {
      if (interaction.checkpoint === "ready") {
        await page
          .locator(route.readySelector)
          .first()
          .waitFor({ state: "visible", timeout });
      }
      const locator = page.locator(interaction.selector).first();
      if (interaction.type === "click") {
        await locator.click({ timeout });
      } else if (interaction.type === "fill") {
        await locator.fill(interaction.value, { timeout });
      } else if (interaction.type === "press") {
        await locator.press(interaction.key, { timeout });
      } else if (interaction.type === "select") {
        await locator.selectOption(interaction.value, { timeout });
      } else if (interaction.type === "check") {
        await locator.check({ timeout });
      } else if (interaction.type === "uncheck") {
        await locator.uncheck({ timeout });
      } else {
        const submitted = await locator.evaluate((element) => {
          const form =
            element instanceof HTMLFormElement ? element : element.form;
          if (!form) return false;
          form.requestSubmit();
          return true;
        });
        if (!submitted) throw new Error("No form");
      }
      if (interaction.expect?.selector || interaction.expect?.text) {
        await assertRouteExpectations(
          page,
          {
            expectedSelector: interaction.expect.selector,
            expectedText: interaction.expect.text,
          },
          timeout,
        );
      }
      if (
        interaction.expect?.value !== undefined ||
        interaction.expect?.checked !== undefined
      ) {
        if (route.readySelector) {
          await page
            .locator(route.readySelector)
            .first()
            .waitFor({ state: "visible", timeout });
        }
        await page.waitForFunction(
          ({ selector, value, checked }) => {
            const element = document.querySelector(selector);
            if (checked !== undefined)
              return (
                element instanceof HTMLInputElement &&
                element.checked === checked
              );
            return (
              (element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement) &&
              element.value === value
            );
          },
          {
            selector: interaction.selector,
            value: interaction.expect.value,
            checked: interaction.expect.checked,
          },
          { timeout },
        );
      }
      if (interaction.expect?.url) {
        const expectedUrl = new URL(interaction.expect.url, baseUrl).href;
        await page.waitForURL((candidate) => candidate.href === expectedUrl, {
          timeout,
        });
      }
      evidence.push({ index: index + 1, type: interaction.type, passed: true });
    } catch {
      throw new Error(
        `Configured ${interaction.type} interaction step ${index + 1} failed or its expected result was not observed.`,
      );
    }
  }
  return evidence;
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
    result.findings.push(
      `Browser back navigation failed: ${redactSensitiveText(error.message)}`,
    );
    return history;
  }
  try {
    await page.goForward({
      waitUntil: "domcontentloaded",
      timeout: config.timeout,
    });
    await page.waitForURL(targetUrl, { timeout: config.timeout });
    await runConfiguredInteractions(
      page,
      scenario.route,
      config.baseUrl,
      config.timeout,
    );
    await assertRouteExpectations(page, scenario.route, config.timeout);
    history.forward = true;
  } catch (error) {
    result.findings.push(
      `Browser forward navigation failed: ${redactSensitiveText(error.message)}`,
    );
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
  const contentEncoding = headers["content-encoding"]?.trim().toLowerCase();
  if (contentEncoding && contentEncoding !== "identity") {
    evidence.captureNote =
      "Compressed document bodies are not copied into evidence because decoded size cannot be bounded safely.";
    return { evidence, html: null };
  }
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
  if (body.byteLength > maxBytes) {
    evidence.byteLength = body.byteLength;
    evidence.captureNote = `Actual response body exceeds the ${maxBytes}-byte evidence limit.`;
    return { evidence, html: null };
  }
  const html = body.toString("utf8");
  evidence.byteLength = body.byteLength;
  evidence.sha256 = createHash("sha256").update(body).digest("hex");
  evidence.complete = true;
  if (config.includeHtmlEvidence) evidence.html = redactSensitiveText(html);
  return { evidence, html };
}

const EVENT_LIMIT = 50;
const EVENT_TEXT_LIMIT = 1024;

function pushEvent(events, name, value) {
  if (events[name].length < EVENT_LIMIT) events[name].push(value);
  else events.dropped[name] += 1;
}

function boundedText(value) {
  const text = String(value);
  return text.length <= EVENT_TEXT_LIMIT
    ? text
    : `${text.slice(0, EVENT_TEXT_LIMIT)}… [truncated]`;
}

function sanitizeRedirectLocation(location, responseUrl) {
  if (!location) return null;
  try {
    return boundedText(sanitizeUrl(new URL(location, responseUrl).href));
  } catch {
    return "[invalid redirect location]";
  }
}
