#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import { inspectReleaseRecord } from "../src/release/record.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const result = await inspectReleaseRecord(repositoryRoot);
if (result.errors.length) {
  for (const error of result.errors)
    console.error(`Release record check failed: ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Release record is consistent for hydration-doctor@${result.version}.`,
  );
}
