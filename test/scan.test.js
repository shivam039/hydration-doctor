import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scan } from "../src/runtime/scan.js";
import { startNavigationFixture } from "../fixtures/navigation-app.js";
import { main } from "../src/cli/index.js";
import { formatHtmlReport } from "../src/reporters/html.js";
import { createServer } from "node:http";
import { once } from "node:events";

function trackAbortListeners(signal) {
  const counts = { added: 0, removed: 0 };
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  signal.addEventListener = (type, ...args) => {
    if (type === "abort") counts.added += 1;
    return add(type, ...args);
  };
  signal.removeEventListener = (type, ...args) => {
    if (type === "abort") counts.removed += 1;
    return remove(type, ...args);
  };
  return counts;
}

test("rejects an already-aborted scan with the caller's exact reason", async () => {
  const controller = new AbortController();
  const reason = new Error("caller cancelled scan");
  controller.abort(reason);
  await assert.rejects(
    scan(
      { baseUrl: "http://localhost", routes: ["/"] },
      { signal: controller.signal },
    ),
    (error) => error === reason,
  );
});

test("aborting during concurrent readiness waits rejects promptly and cleans up", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const controller = new AbortController();
  const listeners = trackAbortListeners(controller.signal);
  const reason = new Error("stop this scan");
  const startedAt = Date.now();
  const scanPromise = scan(
    {
      baseUrl,
      browser: "chromium",
      timeout: 60000,
      concurrency: 2,
      routes: [
        { path: "/", expectedSelector: "#never-appears" },
        { path: "/client", expectedSelector: "#also-never-appears" },
      ],
    },
    { signal: controller.signal },
  );
  const timer = setTimeout(() => controller.abort(reason), 300);
  try {
    await assert.rejects(scanPromise, (error) => error === reason);
    assert.ok(Date.now() - startedAt < 5000, "abort should stop the 60s waits");
    assert.ok(listeners.added > 0);
    assert.equal(listeners.removed, listeners.added);
  } finally {
    clearTimeout(timer);
  }
});

test("removes AbortSignal listeners after a successful scan", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const controller = new AbortController();
  const listeners = trackAbortListeners(controller.signal);
  const report = await scan(
    { baseUrl, browser: "chromium", routes: ["/"] },
    { signal: controller.signal },
  );
  assert.equal(report.status, "passed");
  assert.ok(listeners.added > 0);
  assert.equal(listeners.removed, listeners.added);
});

test("rejects values that are not AbortSignal instances", async () => {
  await assert.rejects(
    scan({ baseUrl: "http://localhost", routes: ["/"] }, { signal: {} }),
    /overrides.signal must be an AbortSignal/,
  );
});

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
  assert.match(
    report.results[5].findings[0],
    /configured expected UI selector/,
  );
  assert.equal(report.results[7].passed, true);
  assert.equal(report.results[8].passed, false);
  assert.match(
    report.results[8].findings[0],
    /configured expected UI selector/,
  );
});

test("reports storage restoration regression as observed missing UI", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 1000,
    routes: [
      { path: "/state-restoration", expectedText: "Preference restored" },
      {
        path: "/state-restoration-broken",
        expectedText: "Preference restored",
      },
    ],
  });
  assert.equal(report.results[0].passed, true);
  assert.equal(report.results[1].passed, true);
  assert.equal(report.results[2].passed, true);
  assert.equal(report.results[3].passed, false);
  assert.equal(
    report.results[3].diagnostics[0].category,
    "missing-expected-ui",
  );
  assert.equal(report.results[3].diagnostics[0].confidence, "observed");
  assert.doesNotMatch(
    JSON.stringify(report),
    /blue|localStorage|sessionStorage/,
  );
  assert.doesNotMatch(JSON.stringify(report), /confirmed-hydration/);
});

test("detects clicks before hydration and passes when gated on readiness", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 500,
    routes: [
      {
        path: "/hydration-button-broken",
        interactions: [
          { type: "click", selector: "#save", expect: { text: "Saved" } },
        ],
      },
    ],
  });
  assert.equal(report.results[0].passed, false);
  assert.match(report.results[0].findings[0], /interaction step 1 failed/);
  assert.doesNotMatch(JSON.stringify(report), /#save/);
});

