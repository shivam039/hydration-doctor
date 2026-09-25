import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scan } from "../src/runtime/scan.js";
import { startNavigationFixture } from "../fixtures/navigation-app.js";
import { main } from "../src/cli/index.js";

test("checks direct navigation and refresh and detects missing expected UI", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    concurrency: 2,
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
  assert.deepEqual(report.results[4].events.history, {
    back: true,
    forward: true,
  });
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

test("accepts configured redirect URLs and preserves query and hash", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/expected-redirect",
        expectedSelector: "main",
        expectedUrl: "/client?tab=active#content",
      },
    ],
  });
  assert.equal(report.status, "passed");
  assert.equal(report.results[0].url, `${baseUrl}/client?tab=active#content`);
  assert.equal(report.results[0].events.redirects[0].status, 302);
});

test("reports an unexpected redirect as a navigation inconsistency", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [{ path: "/unexpected-redirect", expectedSelector: "main" }],
  });
  assert.equal(report.status, "failed");
  assert.match(report.results[0].findings[0], /Unexpected redirect/);
});

test("keeps an intermittent failure failed after a successful retry", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    retries: 1,
    routes: [{ path: "/flaky", expectedSelector: "main" }],
  });
  assert.equal(report.results[0].attempts.length, 2);
  assert.equal(report.results[0].attempts[0].passed, false);
  assert.equal(report.results[0].attempts[1].passed, true);
  assert.equal(report.results[0].passed, false);
  assert.match(report.results[0].findings.at(-1), /varied between attempts/);
});

test("classifies a real React hydration mismatch and keeps generic errors separate", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/react-healthy",
        expectedSelector: "#root",
        readySelector: 'html[data-hydrated="true"]',
        snapshot: { selector: "#root", compareText: true },
      },
      {
        path: "/hydration-warning",
        expectedSelector: "#root",
        readySelector: 'html[data-hydrated="true"]',
        snapshot: { selector: "#root", compareText: true },
      },
      { path: "/generic-console-error", expectedSelector: "main" },
    ],
  });
  const healthyReactResult = report.results[0];
  assert.equal(healthyReactResult.passed, true);
  assert.deepEqual(healthyReactResult.diagnostics, []);
  assert.equal(healthyReactResult.documentEvidence.complete, true);
  assert.match(healthyReactResult.documentEvidence.sha256, /^[a-f0-9]{64}$/);
  assert.equal(healthyReactResult.documentEvidence.html, undefined);
  const hydrationResult = report.results[2];
  assert.equal(hydrationResult.passed, false);
  const hydrationDiagnostic = hydrationResult.diagnostics.find(
    (diagnostic) => diagnostic.category === "confirmed-hydration-warning",
  );
  assert.ok(hydrationDiagnostic);
  assert.equal(hydrationResult.ssrClientDifferences[0].kind, "text");
  assert.match(hydrationDiagnostic.evidence, /Text content did not match/);
  const genericResult = report.results[4];
  assert.equal(genericResult.passed, false);
  assert.equal(genericResult.diagnostics[0].category, "browser-console-error");
});

test("compares configured DOM checkpoints without treating ignored dynamic regions as failures", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/varying-render",
        expectedSelector: "main",
        snapshot: { selector: "main", compareText: true },
      },
      {
        path: "/dynamic-render",
        expectedSelector: "main",
        snapshot: {
          selector: "main",
          compareText: true,
          ignoreSelectors: ["[data-volatile]"],
        },
      },
    ],
  });
  assert.equal(report.results[0].passed, false);
  assert.equal(
    report.results[0].diagnostics.at(-1).category,
    "navigation-dependent-rendering-inconsistency",
  );
  assert.equal(report.results[2].passed, true);
  assert.deepEqual(report.results[2].diagnostics, []);
});

test("scan CLI applies reporter overrides and returns the verified-failure exit code", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const dir = await mkdtemp(path.join(tmpdir(), "hydration-doctor-cli-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const configPath = path.join(dir, "doctor.config.js");
  await writeFile(
    configPath,
    `export default { baseUrl: ${JSON.stringify(baseUrl)}, routes: [{ path: "/broken", expectedSelector: "main" }], reporter: "text" };`,
  );
  const output = [];
  const code = await main(
    ["scan", "--config", configPath, "--reporter", "json", "--timeout", "2000"],
    {
      log: (message) => output.push(message),
      error: (message) => output.push(message),
    },
  );
  assert.equal(code, 1);
  assert.equal(JSON.parse(output[0]).status, "failed");
});

test("scan CLI writes HTML and multiple self-contained reports without overwriting", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const dir = await mkdtemp(path.join(tmpdir(), "hydration-doctor-report-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const configPath = path.join(dir, "doctor.config.js");
  const htmlPath = path.join(dir, "report.html");
  const outputDir = path.join(dir, "all");
  await writeFile(
    configPath,
    `export default { baseUrl: ${JSON.stringify(baseUrl)}, routes: ["/"], reporter: "text" };`,
  );
  const io = {
    log() {},
    error(message) {
      throw new Error(message);
    },
  };
  assert.equal(
    await main(
      [
        "scan",
        "--config",
        configPath,
        "--reporter",
        "html",
        "--output",
        htmlPath,
      ],
      io,
    ),
    0,
  );
  assert.match(
    await readFile(htmlPath, "utf8"),
    /<title>Hydration Doctor report: passed<\/title>/,
  );
  assert.equal(
    await main(
      [
        "scan",
        "--config",
        configPath,
        "--reporter=html,json",
        "--output",
        outputDir,
      ],
      io,
    ),
    0,
  );
  const names = await readdir(outputDir);
  assert.equal(names.length, 2);
  assert.ok(names.some((name) => name.endsWith(".html")));
  assert.ok(names.some((name) => name.endsWith(".json")));
  await assert.rejects(
    readFile(htmlPath).then(() =>
      main(
        [
          "scan",
          "--config",
          configPath,
          "--reporter",
          "html",
          "--output",
          htmlPath,
        ],
        io,
      ),
    ),
    /EEXIST/,
  );
});

test("HTML evidence is opt-in, size-bounded, and redacted", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    includeHtmlEvidence: true,
    routes: [{ path: "/sensitive-evidence" }],
  });
  assert.equal(report.results[0].documentEvidence.complete, true);
  assert.match(report.results[0].documentEvidence.html, /\[REDACTED\]/);
  assert.doesNotMatch(report.results[0].documentEvidence.html, /private-value/);
});
