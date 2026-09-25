import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/cli/index.js";
import { validateConfig } from "../src/config/index.js";

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
