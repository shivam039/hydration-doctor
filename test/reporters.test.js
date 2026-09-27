import test from "node:test";
import assert from "node:assert/strict";
import { formatHtmlReport } from "../src/reporters/html.js";

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
          { category: "<iframe>", evidence: { body: "</pre><script>" } },
        ],
      },
    ],
  });
  assert.doesNotMatch(html, /<script>|<img |<svg |<iframe>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;\/pre&gt;&lt;script&gt;/);
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
