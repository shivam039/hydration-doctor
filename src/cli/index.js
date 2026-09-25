#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { loadConfig, validateConfig } from "../config/index.js";
import { scan } from "../runtime/scan.js";
import { withBrowser } from "../browser/engine.js";
import {
  formatHtmlReport,
  formatJsonReport,
  formatTerminalReport,
} from "../reporters/index.js";

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
    if (rest.length) throw new Error(`Unexpected argument: ${rest[0]}`);
    assertKnownOptions(command, options);
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

function assertKnownOptions(command, options) {
  const allowed = {
    init: new Set(["config"]),
    doctor: new Set(["browser"]),
    scan: new Set([
      "config",
      "url",
      "route",
      "browser",
      "reporter",
      "timeout",
      "concurrency",
      "retries",
      "output",
    ]),
  }[command];
  const unknown = Object.keys(options).filter(
    (key) => key !== "positional" && !allowed?.has(key),
  );
  if (unknown.length)
    throw new Error(
      `Unknown option(s) for ${command ?? "command"}: ${unknown.join(", ")}.`,
    );
}

async function init(options, io) {
  const filename = options.config ?? "hydration-doctor.config.js";
  try {
    await writeFile(
      filename,
      `export default {\n  baseUrl: "http://localhost:3000",\n  routes: [\n    { path: "/", expectedSelector: "main" },\n  ],\n};\n`,
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        `Configuration already exists at ${filename}; it was not changed.`,
      );
    throw error;
  }
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
  config = validateConfig({
    ...config,
    ...(options.browser ? { browser: options.browser } : {}),
    ...(options.reporter ? { reporter: options.reporter } : {}),
    ...(options.timeout ? { timeout: Number(options.timeout) } : {}),
    ...(options.concurrency
      ? { concurrency: Number(options.concurrency) }
      : {}),
    ...(options.retries ? { retries: Number(options.retries) } : {}),
  });
  if (positional.length)
    throw new Error(`Unexpected scan argument: ${positional[0]}`);
  const report = await scan(config);
  const reporters = Array.isArray(config.reporter)
    ? config.reporter
    : [config.reporter];
  if (options.output) {
    if (reporters.length > 1) {
      await mkdir(options.output, { recursive: true });
      for (const reporter of reporters.filter((item) => item !== "text")) {
        const extension = reporter === "json" ? "json" : "html";
        await writeFile(
          path.join(
            options.output,
            `hydration-doctor-${report.runId}.${extension}`,
          ),
          reporter === "json"
            ? `${formatJsonReport(report)}\n`
            : formatHtmlReport(report),
          { flag: "wx" },
        );
      }
    } else if (reporters[0] === "html") {
      await writeFile(options.output, formatHtmlReport(report), { flag: "wx" });
    } else if (reporters[0] === "json") {
      await writeFile(options.output, `${formatJsonReport(report)}\n`, {
        flag: "wx",
      });
    } else {
      await writeFile(options.output, `${formatJsonReport(report)}\n`, {
        flag: "wx",
      });
    }
  }
  if (reporters.includes("json")) io.log(formatJsonReport(report));
  else io.log(formatTerminalReport(report));
  return report.status === "passed" ? 0 : 1;
}

const helpText = `Hydration Doctor ${VERSION}\n\nUsage:\n  hydration-doctor init [--config <path>]\n  hydration-doctor scan --config <path> [--browser chromium|firefox|webkit] [--reporter text|json|html|text,json,html] [--timeout <ms>] [--concurrency <n>] [--retries <n>] [--output <path>]\n  hydration-doctor scan --url <url> [--route <path>] [--browser chromium|firefox|webkit]\n  hydration-doctor doctor [--browser chromium|firefox|webkit]\n  hydration-doctor --help\n  hydration-doctor --version\n\nConfig is an ES module exporting baseUrl, routes, optional navigation, timeout, browser, reporter, viewport, locale, timezoneId, colorScheme, reducedMotion, device, storageState, concurrency, and retries. CLI values override config. For multiple reporters, --output names a directory; single-file reporters write to the exact output path. Exit codes: 0 pass, 1 verified scenario failure, 2 setup/configuration/execution error.\n`;

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === realpathSync(process.argv[1])
) {
  process.exitCode = await main();
}
