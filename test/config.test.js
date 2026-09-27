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

test("validates route-level viewport bounds and known device descriptors", () => {
  const base = {
    baseUrl: "http://localhost:3000",
    routes: [
      {
        path: "/mobile",
        viewport: { width: 390, height: 844 },
        device: "iPhone SE",
      },
    ],
  };
  assert.deepEqual(validateConfig(base).routes[0], base.routes[0]);
  assert.throws(
    () =>
      validateConfig({
        ...base,
        routes: [{ path: "/small", viewport: { width: 0, height: 400 } }],
      }),
    /routes\[0\]\.viewport width and height/,
  );
  assert.throws(
    () =>
      validateConfig({
        ...base,
        routes: [{ path: "/unknown", device: "Unknown Device" }],
      }),
    /routes\[0\]\.device must name a Playwright device descriptor/,
  );
});

test("rejects duplicate routes after same-origin URL normalization without exposing targets", () => {
  const routes = [
    "/account?access_token=top-secret",
    { path: "https://EXAMPLE.test:443/account?access_token=top-secret" },
  ];
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "https://example.test:443/app",
        routes,
      }),
    (error) => {
      assert.match(error.message, /routes\[1\] duplicates routes\[0\]/);
      assert.doesNotMatch(error.message, /top-secret|access_token/);
      return true;
    },
  );
  assert.deepEqual(routes, [
    "/account?access_token=top-secret",
    { path: "https://EXAMPLE.test:443/account?access_token=top-secret" },
  ]);
});

test("canonicalizes dot segments and percent-escape case but preserves route distinctions", () => {
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "https://example.test",
        routes: ["/a/../account", { path: "/account" }],
      }),
    /routes\[1\] duplicates routes\[0\]/,
  );
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "https://example.test",
        routes: ["/asset/a%2fb", "/asset/a%2Fb"],
      }),
    /routes\[1\] duplicates routes\[0\]/,
  );
  assert.doesNotThrow(() =>
    validateConfig({
      baseUrl: "https://example.test",
      routes: [
        "/account?tab=one#top",
        "/account?tab=two#top",
        "/account?tab=one#other",
        "/account?tab=one",
        "/asset/a%2Fb",
        "/asset/a/b",
      ],
    }),
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
  assert.equal(
    validateConfig({ ...base, reporter: "junit" }).reporter,
    "junit",
  );
  assert.throws(
    () => validateConfig({ ...base, reporter: "html,html" }),
    /distinct reporter/,
  );
});

test("accepts only explicit HTTP(S) origins for cross-origin browser access", () => {
  const base = { baseUrl: "http://localhost", routes: ["/"] };
  assert.deepEqual(
    validateConfig({ ...base, allowOrigins: ["https://cdn.example.test/"] })
      .allowOrigins,
    ["https://cdn.example.test"],
  );
  assert.throws(
    () => validateConfig({ ...base, allowOrigins: ["https://cdn.test/path"] }),
    /only an origin/,
  );
  assert.throws(
    () => validateConfig({ ...base, allowOrigins: ["file:///etc/passwd"] }),
    /http or https/,
  );
});

test("rejects oversized route and snapshot configurations", () => {
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "http://localhost",
        routes: Array.from({ length: 51 }, (_, index) => `/${index}`),
      }),
    /no more than 50 entries/,
  );
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "http://localhost",
        routes: [
          {
            path: "/",
            snapshot: {
              selector: "main",
              attributes: ["a", "b", "c", "d", "e", "f"],
            },
          },
        ],
      }),
    /at most 5 attributes/,
  );
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "http://localhost",
        routes: [{ path: "/", visual: { maxDiffRatio: 1.1 } }],
      }),
    /maxDiffRatio must be from 0 to 1/,
  );
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "http://localhost",
        routes: Array.from({ length: 6 }, (_, index) => ({
          path: `/${index}`,
          visual: {},
        })),
      }),
    /At most 5 routes/,
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
  assert.equal(
    parseArgs(["scan", "--config", "config.js", "--update-baselines"])
      .updateBaselines,
    true,
  );
  assert.equal(
    parseArgs(["scan", "--config", "config.js", "--viewport", "390x844"])
      .viewport,
    "390x844",
  );
  assert.throws(() => parseArgs(["scan", "--url"]), /requires a value/);
});

