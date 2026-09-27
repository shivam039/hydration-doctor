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

function safePngImage(data, width, height, alt, caption) {
  if (
    typeof data !== "string" ||
    data.length > 350_000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(data) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 2_000_000
  ) {
    return "";
  }
  return `<figure><figcaption>${caption}</figcaption><img alt="${alt}" width="${width}" height="${height}" src="data:image/png;base64,${data}"></figure>`;
}

export function formatHtmlReport(report) {
  const rows = report.results
    .map((result) => {
      const displayUrl = sanitizeUrl(result.url ?? "");
      const displayRoute = sanitizeUrl(result.route ?? "");
      const details = [
        ...result.findings.map((finding) => `<li>${escapeHtml(finding)}</li>`),
        ...result.diagnostics.map((diagnostic) => {
          const guidance = diagnostic.explanation
            ? `<p>${escapeHtml(diagnostic.explanation)}</p>`
            : "";
          const reproduction = diagnostic.reproduction
            ? `<p>Reproduction: ${escapeHtml(diagnostic.reproduction.steps.join(" "))}</p>`
            : "";
          return `<li><strong>${escapeHtml(diagnostic.category)}</strong>${guidance}${reproduction}<pre>${escapeHtml(JSON.stringify(diagnostic.evidence, null, 2))}</pre></li>`;
        }),
      ].join("");
      const visualImages = [
        result.visualScreenshot?.complete
          ? safePngImage(
              result.visualScreenshot.data,
              result.visualScreenshot.width,
              result.visualScreenshot.height,
              "Captured browser viewport",
              "Captured viewport",
            )
          : "",
        result.visualDiff?.data
          ? safePngImage(
              result.visualDiff.data,
              result.visualComparison?.width,
              result.visualComparison?.height,
              "Visual difference image",
              "Pixel differences highlighted in red",
            )
          : "",
      ].join("");
      const href = safeHref(displayUrl);
      return `<article class="scenario ${result.passed ? "passed" : "failed"}"><h2>${escapeHtml(result.scenario)} — ${result.passed ? "Pass" : "Fail"}</h2><p><code>${escapeHtml(displayRoute)}</code> · <a href="${escapeHtml(href)}">${escapeHtml(displayUrl)}</a></p>${details ? `<h3>Findings</h3><ul>${details}</ul>` : "<p>No findings recorded.</p>"}${visualImages}</article>`;
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
    figure { margin: 1rem 0; }
    figure img { display: block; max-width: 100%; height: auto; border: 1px solid #8886; }
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
