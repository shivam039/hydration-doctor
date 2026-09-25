import test from "node:test";
import assert from "node:assert/strict";
import {
  createReactDiagnosticsAdapter,
  DoctorError,
  getExitCode,
  formatJsonReport,
  redactSensitiveText,
  sanitizeUrl,
} from "../src/index.js";

test("React adapter exposes the documented recoverable-error hook", () => {
  const captured = [];
  const adapter = createReactDiagnosticsAdapter({
    onRecoverableError: (diagnostic) => captured.push(diagnostic),
  });
  adapter.onRecoverableError(new Error("Recoverable hydration issue"), {
    componentStack: "\n    in App",
  });
  assert.deepEqual(captured, [
    {
      category: "react-recoverable-error",
      message: "Recoverable hydration issue",
      componentStack: "\n    in App",
    },
  ]);
  assert.throws(
    () => createReactDiagnosticsAdapter({ onRecoverableError: true }),
    /must be a function/,
  );
});

test("public error and JSON report helpers preserve explicit status", () => {
  assert.equal(getExitCode(new DoctorError("bad config")), 2);
  assert.equal(
    getExitCode(new DoctorError("failed check", { exitCode: 1 })),
    1,
  );
  assert.equal(
    formatJsonReport({ status: "inconclusive" }),
    '{\n  "status": "inconclusive"\n}',
  );
});

test("redacts URL credentials and common secrets while preserving ordinary query values", () => {
  const safeUrl = sanitizeUrl(
    "https://user:pass@example.test/route?access_token=abc123&tab=recent#session=xyz",
  );
  assert.doesNotMatch(safeUrl, /user|pass|abc123|xyz/);
  assert.match(safeUrl, /tab=recent/);
  const safeText = redactSensitiveText(
    'Authorization: Bearer abc.def password="hunter2" https://example.test/?api_key=key123',
  );
  assert.doesNotMatch(safeText, /abc\.def|hunter2|key123/);
});
