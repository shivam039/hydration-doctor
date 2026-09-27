import { redactSensitiveText, sanitizeUrl } from "../utils/redact.js";

function xmlText(value) {
  return String(redactSensitiveText(value))
    .replace(
      /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu,
      "",
    )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function scenarioName(result) {
  return `${result.scenario} ${redactSensitiveText(result.route ?? "")}`;
}

export function formatJUnitReport(report) {
  const results = Array.isArray(report.results) ? report.results : [];
  const inconclusive = report.status === "inconclusive";
  const failed = inconclusive
    ? 0
    : results.filter((result) => !result.passed).length;
  const skipped = inconclusive ? results.length : 0;
  const cases = results
    .map((result) => {
      const name = xmlText(scenarioName(result));
      const classname = xmlText(
        `hydration-doctor.${result.scenario ?? "scenario"}`,
      );
      const url = xmlText(sanitizeUrl(result.url ?? ""));
      if (inconclusive)
        return `  <testcase classname="${classname}" name="${name}">
    <skipped message="scan inconclusive">Configured checks did not produce a conclusive result.</skipped>
  </testcase>`;
      if (!result.passed) {
        const details =
          (result.findings ?? []).join("\n") || "Scenario failed.";
        return `  <testcase classname="${classname}" name="${name}">
    <failure message="scenario failed" type="observed-failure">${xmlText(`${details}\nURL: ${url}`)}</failure>
  </testcase>`;
      }
      return `  <testcase classname="${classname}" name="${name}" />`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="hydration-doctor" tests="${results.length}" failures="${failed}" skipped="${skipped}">
${cases}
</testsuite>
`;
}
