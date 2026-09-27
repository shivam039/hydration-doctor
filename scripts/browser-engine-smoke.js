import assert from "node:assert/strict";
import { scan } from "../src/runtime/scan.js";
import { startNavigationFixture } from "../fixtures/navigation-app.js";

const supportedBrowsers = ["chromium", "firefox", "webkit"];
const browser = process.argv[2];
if (!supportedBrowsers.includes(browser)) {
  throw new Error(
    `Choose one browser engine: ${supportedBrowsers.join(", ")}.`,
  );
}

const { server, baseUrl } = await startNavigationFixture();
try {
  const report = await scan({
    baseUrl,
    browser,
    timeout: 10000,
    concurrency: 2,
    routes: [
      { path: "/", expectedSelector: "main" },
      { path: "/broken", expectedSelector: "aside" },
    ],
  });
  assert.equal(report.results.length, 4);
  assert.equal(
    report.results[0].passed,
    true,
    "healthy direct load should pass",
  );
  assert.equal(report.results[1].passed, true, "healthy refresh should pass");
  assert.equal(
    report.results[2].passed,
    false,
    "missing UI direct load should fail",
  );
  assert.equal(
    report.results[3].passed,
    false,
    "missing UI refresh should fail",
  );
  for (const result of report.results.slice(2)) {
    assert.ok(
      result.diagnostics.some(
        (diagnostic) => diagnostic.category === "missing-expected-ui",
      ),
      `${browser} should classify the missing selector as missing UI`,
    );
  }
  assert.equal(report.status, "failed");
  console.log(`${browser} healthy and missing-UI smoke checks passed.`);
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
