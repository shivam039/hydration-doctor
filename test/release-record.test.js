import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inspectReleaseRecord } from "../src/release/record.js";

async function createReleaseRepository(t) {
  const root = await mkdtemp(path.join(tmpdir(), "hydration-doctor-release-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "docs", "releases"), { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ version: "0.27.0" }),
  );
  await writeFile(
    path.join(root, "CHANGELOG.md"),
    "# Changelog\n\n## 0.27.0 — Published 2026-09-27\n",
  );
  await writeFile(
    path.join(root, "docs", "releases", "PRD_v0.27.0.md"),
    "# Published release\n",
  );
  return root;
}

test("accepts a package version with one dated published changelog entry and matching PRD", async (t) => {
  const root = await createReleaseRepository(t);
  assert.deepEqual(await inspectReleaseRecord(root), {
    version: "0.27.0",
    errors: [],
  });
});

test("rejects a package version without a matching changelog entry", async (t) => {
  const root = await createReleaseRepository(t);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ version: "0.28.0" }),
  );
  const result = await inspectReleaseRecord(root);
  assert.ok(result.errors.some((error) => /exactly one heading/.test(error)));
  assert.ok(result.errors.some((error) => /versioned release PRD/.test(error)));
});

test("rejects roadmap increments mislabeled as the published package version", async (t) => {
  const root = await createReleaseRepository(t);
  await writeFile(
    path.join(root, "CHANGELOG.md"),
    "# Changelog\n\n## 0.27.0 — Unreleased roadmap increment\n",
  );
  const result = await inspectReleaseRecord(root);
  assert.ok(result.errors.some((error) => /Published with a date/.test(error)));
});

test("rejects duplicate changelog entries for the package version", async (t) => {
  const root = await createReleaseRepository(t);
  await writeFile(
    path.join(root, "CHANGELOG.md"),
    "# Changelog\n\n## 0.27.0 — Published 2026-09-27\n\n## 0.27.0 — Published 2026-09-27\n",
  );
  const result = await inspectReleaseRecord(root);
  assert.ok(result.errors.some((error) => /exactly one heading/.test(error)));
});

test("rejects an invalid package version", async (t) => {
  const root = await createReleaseRepository(t);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ version: "latest" }),
  );
  const result = await inspectReleaseRecord(root);
  assert.ok(
    result.errors.some((error) => /valid semantic version/.test(error)),
  );
});
