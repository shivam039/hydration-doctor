import { lstat, opendir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "espree";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);
const DEFAULT_EXCLUDES = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const MAX_FILES = 500;
const MAX_DIRECTORIES = 500;
const MAX_FILE_BYTES = 1024 * 1024;

export async function analyzeStaticSources(rootDirectory, options = {}) {
  if (typeof rootDirectory !== "string" || !rootDirectory.trim())
    throw new TypeError("Source directory must be a non-empty path string.");
  const root = path.resolve(rootDirectory);
  const excludedDirectories = new Set([
    ...DEFAULT_EXCLUDES,
    ...(options.excludeDirectories ?? []),
  ]);
  const files = [];
  const skipped = { excluded: 0, oversized: 0, limit: 0 };
  const pending = [root];
  let directoriesVisited = 0;
  while (pending.length) {
    if (directoriesVisited >= MAX_DIRECTORIES) {
      skipped.limit += pending.length;
      break;
    }
    const directory = pending.pop();
    let entries;
    try {
      entries = await opendir(directory);
    } catch (error) {
      if (directory === root)
        throw new Error(`Could not read source directory: ${error.message}`);
      skipped.excluded += 1;
      continue;
    }
    directoriesVisited += 1;
    for await (const entry of entries) {
      try {
        if (entry.isSymbolicLink()) {
          skipped.excluded += 1;
          continue;
        }
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (excludedDirectories.has(entry.name)) skipped.excluded += 1;
          else pending.push(filename);
          continue;
        }
        if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name)))
          continue;
        if (files.length >= MAX_FILES) {
          skipped.limit += 1;
          continue;
        }
        const metadata = await lstat(filename);
        if (metadata.size > MAX_FILE_BYTES) {
          skipped.oversized += 1;
          continue;
        }
        files.push(filename);
      } catch {
        skipped.excluded += 1;
      }
    }
  }

  const findings = [];
  const parseErrors = [];
  for (const filename of files.sort()) {
    const source = await readFile(filename, "utf8");
    let ast;
    try {
      ast = parse(source, {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        loc: true,
        comment: true,
      });
    } catch (moduleError) {
      try {
        ast = parse(source, {
          ecmaVersion: "latest",
          sourceType: "script",
          ecmaFeatures: { jsx: true },
          loc: true,
          comment: true,
        });
      } catch {
        parseErrors.push({
          file: path.relative(root, filename),
          line: moduleError.lineNumber ?? null,
          column: moduleError.column ?? null,
          message:
            "Could not parse this JavaScript/JSX file; analysis skipped.",
        });
        continue;
      }
    }
    visit(ast, (node) => {
      if (node.type !== "MemberExpression") return;
      const chain = memberChain(node);
      let rule;
      let evidence;
      if (
        /^(window|document|navigator|localStorage|sessionStorage)\./.test(chain)
      ) {
        rule = "browser-global-during-render-candidate";
        evidence = chain.split(".")[0];
      } else if (chain === "Date.now" || chain === "Math.random") {
        rule = "nondeterministic-value-candidate";
        evidence = chain;
      } else if (/^process\.env(?:\.|$)/.test(chain)) {
        rule = "environment-dependent-render-candidate";
        evidence = "process.env";
      }
      if (!rule) return;
      findings.push({
        rule,
        confidence: "candidate",
        severity: "info",
        file: path.relative(root, filename),
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        evidence,
        explanation:
          "This source pattern may cause server/client output to differ if evaluated during render. Static analysis cannot determine execution timing or prove a runtime hydration failure.",
      });
    });
  }

  return {
    schemaVersion: 1,
    filesScanned: files.length,
    skipped,
    parseErrors,
    findings,
  };
}

function visit(node, callback) {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "range", "tokens", "comments"].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) visit(child, callback);
    } else if (value && typeof value === "object") visit(value, callback);
  }
}

function memberChain(node) {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression") return "";
  const property = node.computed
    ? node.property.type === "Literal"
      ? String(node.property.value)
      : "[]"
    : node.property.name;
  const object = memberChain(node.object);
  return object ? `${object}.${property}` : property;
}
