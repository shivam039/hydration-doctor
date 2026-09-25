import test from "node:test";
import assert from "node:assert/strict";
import { scan } from "../src/runtime/scan.js";
import { startNavigationFixture } from "../fixtures/navigation-app.js";

test("checks direct navigation and refresh and detects missing expected UI", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      { path: "/", expectedSelector: "main" },
      {
        path: "/client",
        expectedSelector: "main",
        expectedText: "Client view",
      },
      { path: "/broken", expectedSelector: "aside" },
    ],
    navigation: { from: "/", click: 'a[href="/client"]', to: "/client" },
  });
  assert.equal(report.results.length, 7);
  assert.equal(report.results[0].scenario, "direct");
  assert.equal(report.results[1].scenario, "refresh");
  assert.equal(report.results[4].scenario, "client-navigation");
  assert.equal(report.results[4].passed, true);
  assert.equal(report.status, "failed");
  assert.match(report.results[5].findings[0], /aside/);
});
