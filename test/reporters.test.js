import test from "node:test";
import assert from "node:assert/strict";
import { formatHtmlReport } from "../src/reporters/html.js";
import { formatJUnitReport } from "../src/reporters/junit.js";
import { formatSarifReport } from "../src/reporters/sarif.js";

test("HTML reports escape untrusted scenario and diagnostic content", () => {
  const html = formatHtmlReport({
    runId: "run-1",
    status: "failed",
    browser: "chromium",
    baseUrl: "https://example.test/?token=[REDACTED]",
    results: [
      {
        scenario: "<script>alert(1)</script>",
        passed: false,
        route: "/<img src=x>",
        url: "javascript:alert(1)",
        findings: ["<script>injected</script>"],
        diagnostics: [
          {
            category: "<iframe>",
            evidence: { body: "</pre><script>" },
            explanation: "<svg/onload=alert(1)>",
            reproduction: { steps: ["<img src=x onerror=alert(1)>"] },
          },
        ],
      },
    ],
  });
  assert.doesNotMatch(html, /<script>|<img |<svg |<iframe>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;\/pre&gt;&lt;script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /href="#">javascript:alert\(1\)<\/a>/);
});

test("HTML report URLs redact credentials and secret query parameters", () => {
  const html = formatHtmlReport({
    runId: "run-2",
    status: "passed",
    browser: "chromium",
    baseUrl: "https://user:password@example.test/?api_key=secret",
    results: [
      {
        scenario: "direct",
        passed: true,
        route: "/",
        url: "https://user:password@example.test/?access_token=secret",
        findings: [],
        diagnostics: [],
      },
    ],
  });
  assert.doesNotMatch(html, /password|api_key=secret|access_token=secret/);
  assert.match(html, /%5BREDACTED%5D/);
});

test("JUnit output escapes XML, redacts sensitive input, and removes illegal characters", () => {
  const xml = formatJUnitReport({
    status: "failed",
    results: [
      {
        scenario: 'direct"><case',
        route: "/bad?token=secret&view=full",
        url: "https://user:pass@example.test/bad?api_key=secret",
        passed: false,
        findings: [
          '<failure message="bad">\u0001 & password=secret',
          "second line",
        ],
      },
    ],
  });
  assert.match(
    xml,
    /<testsuite name="hydration-doctor" tests="1" failures="1" skipped="0">/,
  );
  assert.match(xml, /direct&quot;&gt;&lt;case/);
  assert.match(
    xml,
    /&lt;failure message=&quot;bad&quot;&gt; &amp; password=\[REDACTED\]/,
  );
  assert.doesNotMatch(xml, /\u0001|user:pass|token=secret|api_key=secret/);
  assert.doesNotMatch(xml, /<evil|<case/);
});

test("JUnit marks all scenarios skipped when scan status is inconclusive", () => {
  const xml = formatJUnitReport({
    status: "inconclusive",
    results: [{ scenario: "direct", route: "/", passed: true, findings: [] }],
  });
  assert.match(xml, /tests="1" failures="0" skipped="1"/);
  assert.match(xml, /<skipped message="scan inconclusive">/);
});

test("SARIF output is deterministic, advisory, and contains safe relative locations", () => {
  const sarif = formatSarifReport({
    filesScanned: 2,
    findings: [
      {
        rule: "browser-global-during-render-candidate",
        severity: "info",
        file: "src/components/User Card.tsx",
        line: 4,
        column: 7,
        evidence: "password=must-not-appear",
        explanation: "<script>untrusted</script>",
      },
      {
        rule: "unknown-rule-from-input",
        file: "../../secret.ts",
        line: 1,
        column: 1,
      },
      {
        rule: "nondeterministic-value-candidate",
        file: "\uD800.ts",
        line: 1,
      },
    ],
    parseErrors: [
      {
        file: "src/broken.ts",
        line: 9,
        column: 2,
        message: "token=must-not-appear",
      },
    ],
  });
  assert.equal(sarif.version, "2.1.0");
  assert.equal(
    sarif.$schema,
    "https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/schemas/sarif-schema-2.1.0.json",
  );
  assert.equal(sarif.runs[0].tool.driver.name, "Hydration Doctor");
  assert.deepEqual(
    sarif.runs[0].results.map(({ ruleId, level }) => ({ ruleId, level })),
    [
      { ruleId: "browser-global-during-render-candidate", level: "note" },
      { ruleId: "unknown-static-candidate", level: "note" },
      { ruleId: "nondeterministic-value-candidate", level: "note" },
      { ruleId: "source-parse-error", level: "warning" },
    ],
  );
  assert.deepEqual(sarif.runs[0].results[0].locations[0].physicalLocation, {
    artifactLocation: { uri: "src/components/User%20Card.tsx" },
    region: { startLine: 4, startColumn: 7 },
  });
  assert.equal("locations" in sarif.runs[0].results[1], false);
  assert.equal("locations" in sarif.runs[0].results[2], false);
  assert.doesNotMatch(
    JSON.stringify(sarif),
    /must-not-appear|<script>|secret\.ts/,
  );
  assert.deepEqual(sarif.runs[0].properties, {
    filesScanned: 2,
    parseErrorCount: 1,
  });
});
