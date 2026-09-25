import { chromium, firefox, webkit } from "playwright";

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
  const context = await browser.newContext({ viewport: config.viewport });
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
      events.console.push({ type: "error", text: message.text() });
  });
  page.on("pageerror", (error) => events.pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    events.failedRequests.push({
      url: request.url(),
      reason: request.failure()?.errorText ?? "unknown",
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
          from: response.url(),
          status: response.status(),
          location: response.headers().location ?? null,
        });
    }
    events.responses.push({ url: response.url(), status: response.status() });
  });
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: config.timeout,
    });
    if (!response) throw new Error(`No document response received for ${url}`);
    if (scenario.name !== "client-navigation")
      await assertExpected(page, scenario.route, config.timeout);
    const result = {
      scenario: scenario.name,
      url: page.url(),
      status: response.status(),
      passed: response.status() < 400,
      findings: [],
      events,
    };
    if (response.status() >= 400)
      result.findings.push(`Document returned HTTP ${response.status()}.`);
    if (scenario.name === "refresh") {
      events.documentNavigations = 0;
      const refresh = await page.reload({
        waitUntil: "domcontentloaded",
        timeout: config.timeout,
      });
      await assertExpected(page, scenario.route, config.timeout);
      result.url = page.url();
      result.status = refresh?.status() ?? result.status;
      if (!refresh || refresh.status() >= 400)
        result.findings.push(
          `Refresh returned HTTP ${refresh?.status() ?? "no response"}.`,
        );
    }
    if (scenario.name === "client-navigation") {
      const before = events.documentNavigations;
      await page
        .locator(config.navigation.click)
        .click({ timeout: config.timeout });
      await page.waitForURL(
        (candidate) =>
          candidate.pathname === new URL(scenario.targetUrl).pathname,
        { timeout: config.timeout },
      );
      if (events.documentNavigations !== before)
        result.findings.push(
          "Navigation used a new document request; expected client-side navigation.",
        );
      await assertExpected(page, scenario.route, config.timeout);
      result.url = page.url();
    }
    result.passed &&=
      result.findings.length === 0 && events.pageErrors.length === 0;
    if (events.pageErrors.length)
      result.findings.push(
        `${events.pageErrors.length} uncaught page error(s).`,
      );
    return result;
  } catch (error) {
    return {
      scenario: scenario.name,
      url: page.url(),
      passed: false,
      findings: [error.message],
      events,
    };
  } finally {
    await context.close();
  }
}

async function assertExpected(page, route, timeout) {
  if (route.expectedSelector)
    await page
      .locator(route.expectedSelector)
      .first()
      .waitFor({ state: "visible", timeout });
  if (route.expectedText) {
    const found = await page
      .getByText(route.expectedText, { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    if (!found)
      throw new Error(
        `Expected visible text was not found: ${route.expectedText}`,
      );
  }
}
