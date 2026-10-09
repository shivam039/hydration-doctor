import { access, readFile } from "node:fs/promises";
import path from "node:path";

export async function inspectReleaseRecord(root) {
  const packagePath = path.join(root, "package.json");
  const changelogPath = path.join(root, "CHANGELOG.md");
  let packageData;
  let changelog;
  const errors = [];

  try {
    packageData = JSON.parse(await readFile(packagePath, "utf8"));
  } catch {
    return { errors: ["package.json is missing or invalid JSON."] };
  }
  try {
    changelog = await readFile(changelogPath, "utf8");
  } catch {
    return {
      version: packageData.version,
      errors: ["CHANGELOG.md is missing or unreadable."],
    };
  }

  const version = packageData.version;
  if (
    typeof version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)
  ) {
    errors.push("package.json must contain a valid semantic version.");
    return { version, errors };
  }

  const headings = changelog
    .split(/\r?\n/)
    .filter((line) =>
      new RegExp(`^##\\s+${escapeRegExp(version)}\\s+—\\s+`).test(line),
    );
  if (headings.length !== 1) {
    errors.push(
      `CHANGELOG.md must contain exactly one heading for ${version}.`,
    );
  } else if (!/—\s+Published\s+\d{4}-\d{2}-\d{2}\s*$/.test(headings[0])) {
    errors.push(
      `CHANGELOG.md must mark package version ${version} as Published with a date.`,
    );
  }

  const prdPath = path.join(root, "docs", "releases", `PRD_v${version}.md`);
  try {
    await access(prdPath);
  } catch {
    errors.push(
      `The versioned release PRD docs/releases/PRD_v${version}.md is missing.`,
    );
  }

  return { version, errors };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
