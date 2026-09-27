import { sanitizeUrl } from "../utils/redact.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });
}

function safeHref(value) {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol)
      ? sanitizeUrl(url.href)
      : "#";
  } catch {
    return "#";
  }
}

export function formatHtmlReport(report) {
  const rows = report.results
    .map((result) => {
      const displayUrl = sanitizeUrl(result.url ?? "");
      const displayRoute = sanitizeUrl(result.route ?? "");
      const details = [
        ...result.findings.map((finding) => `<li>${escapeHtml(finding)}</li>`),
        ...result.diagnostics.map(
          (diagnostic) =>
            `<li><strong>${escapeHtml(diagnostic.category)}</strong>: <pre>${escapeHtml(JSON.stringify(diagnostic.evidence, null, 2))}</pre></li>`,
        ),
      ].join("");
      const href = safeHref(displayUrl);
      return `<article class="scenario ${result.passed ? "passed" : "failed"}"><h2>${escapeHtml(result.scenario)} — ${result.passed ? "Pass" : "Fail"}</h2><p><code>${escapeHtml(displayRoute)}</code> · <a href="${escapeHtml(href)}">${escapeHtml(displayUrl)}</a></p>${details ? `<h3>Findings</h3><ul>${details}</ul>` : "<p>No findings recorded.</p>"}</article>`;
    })
    .join("\n");
  const title = `Hydration Doctor report: ${report.status}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0 auto; max-width: 72rem; padding: 2rem 1rem; line-height: 1.5; }
    .summary, .scenario { border: 1px solid #8886; border-radius: .5rem; margin: 1rem 0; padding: 1rem; }
    .passed { border-inline-start: .35rem solid #18864b; }
    .failed { border-inline-start: .35rem solid #c43b3b; }
    pre { overflow-wrap: anywhere; white-space: pre-wrap; }
    a { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <header><h1>Hydration Doctor</h1><p>Run <code>${escapeHtml(report.runId)}</code> · ${escapeHtml(report.status)} · ${escapeHtml(report.browser)}</p><p>Base URL: <code>${escapeHtml(sanitizeUrl(report.baseUrl ?? ""))}</code></p></header>
  <main><section class="summary" aria-label="Run summary"><h2>Scenario results</h2><p>${report.results.filter((item) => item.passed).length} of ${report.results.length} passed.</p></section>${rows}</main>
</body>
</html>`;
}
