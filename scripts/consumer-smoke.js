import { execFile, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const temporaryDirectory = await mkdtemp(
  path.join(os.tmpdir(), "hydration-doctor-consumer-"),
);
const consumerDirectory = path.join(temporaryDirectory, "consumer");
const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html" });
  response.end("<html><body><main>Consumer scan passed</main></body></html>");
});

try {
  execFileSync("npm", ["pack", "--pack-destination", temporaryDirectory], {
    cwd: repository,
    stdio: "ignore",
  });
  const { version } = JSON.parse(
    await readFile(path.join(repository, "package.json"), "utf8"),
  );
  const tarball = path.join(
    temporaryDirectory,
    `hydration-doctor-${version}.tgz`,
  );
  execFileSync(
    "npm",
    [
      "install",
      "--prefix",
      consumerDirectory,
      "--no-audit",
      "--no-fund",
      tarball,
    ],
    {
      cwd: temporaryDirectory,
      stdio: "inherit",
    },
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const configPath = path.join(
    temporaryDirectory,
    "hydration-doctor.config.js",
  );
  await writeFile(
    configPath,
    `export default { baseUrl: "http://127.0.0.1:${server.address().port}", routes: [{ path: "/", expectedSelector: "main", expectedText: "Consumer scan passed" }] };\n`,
  );
  const cliPath = path.join(
    consumerDirectory,
    "node_modules",
    "hydration-doctor",
    "src",
    "cli",
    "index.js",
  );
  const installedBinPath = path.join(
    consumerDirectory,
    "node_modules",
    ".bin",
    "hydration-doctor",
  );
  const { stdout: versionOutput } = await execFileAsync(
    process.execPath,
    [installedBinPath, "--version"],
    { cwd: temporaryDirectory, encoding: "utf8", timeout: 10_000 },
  );
  if (versionOutput.trim() !== version) {
    throw new Error(
      `Installed hydration-doctor executable reported unexpected version: ${versionOutput}`,
    );
  }
  const { stdout: output } = await execFileAsync(
    process.execPath,
    [cliPath, "scan", "--config", configPath],
    { cwd: temporaryDirectory, encoding: "utf8", timeout: 120_000 },
  );
  if (!output.includes("Scan passed; 2/2 scenarios passed.")) {
    throw new Error(`Packed consumer scan did not report success:\n${output}`);
  }
  process.stdout.write("Packed consumer install and browser scan passed.\n");
} finally {
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  await rm(temporaryDirectory, { recursive: true, force: true });
}
