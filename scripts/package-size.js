import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function parsePackReport(value) {
  const reports = Array.isArray(value) ? value : JSON.parse(value);
  if (!Array.isArray(reports) || reports.length !== 1) {
    throw new Error("npm pack must return exactly one package report");
  }
  const report = reports[0];
  for (const field of ["size", "unpackedSize", "entryCount"]) {
    if (!Number.isSafeInteger(report?.[field]) || report[field] < 0) {
      throw new Error(`npm pack report has an invalid ${field}`);
    }
  }
  return {
    name: report.name,
    version: report.version,
    packedBytes: report.size,
    unpackedBytes: report.unpackedSize,
    fileCount: report.entryCount,
  };
}

export function checkBudgets(metrics, budgets) {
  const errors = [];
  for (const field of ["packedBytes", "unpackedBytes", "fileCount"]) {
    const limit = budgets?.[field];
    if (!Number.isSafeInteger(limit) || limit < 0) {
      errors.push(`budget ${field} must be a non-negative integer`);
    } else if (metrics[field] > limit) {
      errors.push(`${field} ${metrics[field]} exceeds budget ${limit}`);
    }
  }
  return errors;
}

function main() {
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const metrics = parsePackReport(raw);
  const budgets = JSON.parse(
    readFileSync(
      path.join(repository, "scripts/package-size-budget.json"),
      "utf8",
    ),
  );
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
  const errors = checkBudgets(metrics, budgets);
  if (errors.length) {
    for (const error of errors)
      process.stderr.write(`Package size budget failed: ${error}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("Package size budgets passed.\n");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Package size check failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