test("rejects malformed and out-of-range viewport CLI overrides", async () => {
  const errors = [];
  const io = {
    log() {},
    error(value) {
      errors.push(value);
    },
  };
  assert.equal(
    await main(
      ["scan", "--url", "http://localhost", "--viewport", "mobile"],
      io,
    ),
    2,
  );
  assert.match(errors.at(-1), /WIDTHxHEIGHT/);
  assert.equal(
    await main(
      ["scan", "--url", "http://localhost", "--viewport", "9000x9000"],
      io,
    ),
    2,
  );
  assert.match(errors.at(-1), /viewport width and height/);
});

test("accepts value assertions for string-valued fill and select interactions", () => {
  const base = {
    baseUrl: "http://localhost",
    routes: [
      {
        path: "/",
        interactions: [
          {
            type: "fill",
            selector: "input",
            value: "private",
            expect: { value: "private" },
          },
        ],
      },
    ],
  };
  assert.equal(
    validateConfig(base).routes[0].interactions[0].expect.value,
    "private",
  );
  assert.throws(
    () =>
      validateConfig({
        ...base,
        routes: [
          {
            path: "/",
            interactions: [
              {
                type: "click",
                selector: "button",
                expect: { value: "private" },
              },
            ],
          },
        ],
      }),
    /supported only for fill or select/,
  );
  assert.throws(
    () =>
      validateConfig({
        ...base,
        routes: [
          {
            path: "/",
            interactions: [
              {
                type: "fill",
                selector: "input",
                value: "private",
                expect: { value: 7 },
              },
            ],
          },
        ],
      }),
    /expect.value must be a string/,
  );
  assert.equal(
    validateConfig({
      ...base,
      routes: [
        {
          path: "/",
          interactions: [
            {
              type: "select",
              selector: "#plan",
              value: "private-option",
              expect: { value: "private-option" },
            },
          ],
        },
      ],
    }).routes[0].interactions[0].type,
    "select",
  );
});

test("validates check and uncheck outcomes", () => {
  const config = validateConfig({
    baseUrl: "http://localhost",
    routes: [
      {
        path: "/",
        interactions: [
          {
            type: "check",
            selector: "#alerts",
            expect: { checked: true },
          },
          {
            type: "uncheck",
            selector: "#updates",
            expect: { checked: false },
          },
        ],
      },
    ],
  });
  assert.deepEqual(
    config.routes[0].interactions.map(({ type }) => type),
    ["check", "uncheck"],
  );
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "http://localhost",
        routes: [
          {
            path: "/",
            interactions: [
              {
                type: "click",
                selector: "#alerts",
                expect: { checked: "yes" },
              },
            ],
          },
        ],
      }),
    /expect.checked/,
  );
});

test("validates bounded keyboard press interaction key names", () => {
  const config = validateConfig({
    baseUrl: "http://localhost",
    routes: [
      {
        path: "/",
        interactions: [
          { type: "press", selector: "#command", key: "ControlOrMeta+Enter" },
        ],
      },
    ],
  });
  assert.equal(config.routes[0].interactions[0].key, "ControlOrMeta+Enter");
  for (const key of ["", "Shift++Enter", "Enter\nsecret", "A".repeat(33)]) {
    assert.throws(
      () =>
        validateConfig({
          baseUrl: "http://localhost",
          routes: [
            {
              path: "/",
              interactions: [{ type: "press", selector: "#command", key }],
            },
          ],
        }),
      /key must be a supported key name or shortcut/,
    );
  }
});

test("keeps repeated route checks distinct when keyboard keys differ", () => {
  const config = validateConfig({
    baseUrl: "http://localhost",
    routes: [
      {
        path: "/",
        interactions: [{ type: "press", selector: "#command", key: "Enter" }],
      },
      {
        path: "/",
        interactions: [{ type: "press", selector: "#command", key: "Escape" }],
      },
    ],
  });
  assert.equal(config.routes.length, 2);
});

test("help and version commands are executable", async () => {
  const logs = [];
  const io = {
    log: (message) => logs.push(message),
    error: (message) => logs.push(message),
  };
  assert.equal(await main(["--help"], io), 0);
  assert.match(logs[0], /Usage:/);
  assert.match(logs[0], /analyze --source <directory>.*--format json\|sarif/);
  assert.equal(await main(["--version"], io), 0);
  const { version } = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(logs[1], version);
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
