import test from "node:test";
import assert from "node:assert/strict";
import { compareSnapshots } from "../src/comparison/snapshots.js";

test("caps snapshot differences and reports incomplete snapshots", () => {
  const elements = Array.from({ length: 800 }, (_, index) => ({
    path: `0.${index}`,
    tag: "p",
    attributes: {},
    text: `item-${index}`,
  }));
  const other = elements.map((element) => ({ ...element, text: "changed" }));
  const differences = compareSnapshots(
    { selector: "main", elements, truncated: true },
    { selector: "main", elements: other, truncated: false },
  );
  assert.equal(differences[500].kind, "differences-truncated");
  assert.deepEqual(differences[501], {
    kind: "snapshot-truncated",
    before: true,
    after: false,
  });
  assert.equal(differences.length, 502);
});
