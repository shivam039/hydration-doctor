import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const samples = Number(process.argv[2] ?? 15);
if (!Number.isSafeInteger(samples) || samples < 5 || samples > 100) {
  throw new Error("Sample count must be an integer between 5 and 100.");
}

for (const command of ["--help", "--version"]) {
  const durations = [];
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now();
    const result = spawnSync(process.execPath, ["src/cli/index.js", command], {
      cwd: repository,
      stdio: "ignore",
    });
    durations.push(performance.now() - started);
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`CLI ${command} exited with status ${result.status}.`);
    }
  }
  durations.sort((left, right) => left - right);
  const median = durations[Math.floor(durations.length / 2)];
  const p90 = durations[Math.floor(durations.length * 0.9)];
  process.stdout.write(
    `${JSON.stringify({
      node: process.version,
      command,
      samples,
      medianMs: Number(median.toFixed(1)),
      p90Ms: Number(p90.toFixed(1)),
    })}\n`,
  );
}
