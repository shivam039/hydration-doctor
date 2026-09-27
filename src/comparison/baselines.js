import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export function validateBaselineFilename(filename) {
  if (
    typeof filename !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,123}\.png$/.test(filename) ||
    filename.includes("..")
  ) {
    throw new Error(
      "visual.baseline must be a simple PNG filename inside baselineDir.",
    );
  }
  return filename;
}

export async function readVisualBaseline(directory, filename) {
  const target = resolveBaseline(directory, filename);
  let file;
  try {
    file = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const details = await file.stat();
    if (!details.isFile())
      throw new Error("Visual baseline must be a regular file, not a symlink.");
    return await file.readFile();
  } catch (error) {
    if (error.code === "ENOENT") return null;
    if (error.code === "ELOOP")
      throw new Error("Visual baseline must be a regular file, not a symlink.");
    throw error;
  } finally {
    await file?.close();
  }
}

export async function writeVisualBaseline(directory, filename, data) {
  const target = resolveBaseline(directory, filename);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  try {
    const details = await lstat(target);
    if (details.isSymbolicLink() || !details.isFile())
      throw new Error("Visual baseline must be a regular file, not a symlink.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}-${process.pid}-${randomUUID()}.tmp`,
  );
  try {
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(data);
    } finally {
      await file.close();
    }
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

function resolveBaseline(directory, filename) {
  validateBaselineFilename(filename);
  const root = path.resolve(directory ?? ".hydration-doctor/baselines");
  const target = path.resolve(root, filename);
  if (path.dirname(target) !== root)
    throw new Error("Visual baseline must stay inside baselineDir.");
  return target;
}
