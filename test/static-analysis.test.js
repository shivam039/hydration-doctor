import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeStaticSources } from "../src/analysis/static.js";
import { main } from "../src/cli/index.js";

test("reports bounded JS/JSX candidates with exact locations and excludes dependencies", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "hydration-doctor-static-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "src"));
  await mkdir(path.join(root, "node_modules", "sample"), { recursive: true });
  await writeFile(
    path.join(root, "src", "App.jsx"),
    'export function App() {\n  const width = window.innerWidth;\n  return <span>{Date.now()} {width}</span>;\n}\n// document.cookie and Math.random() in comments are ignored\nconst note = "Math.random()";\n',
  );
  await writeFile(
    path.join(root, "node_modules", "sample", "ignored.js"),
    "const width = window.innerWidth;\n",
  );
  await writeFile(path.join(root, "src", "broken.js"), "const = nope;\n");

  const report = await analyzeStaticSources(root);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.filesScanned, 2);
  assert.deepEqual(
    report.findings.map(({ rule, file, line, column, confidence }) => ({
      rule,
      file,
      line,
      column,
      confidence,
    })),
    [
      {
        rule: "browser-global-during-render-candidate",
        file: "src/App.jsx",
        line: 2,
        column: 17,
        confidence: "candidate",
      },
      {
        rule: "nondeterministic-value-candidate",
        file: "src/App.jsx",
        line: 3,
        column: 17,
        confidence: "candidate",
      },
    ],
  );
  assert.equal(report.parseErrors[0].file, "src/broken.js");
  assert.doesNotMatch(
    JSON.stringify(report),
    /ignored\.js|innerWidth|document\.cookie/,
  );
});

test("analyzes TypeScript and TSX syntax without flagging type annotations as parse errors", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "hydration-doctor-ts-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    path.join(root, "App.ts"),
    [
      "interface User { name: string }",
      "export function getName(user: User): string {",
      "  return window.location.href + Date.now() + user.name;",
      "}",
    ].join("\n"),
  );
  await writeFile(
    path.join(root, "Widget.tsx"),
    [
      "type Props = { locale: string };",
      "export const Widget = (props: Props) => <p>{navigator.language} {Math.random()}</p>;",
    ].join("\n"),
  );
  await writeFile(path.join(root, "Broken.ts"), "const answer: = 42;\n");

  const report = await analyzeStaticSources(root);
  assert.equal(report.filesScanned, 3);
  assert.deepEqual(
    report.findings.map(({ file, line, rule }) => ({ file, line, rule })),
    [
      {
        file: "App.ts",
        line: 3,
        rule: "browser-global-during-render-candidate",
      },
      {
        file: "App.ts",
        line: 3,
        rule: "nondeterministic-value-candidate",
      },
      {
        file: "Widget.tsx",
        line: 2,
        rule: "browser-global-during-render-candidate",
      },
      {
        file: "Widget.tsx",
        line: 2,
        rule: "nondeterministic-value-candidate",
      },
    ],
  );
  assert.equal(report.parseErrors.length, 1);
  assert.deepEqual(
    { file: report.parseErrors[0].file, line: report.parseErrors[0].line },
    { file: "Broken.ts", line: 1 },
  );
  assert.match(report.parseErrors[0].message, /TypeScript/);
});

test("analyze command returns candidate findings as JSON without failing the scan exit code", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "hydration-doctor-analyze-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    path.join(root, "App.js"),
    "const language = navigator.language;\n",
  );
  let output = "";
  const exitCode = await main(["analyze", "--source", root], {
    log(value) {
      output = value;
    },
    error(value) {
      throw new Error(value);
    },
  });
  assert.equal(exitCode, 0);
  const report = JSON.parse(output);
  assert.equal(
    report.findings[0].rule,
    "browser-global-during-render-candidate",
  );
  assert.equal(report.findings[0].line, 1);
});

test("reports implicit current time and locale-formatting candidates only", async (t) => {
  const root = await mkdtemp(
    path.join(tmpdir(), "hydration-doctor-time-locale-"),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    path.join(root, "DatePatterns.jsx"),
    [
      "const current = new Date();",
      'const label = new Date().toLocaleDateString("en-US");',
      "const formatter = new Intl.DateTimeFormat();",
      'const price = amount.toLocaleString("en-US");',
      'const fixed = new Date("2020-01-01T00:00:00Z");',
    ].join("\n"),
  );

  const report = await analyzeStaticSources(root);
  assert.deepEqual(
    report.findings.map(({ rule, line, confidence }) => ({
      rule,
      line,
      confidence,
    })),
    [
      {
        rule: "nondeterministic-date-candidate",
        line: 1,
        confidence: "candidate",
      },
      {
        rule: "locale-dependent-output-candidate",
        line: 2,
        confidence: "candidate",
      },
      {
        rule: "nondeterministic-date-candidate",
        line: 2,
        confidence: "candidate",
      },
      {
        rule: "locale-dependent-output-candidate",
        line: 3,
        confidence: "candidate",
      },
      {
        rule: "locale-dependent-output-candidate",
        line: 4,
        confidence: "candidate",
      },
    ],
  );
  assert.doesNotMatch(JSON.stringify(report), /2020-01-01/);
});
