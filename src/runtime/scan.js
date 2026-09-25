import { withBrowser, runPage } from "../browser/engine.js";

export async function scan(config, overrides = {}) {
  const effective = { ...config, ...overrides };
  const base = new URL(effective.baseUrl);
  const results = await withBrowser(effective, async (browser) => {
    const collected = [];
    for (const route of effective.routes) {
      const target = new URL(route.path, base).href;
      collected.push(
        await runPage(browser, target, effective, { name: "direct", route }),
      );
      collected.push(
        await runPage(browser, target, effective, { name: "refresh", route }),
      );
      if (
        effective.navigation &&
        target === new URL(effective.navigation.to, base).href
      ) {
        const entryRoute = { path: effective.navigation.from };
        const entryUrl = new URL(entryRoute.path, base).href;
        collected.push(
          await runPage(browser, entryUrl, effective, {
            name: "client-navigation",
            route,
            targetUrl: target,
          }),
        );
      }
    }
    return collected;
  });
  return {
    schemaVersion: 1,
    runId: `hd-${Date.now().toString(36)}`,
    browser: effective.browser,
    baseUrl: effective.baseUrl,
    status: results.every((result) => result.passed) ? "passed" : "failed",
    results,
  };
}
