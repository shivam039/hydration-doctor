import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, main } from "../src/cli/index.js";
import { validateConfig } from "../src/config/index.js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("validates and defaults a minimal config", () => {
  assert.deepEqual(
    validateConfig({ baseUrl: "http://localhost:3000", routes: ["/"] }),
    {
      baseUrl: "http://localhost:3000",
      routes: [{ path: "/" }],
      timeout: 10000,
      browser: "chromium",
      reporter: "text",
      viewport: { width: 1280, height: 800 },
      concurrency: 1,
      retries: 0,
    },
  );
});

test("rejects unsafe URLs and invalid browser names", () => {
  assert.throws(
    () => validateConfig({ baseUrl: "file:///tmp/app", routes: ["/"] }),
    /http or https/,
  );
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "https://example.test",
        routes: ["/"],
        viewport: { width: 0, height: 9000 },
      }),
    /viewport width and height/,
  );
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "https://user:pass@example.test",
        routes: ["/"],
      }),
    /credentials/,
  );
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "https://example.test",
        routes: ["/"],
        browser: "safari",
      }),
    /browser must be/,
  );
});

test("normalizes comma-separated and array reporter configuration", () => {
  const base = { baseUrl: "http://localhost", routes: ["/"] };
  assert.deepEqual(
    validateConfig({ ...base, reporter: "html,json" }).reporter,
    ["html", "json"],
  );
  assert.deepEqual(
    validateConfig({ ...base, reporter: ["html", "json"] }).reporter,
    ["html", "json"],
  );
  assert.throws(
    () => validateConfig({ ...base, reporter: "html,html" }),
    /distinct reporter/,
  );
});

test("parses CLI options and rejects missing option values", () => {
  assert.deepEqual(
    parseArgs(["scan", "--config", "config.js", "--reporter=json"]),
    {
      positional: ["scan"],
      config: "config.js",
      reporter: "json",
    },
  );
  assert.throws(() => parseArgs(["scan", "--url"]), /requires a value/);
});

test("init creates a private config and refuses to overwrite existing content", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "hydration-doctor-init-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filename = path.join(dir, "doctor.config.js");
  const logs = [];
  const io = {
    log: (message) => logs.push(message),
    error: (message) => logs.push(message),
  };
  assert.equal(await main(["init", "--config", filename], io), 0);
  const generated = await readFile(filename, "utf8");
  assert.match(generated, /baseUrl/);
  await writeFile(filename, "user content\n");
  assert.equal(await main(["init", "--config", filename], io), 2);
  assert.equal(await readFile(filename, "utf8"), "user content\n");
});

test("doctor verifies that the configured browser can launch", async () => {
  const messages = [];
  const exitCode = await main(["doctor", "--browser", "chromium"], {
    log: (message) => messages.push(message),
    error: (message) => messages.push(message),
  });
  assert.equal(exitCode, 0);
  assert.match(messages[0], /launches successfully/);
});