test("detects pre-hydration input reset and passes readiness-gated fill without exposing values", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const secretValue = "private-fixture-input";
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 1000,
    concurrency: 1,
    routes: [
      {
        path: "/hydration-input-reset",
        readySelector: 'html[data-hydrated="true"]',
        interactions: [
          {
            type: "fill",
            selector: "#profile",
            value: secretValue,
            expect: { value: secretValue },
          },
        ],
      },
      {
        path: "/hydration-input-gated",
        readySelector: 'html[data-hydrated="true"]',
        interactions: [
          {
            type: "fill",
            selector: "#profile",
            checkpoint: "ready",
            value: secretValue,
            expect: { value: secretValue },
          },
        ],
      },
    ],
  });
  assert.equal(report.results[0].passed, false);
  assert.equal(
    report.results[0].diagnostics[0].category,
    "interaction-outcome-failure",
  );
  assert.equal(report.results[2].passed, true);
  assert.equal(report.results[2].interactions[0].passed, true);
  assert.doesNotMatch(JSON.stringify(report), /private-fixture-input/);
  assert.doesNotMatch(JSON.stringify(report), /confirmed-hydration/);
});

test("waits for an explicit hydration marker before interacting", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/hydration-button-gated",
        readySelector: 'html[data-hydrated="true"]',
        interactions: [
          {
            type: "click",
            selector: "#save",
            checkpoint: "ready",
            expect: { text: "Saved" },
          },
        ],
      },
    ],
  });
  assert.equal(report.status, "passed");
  assert.deepEqual(report.results[0].interactions, [
    { index: 1, type: "click", passed: true },
  ]);
});

test("accepts explicitly expected empty data and classifies a violated data assertion", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 1000,
    routes: [
      {
        path: "/empty-data",
        expectedSelector: "#status",
        expectedText: "No records found",
      },
      {
        path: "/empty-data",
        expectedSelector: "#status",
        expectedText: "Two records",
      },
    ],
  });
  assert.equal(report.results[0].passed, true);
  assert.equal(report.results[2].passed, false);
  assert.ok(
    report.results[2].diagnostics.some(
      (diagnostic) => diagnostic.category === "missing-expected-ui",
    ),
  );
});

test("fills and submits a form without copying entered values into evidence", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/hydration-form",
        interactions: [
          {
            type: "fill",
            selector: "#name",
            value: "Ada",
            expect: { selector: "#name" },
          },
          {
            type: "submit",
            selector: "#submit",
            expect: { text: "Thank you, Ada" },
          },
        ],
      },
    ],
  });
  assert.equal(report.status, "passed");
  assert.deepEqual(report.results[0].interactions, [
    { index: 1, type: "fill", passed: true },
    { index: 2, type: "submit", passed: true },
  ]);
  assert.doesNotMatch(JSON.stringify(report), /Ada/);
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

test("blocks cross-origin subresource requests unless their origin is allowlisted", async (t) => {
  let hits = 0;
  const externalServer = createServer((request, response) => {
    hits += 1;
    response.writeHead(200, { "content-type": "text/javascript" });
    response.end("window.externalFixtureLoaded = true;");
  });
  externalServer.listen(0, "127.0.0.1");
  await once(externalServer, "listening");
  t.after(() => externalServer.close());
  const externalOrigin = `http://127.0.0.1:${externalServer.address().port}`;
  const { server, baseUrl } = await startNavigationFixture({
    externalResourceUrl: `${externalOrigin}/probe.js`,
  });
  t.after(() => server.close());
  const baseConfig = {
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [{ path: "/external-resource", expectedSelector: "main" }],
  };
  const blocked = await scan(baseConfig);
  assert.equal(hits, 0);
  assert.ok(
    blocked.results[0].events.failedRequests.some((request) =>
      request.url.startsWith(externalOrigin),
    ),
  );

  const allowed = await scan({ ...baseConfig, allowOrigins: [externalOrigin] });
  assert.ok(hits >= 2);
  assert.equal(
    allowed.results[0].events.failedRequests.some((request) =>
      request.url.startsWith(externalOrigin),
    ),
    false,
  );
});

test("caps collected browser events and reports the dropped count", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [{ path: "/console-flood", expectedSelector: "main" }],
  });
  const events = report.results[0].events;
  assert.equal(events.console.length, 50);
  assert.equal(events.dropped.console, 25);
});

test("does not copy compressed response bodies into evidence", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    includeHtmlEvidence: true,
    routes: [{ path: "/compressed-evidence", expectedSelector: "main" }],
  });
  const evidence = report.results[0].documentEvidence;
  assert.equal(evidence.complete, false);
  assert.equal(evidence.html, undefined);
  assert.match(evidence.captureNote, /Compressed document bodies/);
});

