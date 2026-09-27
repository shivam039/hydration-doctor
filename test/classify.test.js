import test from "node:test";
import assert from "node:assert/strict";
import { classifyScenarioFindings } from "../src/diagnostics/classify.js";

test("classifies a missing configured selector as missing expected UI", () => {
  const diagnostics = classifyScenarioFindings(
    ["The configured expected UI selector failed to be visible within 1000ms."],
    {
      scenario: "direct",
      route: "/broken",
      url: "http://localhost/broken",
      steps: [],
    },
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].category, "missing-expected-ui");
  assert.equal(diagnostics[0].confidence, "observed");
});
