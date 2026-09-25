#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import { loadConfig, validateConfig } from "../config/index.js";
import { scan } from "../runtime/scan.js";
import { withBrowser } from "../browser/engine.js";

const VERSION = "0.1.0";

export function parseArgs(args) {
  const parsed = { positional: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      parsed.positional.push(arg);
      continue;
    }
    const [rawKey, inline] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    if (inline !== undefined) parsed[key] = inline;
    else if (["help", "version"].includes(key)) parsed[key] = true;
    else {
      const value = args[index + 1];
      if (!value || value.startsWith("--"))
        throw new Error(`Option --${rawKey} requires a value.`);
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

export async function main(args = process.argv.slice(2), io = console) {
  try {
    const options = parseArgs(args);
    if (options.help || args.length === 0) {
      io.log(helpText);
      return 0;
    }
    if (options.version) {
      io.log(VERSION);
      return 0;
    }
    const [command, ...rest] = options.positional;
    if (command === "init") return await init(options, io);
    if (command === "doctor") return await doctor(options, io);
    if (command === "scan") return await scanCommand(options, rest, io);
    throw new Error(
      `Unknown command: ${command ?? "(none)"}. Run hydration-doctor --help.`,
    );
  } catch (error) {
    io.error(error.message);
    return 2;
  }
}

async function init(options, io) {
  const filename = options.config ?? "hydration-doctor.config.js";
  const configUrl = pathToFileURL(
    new URL(filename, `file://${process.cwd()}/`).pathname,
  );
  try {
    await import(configUrl.href);
    throw new Error(
      `Configuration already exists at ${filename}; it was not changed.`,
    );
  } catch (error) {
    if (error.message.startsWith("Configuration already exists")) throw error;
    if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  }
  await writeFile(
    filename,
    `export default {\n  baseUrl: "http://localhost:3000",\n  routes: [\n    { path: "/", expectedSelector: "main" },\n  ],\n};\n`,
    { flag: "wx" },
  );
  io.log(
    `Created ${filename}. Edit its routes and start your application before scanning.`,
  );
  return 0;
}

async function doctor(options, io) {
  const browser = options.browser ?? "chromium";
  const config = validateConfig({
    baseUrl: "http://localhost",
    routes: ["/"],
    browser,
  });
  await withBrowser(config, async () => {});
  io.log(
    `Hydration Doctor ${VERSION}: Playwright ${browser} is installed and launches successfully.`,
  );
  return 0;
}

async function scanCommand(options, positional, io) {
  let config;
  if (options.config) config = await loadConfig(options.config);
  else if (options.url) {
    const url = new URL(options.url);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(
        "--url must be an http(s) URL without embedded credentials.",
      );
    config = validateConfig({
      baseUrl: url.origin,
      routes: [options.route ?? `${url.pathname}${url.search}${url.hash}`],
    });
  } else throw new Error("scan needs --config <path> or --url <url>.");
  if (options.route && options.url) config.routes = [{ path: options.route }];
  if (options.browser) config.browser = options.browser;
  if (options.reporter) config.reporter = options.reporter;
  if (positional.length)
    throw new Error(`Unexpected scan argument: ${positional[0]}`);
  const report = await scan(config);
  if (options.output)
    await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, {
      flag: "wx",
    });
  if (config.reporter === "json") io.log(JSON.stringify(report, null, 2));
  else {
    for (const result of report.results) {
      io.log(
        `${result.passed ? "PASS" : "FAIL"} ${result.scenario} ${result.url}${result.findings.length ? ` — ${result.findings.join("; ")}` : ""}`,
      );
    }
    io.log(
      `Scan ${report.status}; ${report.results.filter((item) => item.passed).length}/${report.results.length} scenarios passed.`,
    );
  }
  return report.status === "passed" ? 0 : 1;
}

const helpText = `Hydration Doctor ${VERSION}\n\nUsage:\n  hydration-doctor init [--config <path>]\n  hydration-doctor scan --config <path> [--browser chromium|firefox|webkit] [--reporter text|json] [--output <path>]\n  hydration-doctor scan --url <url> [--route <path>] [--browser chromium|firefox|webkit]\n  hydration-doctor doctor [--browser chromium|firefox|webkit]\n  hydration-doctor --help\n  hydration-doctor --version\n\nConfig is an ES module exporting baseUrl, routes, optional navigation, timeout, browser, reporter, and viewport. CLI browser/reporter values override config. Exit codes: 0 pass, 1 verified scenario failure, 2 setup/configuration/execution error. HTML reports are planned for a later phase.\n`;

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === realpathSync(process.argv[1])
) {
  process.exitCode = await main();
}
