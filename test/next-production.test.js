import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../src/runtime/scan.js";
import { withBrowser } from "../src/browser/engine.js";
import { validateConfig } from "../src/config/index.js";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const fixtureDirectory = path.join(
  repository,
  "fixtures",
  "next-router-production",
);
const nextBin = path.join(
  repository,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

test(
  "production Next.js App and Pages routers pass direct-load and refresh scans",
  { timeout: 300_000 },
  async (t) => {
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
    await runCommand([nextBin, "build"], fixtureDirectory, env, 240_000);

    const port = await getAvailablePort();
    const server = spawn(
      process.execPath,
      [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)],
      {
        cwd: fixtureDirectory,
        detached: process.platform !== "win32",
        env,
        stdio: "ignore",
      },
    );
    t.after(() => stopProcess(server));
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForRoute(server, `${baseUrl}/app-router`);

    const streamingPage = await withBrowser(
      validateConfig({
        baseUrl,
        browser: "chromium",
        timeout: 10_000,
        routes: ["/streaming"],
      }),
      async (browser) => {
        const page = await browser.newPage();
        await page.goto(`${baseUrl}/streaming`, {
          waitUntil: "commit",
          timeout: 10_000,
        });
        const fallback = page.getByRole("status");
        await fallback.waitFor({ state: "visible", timeout: 5000 });
        const fallbackVisible = await fallback.isVisible();
        const readyContentBeforeStream = await page
          .getByText("Streamed account dashboard ready", { exact: true })
          .isVisible()
          .catch(() => false);
        await page
          .getByText("Streamed account dashboard ready", { exact: true })
          .waitFor({ state: "visible", timeout: 5000 });
        await page.close();
        return { fallbackVisible, readyContentBeforeStream };
      },
    );
    assert.deepEqual(streamingPage, {
      fallbackVisible: true,
      readyContentBeforeStream: false,
    });

    const delayedClientPage = await withBrowser(
      validateConfig({
        baseUrl,
        browser: "chromium",
        timeout: 10_000,
        routes: ["/delayed-client"],
      }),
      async (browser) => {
        const page = await browser.newPage();
        await page.goto(`${baseUrl}/delayed-client`, {
          waitUntil: "commit",
          timeout: 10_000,
        });
        const fallback = page.getByRole("status");
        await fallback.waitFor({ state: "visible", timeout: 5000 });
        const fallbackVisible = await fallback.isVisible();
        const readyBeforeImport = await page
          .locator("#delayed-client-ready")
          .isVisible()
          .catch(() => false);
        await page
          .locator("#delayed-client-ready")
          .waitFor({ state: "visible", timeout: 5000 });
        await page.close();
        return { fallbackVisible, readyBeforeImport };
      },
    );
    assert.deepEqual(delayedClientPage, {
      fallbackVisible: true,
      readyBeforeImport: false,
    });

    const report = await scan({
      baseUrl,
      browser: "chromium",
      timeout: 30_000,
      routes: [
        {
          path: "/app-router",
          expectedSelector: "main",
          expectedText: "Next App Router production fixture",
        },
        {
          path: "/pages-router",
          expectedSelector: "main",
          expectedText: "Next Pages Router production fixture",
        },
        {
          path: "/streaming",
          expectedSelector: "main",
          expectedText: "Streamed account dashboard ready",
          readySelector: "main",
        },
        {
          path: "/delayed-client",
          expectedSelector: "#delayed-client-ready",
          expectedText: "Delayed client module ready",
          readySelector: "#delayed-client-ready",
        },
      ],
    });
    assert.equal(report.status, "passed");
    assert.deepEqual(
      report.results.map((result) => [result.scenario, result.passed]),
      [
        ["direct", true],
        ["refresh", true],
        ["direct", true],
        ["refresh", true],
        ["direct", true],
        ["refresh", true],
        ["direct", true],
        ["refresh", true],
      ],
    );

    const clientNavigation = await scan({
      baseUrl,
      browser: "chromium",
      timeout: 15_000,
      navigation: {
        from: "/app-router",
        click: 'a[href="/app-router-destination"]',
        to: "/app-router-destination",
      },
      routes: [
        {
          path: "/app-router-destination",
          expectedSelector: "main",
          expectedText: "Next App Router client destination ready",
          readySelector: "main",
        },
      ],
    });
    assert.equal(clientNavigation.status, "passed");
    const navigationResult = clientNavigation.results[2];
    assert.equal(navigationResult.scenario, "client-navigation");
    assert.equal(navigationResult.passed, true);
    assert.match(navigationResult.url, /app-router-destination$/);
    assert.doesNotMatch(
      navigationResult.findings.join(" "),
      /Navigation used a new document request/,
    );
    assert.deepEqual(navigationResult.events.history, {
      back: true,
      forward: true,
    });

    const pagesClientNavigation = await scan({
      baseUrl,
      browser: "chromium",
      timeout: 15_000,
      navigation: {
        from: "/pages-router",
        click: 'a[href="/pages-router-destination"]',
        to: "/pages-router-destination",
      },
      routes: [
        {
          path: "/pages-router-destination",
          expectedSelector: "main",
          expectedText: "Next Pages Router destination ready",
          readySelector: "main",
        },
      ],
    });
    assert.equal(pagesClientNavigation.status, "passed");
    const pagesNavigationResult = pagesClientNavigation.results[2];
    assert.equal(pagesNavigationResult.scenario, "client-navigation");
    assert.equal(pagesNavigationResult.passed, true);
    assert.match(pagesNavigationResult.url, /pages-router-destination$/);
    assert.doesNotMatch(
      pagesNavigationResult.findings.join(" "),
      /Navigation used a new document request/,
    );
    assert.deepEqual(pagesNavigationResult.events.history, {
      back: true,
      forward: true,
    });

    const failedTransitionExpectation = await scan({
      baseUrl,
      browser: "chromium",
      timeout: 1000,
      navigation: {
        from: "/app-router",
        click: 'a[href="/app-router-destination"]',
        to: "/app-router-destination",
      },
      routes: [
        {
          path: "/app-router-destination",
          expectedText: "Destination content that never appears",
        },
      ],
    });
    assert.equal(failedTransitionExpectation.status, "failed");
    assert.equal(failedTransitionExpectation.results[2].passed, false);
    assert.doesNotMatch(
      JSON.stringify(failedTransitionExpectation.results[2].diagnostics),
      /confirmed-hydration/,
    );

    const missingDelayedClient = await scan({
      baseUrl,
      browser: "chromium",
      timeout: 1000,
      routes: [
        {
          path: "/delayed-client-missing",
          expectedSelector: "#delayed-client-ready",
        },
      ],
    });
    assert.equal(missingDelayedClient.status, "failed");
    assert.equal(missingDelayedClient.results[0].passed, false);
    assert.equal(
      missingDelayedClient.results[0].diagnostics[0].category,
      "missing-expected-ui",
    );
    assert.doesNotMatch(
      JSON.stringify(missingDelayedClient.results[0].diagnostics),
      /confirmed-hydration/,
    );

    const boundedStart = Date.now();
    const incomplete = await scan({
      baseUrl,
      browser: "chromium",
      timeout: 1000,
      routes: [
        {
          path: "/streaming",
          expectedText: "Text that never streams",
        },
      ],
    });
    assert.equal(incomplete.status, "failed");
    assert.ok(Date.now() - boundedStart < 8000);
    assert.equal(incomplete.results[0].passed, false);
    assert.equal(
      incomplete.results[0].diagnostics[0].category,
      "missing-expected-ui",
    );
    assert.doesNotMatch(
      JSON.stringify(incomplete.results[0].diagnostics),
      /confirmed-hydration/,
    );
  },
);

async function runCommand(command, cwd, env, timeout) {
  const child = spawn(process.execPath, command, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      output = `${output}${chunk}`.slice(-8000);
    });
  }
  const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
  try {
    const [code, signal] = await once(child, "exit");
    assert.equal(
      code,
      0,
      `Command ${command.slice(1).join(" ")} failed (${signal ?? code}).\n${output}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function getAvailablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function waitForRoute(server, url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(
        `Next.js production fixture exited with code ${server.exitCode}.`,
      );
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (
        response.ok &&
        (await response.text()).includes("Next App Router production fixture")
      )
        return;
    } catch {
      // Wait while the production server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    "Next.js production fixture did not become ready within 120 seconds.",
  );
}

async function stopProcess(server) {
  if (server.exitCode !== null) return;
  try {
    if (process.platform === "win32") server.kill("SIGTERM");
    else process.kill(-server.pid, "SIGTERM");
  } catch {
    return;
  }
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  if (server.exitCode === null) {
    try {
      if (process.platform === "win32") server.kill("SIGKILL");
      else process.kill(-server.pid, "SIGKILL");
    } catch {
      // The process already exited.
    }
  }
}
