export function formatTerminalReport(report) {
  const lines = [];
  for (const result of report.results) {
    const status = result.passed ? "PASS" : "FAIL";
    const detail = result.findings.length
      ? ` — ${result.findings.join("; ")}`
      : "";
    const baseline = result.visualBaseline
      ? ` — visual baseline ${result.visualBaseline.status}${result.visualBaseline.file ? ` (${result.visualBaseline.file})` : ""}`
      : "";
    lines.push(
      `${status} ${result.scenario} ${result.url}${detail}${baseline}`,
    );
  }
  const passed = report.results.filter((result) => result.passed).length;
  lines.push(
    `Scan ${report.status}; ${passed}/${report.results.length} scenarios passed.`,
  );
  return lines.join("\n");
}

export function formatJsonReport(report) {
  return JSON.stringify(report, null, 2);
}

export { formatHtmlReport } from "./html.js";
export { formatJUnitReport } from "./junit.js";
