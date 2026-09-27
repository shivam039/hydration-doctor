import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../src/runtime/scan.js";

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
      ],
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