test("omits configured assertion values from failure output", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 500,
    routes: [{ path: "/client", expectedText: "private patient phrase" }],
  });
  assert.equal(report.status, "failed");
  assert.doesNotMatch(JSON.stringify(report), /private patient phrase/);
  assert.ok(
    report.results[0].diagnostics.some(
      (diagnostic) => diagnostic.category === "missing-expected-ui",
    ),
  );
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
  assert.deepEqual(hydrationDiagnostic.reproduction, {
    scenario: "direct",
    route: "/hydration-warning",
    url: `${baseUrl}/hydration-warning`,
    steps: ["Open this route directly in the configured browser."],
  });
  assert.equal(hydrationDiagnostic.confidence, "observed");
  assert.equal(hydrationDiagnostic.severity, "error");
  assert.equal(hydrationDiagnostic.file, undefined);
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
  assert.deepEqual(report.results[0].diagnostics.at(-1).reproduction.steps, [
    "Open this route directly, then reload it in the browser.",
  ]);
  assert.equal(report.results[2].passed, true);
  assert.deepEqual(report.results[2].diagnostics, []);
});

test("captures bounded screenshots and a pixel diff without calling it a hydration failure", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/missing-sidebar",
        expectedSelector: "main",
        snapshot: { selector: "main", compareText: true },
        visual: { maxDiffRatio: 0, maskSelectors: [] },
      },
      {
        path: "/masked-visual",
        expectedSelector: "main",
        visual: { maxDiffRatio: 0, maskSelectors: ["#volatile"] },
      },
    ],
  });
  const direct = report.results[0];
  const refresh = report.results[1];
  assert.equal(direct.visualScreenshot.complete, true);
  assert.equal(refresh.visualScreenshot.complete, true);
  assert.ok(direct.visualScreenshot.byteLength < 256 * 1024);
  assert.equal(direct.visualComparison.passed, false);
  assert.ok(direct.visualComparison.changedPixelRatio > 0);
  assert.ok(direct.visualDiff.data.length > 0);
  assert.ok(
    direct.diagnostics.some(
      (diagnostic) =>
        diagnostic.category === "navigation-dependent-rendering-inconsistency",
    ),
  );
  assert.ok(
    direct.diagnostics.some(
      (diagnostic) => diagnostic.category === "visual-rendering-difference",
    ),
  );
  assert.doesNotMatch(JSON.stringify(direct.diagnostics), /hydration-error/);
  const html = formatHtmlReport(report);
  assert.match(html, /data:image\/png;base64,/);
  assert.match(html, /Pixel differences highlighted in red/);
  assert.equal(report.results[2].visualComparison.changedPixelRatio, 0);
  assert.equal(report.results[2].passed, true);
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

test("scan CLI accepts a direct URL and preserves its query and fragment", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const messages = [];
  const result = await main(
    ["scan", "--url", `${baseUrl}/client?tab=profile#details`],
    {
      log: (message) => messages.push(message),
      error: (message) => messages.push(message),
    },
  );
  assert.equal(result, 0);
  assert.equal(messages.length, 1);
  assert.ok(messages[0].includes(`${baseUrl}/client?tab=profile#details`));
});

test("scan CLI writes HTML and multiple self-contained reports without overwriting", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const dir = await mkdtemp(path.join(tmpdir(), "hydration-doctor-report-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const configPath = path.join(dir, "doctor.config.js");
  const htmlPath = path.join(dir, "report.html");
  const junitPath = path.join(dir, "results.xml");
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
  assert.equal((await stat(htmlPath)).mode & 0o777, 0o600);
  assert.equal(
    await main(
      [
        "scan",
        "--config",
        configPath,
        "--reporter=junit",
        "--output",
        junitPath,
      ],
      io,
    ),
    0,
  );
  assert.match(
    await readFile(junitPath, "utf8"),
    /<testsuite name="hydration-doctor"/,
  );
  assert.equal((await stat(junitPath)).mode & 0o777, 0o600);
  assert.equal(
    await main(
      [
        "scan",
        "--config",
        configPath,
        "--reporter=html,json,junit",
        "--output",
        outputDir,
      ],
      io,
    ),
    0,
  );
  const names = await readdir(outputDir);
  assert.equal(names.length, 3);
  assert.ok(names.some((name) => name.endsWith(".html")));
  assert.ok(names.some((name) => name.endsWith(".json")));
  assert.ok(names.some((name) => name.endsWith(".xml")));
  const combinedJunitPath = path.join(
    outputDir,
    names.find((name) => name.endsWith(".xml")),
  );
  const junitXml = await readFile(combinedJunitPath, "utf8");
  assert.match(junitXml, /<testsuite name="hydration-doctor" tests="2"/);
  assert.equal((await stat(combinedJunitPath)).mode & 0o777, 0o600);
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
