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
        url: "https://example.test/<svg onload=alert(1)>",
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
});
