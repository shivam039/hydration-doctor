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
