import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scan } from "../src/runtime/scan.js";
import { validateConfig } from "../src/config/index.js";
import { formatHtmlReport } from "../src/reporters/html.js";
import { main } from "../src/cli/index.js";
import { readVisualBaseline } from "../src/comparison/baselines.js";
import { startNavigationFixture } from "../fixtures/navigation-app.js";

test("compares persistent visual baselines and only writes in explicit update mode", async (t) => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "hd-baseline-"));
  const baselineDir = path.join(tempRoot, "baselines");
  const outsideFile = path.join(tempRoot, "outside.png");
  await mkdir(baselineDir);
  await writeFile(outsideFile, "not a baseline");
  const server = createServer((request, response) => {
    const color = request.url === "/changed" ? "#111111" : "#eeeeee";
    response.writeHead(200, { "content-type": "text/html" });
    response.end(
      `<html><body><main style="width:300px;height:200px;background:${color}">Stable fixture</main></body></html>`,
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(tempRoot, { recursive: true, force: true });
  });

  const config = {
    baseUrl,
    baselineDir,
    routes: [
      {
        path: "/visual",
        expectedSelector: "main",
        visual: { baseline: "home.png", maxDiffRatio: 0 },
      },
    ],
  };
  const missing = await scan(config);
  assert.equal(missing.status, "inconclusive");
  assert.equal(missing.results[0].visualBaseline.status, "missing");
  await assert.rejects(readFile(path.join(baselineDir, "home.png")), {
    code: "ENOENT",
  });

  const configPath = path.join(tempRoot, "hydration-doctor.config.mjs");
  await writeFile(configPath, `export default ${JSON.stringify(config)};`);
  const cliOutput = [];
  const updateExitCode = await main(
    ["scan", "--config", configPath, "--update-baselines"],
    {
      log: (message) => cliOutput.push(message),
      error: (message) => cliOutput.push(message),
    },
  );
  assert.equal(updateExitCode, 0);
  assert.match(cliOutput.join("\n"), /visual baseline updated/);
  assert.ok((await readFile(path.join(baselineDir, "home.png"))).length > 0);

  const matched = await scan(config);
  assert.equal(matched.status, "passed");
  assert.equal(matched.results[0].visualBaseline.status, "matched");

  const changed = await scan({
    ...config,
    routes: [{ ...config.routes[0], path: "/changed" }],
  });
  assert.equal(changed.status, "failed");
  assert.equal(changed.results[0].visualBaseline.status, "different");
  assert.ok(changed.results[0].visualBaseline.changedPixelRatio > 0);
  assert.ok(changed.results[0].visualBaselineDiff?.data);
  assert.match(
    formatHtmlReport(changed),
    /Persistent visual baseline difference image/,
  );

  await symlink(outsideFile, path.join(baselineDir, "linked.png"));
  await assert.rejects(
    readVisualBaseline(baselineDir, "linked.png"),
    /symlink/,
  );
});

test("rejects baseline paths that could escape the configured directory", () => {
  assert.throws(
    () =>
      validateConfig({
        baseUrl: "http://localhost",
        routes: [{ path: "/", visual: { baseline: "../outside.png" } }],
      }),
    /simple PNG filename/,
  );
});

test("creates and compares separate desktop and mobile baseline profiles through the CLI", async (t) => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "hd-viewport-"));
  const baselineDir = path.join(tempRoot, "baselines");
  const { server, baseUrl } = await startNavigationFixture();
  t.after(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(tempRoot, { recursive: true, force: true });
  });

  for (const profile of [
    { name: "desktop", viewport: "1280x800", width: 1280, height: 800 },
    { name: "mobile", viewport: "390x844", width: 390, height: 844 },
  ]) {
    const baseline = `responsive-${profile.name}.png`;
    const configPath = path.join(tempRoot, `${profile.name}.config.mjs`);
    const config = {
      baseUrl,
      baselineDir,
      reporter: "json",
      viewport: { width: 1280, height: 800 },
      routes: [
        {
          path: "/responsive-visual",
          expectedText: "Responsive visual fixture",
          visual: { baseline, maxDiffRatio: 0.05 },
        },
      ],
    };
    await writeFile(configPath, `export default ${JSON.stringify(config)};`);

    let output = "";
    const io = {
      log(value) {
        output = value;
      },
      error(value) {
        throw new Error(value);
      },
    };
    assert.equal(
      await main(
        [
          "scan",
          "--config",
          configPath,
          "--viewport",
          profile.viewport,
          "--update-baselines",
        ],
        io,
      ),
      0,
    );
    const updated = JSON.parse(output);
    assert.equal(updated.results[0].visualScreenshot.width, profile.width);
    assert.equal(updated.results[0].visualScreenshot.height, profile.height);
    assert.equal(updated.results[0].visualBaseline.status, "updated");

    assert.equal(
      await main(
        ["scan", "--config", configPath, "--viewport", profile.viewport],
        io,
      ),
      0,
    );
    const compared = JSON.parse(output);
    assert.equal(compared.results[0].visualBaseline.status, "matched");
    assert.equal(compared.results[0].visualScreenshot.width, profile.width);
    assert.equal(compared.results[0].visualScreenshot.height, profile.height);
    assert.ok((await readFile(path.join(baselineDir, baseline))).length > 0);
  }
});
