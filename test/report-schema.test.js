import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { scan } from "../src/runtime/scan.js";
import { startNavigationFixture } from "../fixtures/navigation-app.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(
  await readFile(path.join(root, "docs/schema/report-v1.schema.json"), "utf8"),
);
const validate = new Ajv2020({ strict: true }).compile(schema);

test("report schema accepts real scan output and additive version 1 fields", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const report = await scan({
    baseUrl,
    browser: "chromium",
    routes: [{ path: "/", expectedSelector: "main" }],
  });
  report.futureVersion1Field = { tolerated: true };
  assert.equal(validate(report), true, JSON.stringify(validate.errors));
});

test("report schema rejects missing required fields and unsupported schema versions", () => {
  assert.equal(validate({ schemaVersion: 2 }), false);
  assert.ok(validate.errors.some((error) => error.keyword === "required"));
  assert.equal(
    validate({
      schemaVersion: 2,
      runId: "run",
      browser: "chromium",
      baseUrl: "http://localhost",
      status: "passed",
      results: [],
    }),
    false,
  );
  assert.ok(
    validate.errors.some((error) => error.instancePath === "/schemaVersion"),
  );
});
