import test from "node:test";
import assert from "node:assert/strict";
import { checkBudgets, parsePackReport } from "../scripts/package-size.js";

const validReport = {
  name: "hydration-doctor",
  version: "0.32.0",
  size: 83403,
  unpackedSize: 297587,
  entryCount: 91,
};
const validBudgets = {
  packedBytes: 102400,
  unpackedBytes: 358400,
  fileCount: 110,
};

test("parses npm pack metrics without conflating archive and unpacked sizes", () => {
  assert.deepEqual(parsePackReport(JSON.stringify([validReport])), {
    name: "hydration-doctor",
    version: "0.32.0",
    packedBytes: 83403,
    unpackedBytes: 297587,
    fileCount: 91,
  });
});

test("fails closed for malformed or ambiguous npm pack output", () => {
  assert.throws(() => parsePackReport("not json"));
  assert.throws(() => parsePackReport([]), /exactly one/);
  assert.throws(
    () => parsePackReport([{ ...validReport, size: "83403" }]),
    /invalid size/,
  );
  assert.throws(
    () => parsePackReport([{ ...validReport, entryCount: -1 }]),
    /invalid entryCount/,
  );
});

test("accepts metrics within budgets, including exact boundaries", () => {
  assert.deepEqual(
    checkBudgets(parsePackReport([validReport]), validBudgets),
    [],
  );
  assert.deepEqual(
    checkBudgets(
      { packedBytes: 102400, unpackedBytes: 358400, fileCount: 110 },
      validBudgets,
    ),
    [],
  );
});

test("reports every exceeded or malformed budget", () => {
  assert.deepEqual(
    checkBudgets(
      { packedBytes: 102401, unpackedBytes: 358401, fileCount: 111 },
      validBudgets,
    ),
    [
      "packedBytes 102401 exceeds budget 102400",
      "unpackedBytes 358401 exceeds budget 358400",
      "fileCount 111 exceeds budget 110",
    ],
  );
  assert.deepEqual(checkBudgets(validReport, { packedBytes: null }), [
    "budget packedBytes must be a non-negative integer",
    "budget unpackedBytes must be a non-negative integer",
    "budget fileCount must be a non-negative integer",
  ]);
});
