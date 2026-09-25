const confirmedHydrationPatterns = [
  /hydration failed because the server rendered html/i,
  /there was an error while hydrating/i,
  /text content does not match server-rendered html/i,
  /text content did not match\. server:/i,
  /expected server html to contain a matching/i,
  /hydration mismatch/i,
];

export function classifyRuntimeEvents(events) {
  const findings = [];
  for (const entry of events.console) {
    const hydrationMessage = confirmedHydrationPatterns.some((pattern) =>
      pattern.test(entry.text),
    );
    findings.push({
      category: hydrationMessage
        ? "confirmed-hydration-warning"
        : "browser-console-error",
      confidence: "observed",
      severity: hydrationMessage ? "error" : "warning",
      evidence: entry.text,
      explanation: hydrationMessage
        ? "The browser emitted a React hydration mismatch warning. This confirms the warning was observed; it does not identify its source or root cause."
        : "The browser emitted a console error. This does not by itself establish a hydration problem.",
    });
  }
  for (const message of events.pageErrors) {
    findings.push({
      category: "browser-runtime-exception",
      confidence: "observed",
      severity: "error",
      evidence: message,
      explanation:
        "The page raised an uncaught runtime exception during this scenario.",
    });
  }
  for (const request of events.failedRequests) {
    findings.push({
      category: "failed-network-request",
      confidence: "observed",
      severity: "warning",
      evidence: { url: request.url, reason: request.reason },
      explanation:
        "A browser request failed. The failure may be unrelated to rendering and is not classified as a hydration error.",
    });
  }
  return findings;
}

export function classifyScenarioFindings(messages) {
  return messages.flatMap((message) => {
    let category;
    if (/Unexpected redirect|Final URL .* expected URL/i.test(message))
      category = "unexpected-redirect";
    else if (/readiness selector/i.test(message))
      category = "loading-readiness-failure";
    else if (
      /selector .* failed|Expected visible text was not found/i.test(message)
    )
      category = "missing-expected-ui";
    else if (/HTTP \d+|request failed/i.test(message))
      category = "failed-network-dependency";
    if (!category) return [];
    return [
      {
        category,
        confidence: "observed",
        severity: "error",
        evidence: message,
      },
    ];
  });
}

export function hasConfirmedHydrationWarning(findings) {
  return findings.some(
    (finding) => finding.category === "confirmed-hydration-warning",
  );
}
