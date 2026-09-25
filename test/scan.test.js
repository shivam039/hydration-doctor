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
      { path: "/refresh-only", expectedSelector: "main" },
    ],
    navigation: { from: "/", click: 'a[href="/client"]', to: "/client" },
  });
  assert.equal(report.results.length, 9);
  assert.equal(report.results[0].scenario, "direct");
  assert.equal(report.results[1].scenario, "refresh");
  assert.equal(report.results[4].scenario, "client-navigation");
  assert.equal(report.results[4].passed, true);
  assert.equal(report.status, "failed");
  assert.match(report.results[5].findings[0], /aside/);
  assert.equal(report.results[7].passed, true);
  assert.equal(report.results[8].passed, false);
  assert.match(report.results[8].findings[0], /main/);
});

test("fails client-navigation scenario when a click loads a new document", async (t) => {
  const { server, baseUrl } = await startNavigationFixture({
    clientMode: "full-document",
  });
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/client",
        expectedSelector: "main",
        expectedText: "Client view",
      },
    ],
    navigation: { from: "/", click: 'a[href="/client"]', to: "/client" },
  });
  assert.equal(report.results[2].scenario, "client-navigation");
  assert.equal(report.results[2].passed, false);
  assert.match(report.results[2].findings[0], /new document request/);
});
