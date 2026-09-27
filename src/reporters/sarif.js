const SARIF_SCHEMA =
  "https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/schemas/sarif-schema-2.1.0.json";
const TOOL_URI = "https://github.com/shivam039/hydration-doctor";

const RULES = {
  "browser-global-during-render-candidate":
    "Browser global access may vary between server and browser rendering.",
  "nondeterministic-value-candidate":
    "This value may differ between server and browser rendering.",
  "nondeterministic-date-candidate":
    "The current date may differ between server and browser rendering.",
  "environment-dependent-render-candidate":
    "Environment variables may differ between server and browser rendering.",
  "locale-dependent-output-candidate":
    "Locale-sensitive formatting may differ between environments.",
};

export function formatSarifReport(report) {
  const results = [];
  const usedRuleIds = new Set();
  for (const finding of Array.isArray(report?.findings)
    ? report.findings
    : []) {
    const ruleId = Object.hasOwn(RULES, finding?.rule)
      ? finding.rule
      : "unknown-static-candidate";
    usedRuleIds.add(ruleId);
    const location = safeLocation(finding);
    results.push({
      ruleId,
      level: sarifLevel(finding?.severity),
      message: {
        text: RULES[ruleId] ?? "An unrecognized static candidate was reported.",
      },
      ...(location ? { locations: [location] } : {}),
      properties: { confidence: "candidate" },
    });
  }

  if (Array.isArray(report?.parseErrors)) {
    for (const parseError of report.parseErrors) {
      usedRuleIds.add("source-parse-error");
      const location = safeLocation(parseError);
      results.push({
        ruleId: "source-parse-error",
        level: "warning",
        message: {
          text: "Source syntax could not be parsed; analysis skipped this file.",
        },
        ...(location ? { locations: [location] } : {}),
      });
    }
  }

  return {
    $schema: SARIF_SCHEMA,
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Hydration Doctor",
            informationUri: TOOL_URI,
            rules: [...usedRuleIds].sort().map((id) => ({
              id,
              shortDescription: {
                text: RULES[id] ?? "Source syntax could not be parsed.",
              },
              defaultConfiguration: {
                level: id === "source-parse-error" ? "warning" : "note",
              },
            })),
          },
        },
        results,
        properties: {
          filesScanned: nonNegativeInteger(report?.filesScanned),
          parseErrorCount: Array.isArray(report?.parseErrors)
            ? report.parseErrors.length
            : 0,
        },
      },
    ],
  };
}

function safeLocation(item) {
  const uri = safeRelativeUri(item?.file);
  if (!uri) return null;
  const region = {};
  if (Number.isSafeInteger(item?.line) && item.line > 0)
    region.startLine = item.line;
  if (Number.isSafeInteger(item?.column) && item.column > 0)
    region.startColumn = item.column;
  return {
    physicalLocation: {
      artifactLocation: { uri },
      ...(Object.keys(region).length ? { region } : {}),
    },
  };
}

function safeRelativeUri(file) {
  if (
    typeof file !== "string" ||
    !file ||
    file.includes("\\") ||
    file.includes("\0") ||
    file.startsWith("/") ||
    /^[a-zA-Z]:/.test(file)
  )
    return null;
  const segments = file.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  )
    return null;
  try {
    return segments.map(encodeURIComponent).join("/");
  } catch {
    return null;
  }
}

function sarifLevel(severity) {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "note";
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
