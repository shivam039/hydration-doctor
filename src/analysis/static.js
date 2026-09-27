import { lstat, opendir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "espree";
import { parse as parseTypeScript } from "@typescript-eslint/typescript-estree";
import { Minimatch } from "minimatch";

const JAVASCRIPT_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const SOURCE_EXTENSIONS = new Set([
  ...JAVASCRIPT_EXTENSIONS,
  ...TYPESCRIPT_EXTENSIONS,
]);
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
const MAX_EXCLUDE_PATTERNS = 50;
const MAX_EXCLUDE_PATTERN_LENGTH = 256;

export async function analyzeStaticSources(rootDirectory, options = {}) {
  if (typeof rootDirectory !== "string" || !rootDirectory.trim())
    throw new TypeError("Source directory must be a non-empty path string.");
  const root = path.resolve(rootDirectory);
  const excludedDirectories = new Set([
    ...DEFAULT_EXCLUDES,
    ...(options.excludeDirectories ?? []),
  ]);
  const excludePatterns = compileExcludePatterns(options.excludePatterns);
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
        const relativeFile = path
          .relative(root, filename)
          .split(path.sep)
          .join("/");
        if (excludePatterns.some((pattern) => pattern.match(relativeFile))) {
          skipped.excluded += 1;
          continue;
        }
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
      ast = parseSource(source, filename);
    } catch (moduleError) {
      if (JAVASCRIPT_EXTENSIONS.has(path.extname(filename))) {
        try {
          ast = parse(source, {
            ecmaVersion: "latest",
            sourceType: "script",
            ecmaFeatures: { jsx: true },
            loc: true,
            comment: true,
          });
        } catch {
          ast = null;
        }
      } else {
        ast = null;
      }
      if (!ast) {
        parseErrors.push({
          file: path.relative(root, filename),
          line: moduleError.lineNumber ?? null,
          column: moduleError.column ?? null,
          message: `Could not parse this ${TYPESCRIPT_EXTENSIONS.has(path.extname(filename)) ? "TypeScript/TSX" : "JavaScript/JSX"} file; analysis skipped.`,
        });
        continue;
      }
    }
    visit(ast, (node, parent) => {
      let rule;
      let evidence;
      if (
        node.type === "MemberExpression" &&
        !(parent?.type === "MemberExpression" && parent.object === node)
      ) {
        const chain = memberChain(node);
        if (
          /^(window|document|navigator|localStorage|sessionStorage)\./.test(
            chain,
          )
        ) {
          rule = "browser-global-during-render-candidate";
          evidence = chain.split(".")[0];
        } else if (chain === "Date.now" || chain === "Math.random") {
          rule = "nondeterministic-value-candidate";
          evidence = chain;
        } else if (/^process\.env(?:\.|$)/.test(chain)) {
          rule = "environment-dependent-render-candidate";
          evidence = "process.env";
        } else if (chain === "Intl.DateTimeFormat") {
          rule = "locale-dependent-output-candidate";
          evidence = chain;
        }
      } else if (
        node.type === "NewExpression" &&
        node.callee.type === "Identifier" &&
        node.callee.name === "Date" &&
        node.arguments.length === 0
      ) {
        rule = "nondeterministic-date-candidate";
        evidence = "new Date()";
      } else if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"].includes(
          node.callee.property.name,
        )
      ) {
        rule = "locale-dependent-output-candidate";
        evidence = node.callee.property.name;
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

function compileExcludePatterns(patterns = []) {
  if (!Array.isArray(patterns) || patterns.length > MAX_EXCLUDE_PATTERNS)
    throw new TypeError(
      `excludePatterns must be an array with at most ${MAX_EXCLUDE_PATTERNS} entries.`,
    );
  return patterns.map((pattern) => {
    if (
      typeof pattern !== "string" ||
      !pattern.trim() ||
      pattern.length > MAX_EXCLUDE_PATTERN_LENGTH ||
      pattern.includes("\0") ||
      pattern.includes("\\") ||
      path.posix.isAbsolute(pattern) ||
      /^[a-zA-Z]:/.test(pattern)
    ) {
      throw new TypeError("Invalid source exclusion pattern.");
    }
    const segments = pattern.split("/");
    if (
      segments.some(
        (segment) =>
          !segment ||
          segment === ".." ||
          segment === "." ||
          (segment.includes("**") && segment !== "**"),
      )
    )
      throw new TypeError(
        "Source exclusion patterns must stay relative and use ** as a complete path segment.",
      );
    if (/[\[\]{}!]/.test(pattern))
      throw new TypeError(
        "Source exclusion patterns support only *, **, and ? wildcards.",
      );

    return new Minimatch(pattern, {
      dot: true,
      nobrace: true,
      nocomment: true,
      noext: true,
      nonegate: true,
    });
  });
}

function parseSource(source, filename) {
  if (TYPESCRIPT_EXTENSIONS.has(path.extname(filename))) {
    return parseTypeScript(source, {
      loc: true,
      jsx: [".tsx"].includes(path.extname(filename)),
      sourceType: "module",
      filePath: filename,
    });
  }
  return parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
    loc: true,
    comment: true,
  });
}

function visit(node, callback, parent = null) {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") callback(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "range", "tokens", "comments"].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) visit(child, callback, node);
    } else if (value && typeof value === "object") visit(value, callback, node);
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
