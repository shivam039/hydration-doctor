import { pathToFileURL } from "node:url";
import path from "node:path";

export function defineConfig(config) {
  return config;
}

export function validateConfig(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(
      "Configuration must export an object via `export default`.",
    );
  }
  if (typeof input.baseUrl !== "string")
    errors.push("baseUrl must be a URL string.");
  else {
    try {
      const url = new URL(input.baseUrl);
      if (!new Set(["http:", "https:"]).has(url.protocol))
        errors.push("baseUrl must use http or https.");
      if (url.username || url.password)
        errors.push("baseUrl must not include credentials.");
    } catch {
      errors.push("baseUrl must be a valid absolute URL.");
    }
  }
  if (!Array.isArray(input.routes) || input.routes.length === 0)
    errors.push("routes must be a non-empty array.");
  else
    input.routes.forEach((route, index) => {
      if (typeof route === "string") return;
      if (!route || typeof route !== "object" || typeof route.path !== "string")
        errors.push(
          `routes[${index}] must be a path string or an object with a path.`,
        );
      else {
        for (const key of ["expectedSelector", "expectedText"]) {
          if (route[key] !== undefined && typeof route[key] !== "string")
            errors.push(`routes[${index}].${key} must be a string.`);
        }
      }
    });
  if (
    input.navigation !== undefined &&
    (!input.navigation ||
      typeof input.navigation !== "object" ||
      typeof input.navigation.from !== "string" ||
      typeof input.navigation.click !== "string" ||
      typeof input.navigation.to !== "string")
  ) {
    errors.push(
      "navigation must have string `from`, `click`, and `to` properties.",
    );
  }
  const timeout = input.timeout ?? 10000;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120000)
    errors.push("timeout must be an integer from 1 to 120000 milliseconds.");
  if (
    input.browser !== undefined &&
    !["chromium", "firefox", "webkit"].includes(input.browser)
  )
    errors.push("browser must be chromium, firefox, or webkit.");
  if (
    input.reporter !== undefined &&
    !["text", "json"].includes(input.reporter)
  )
    errors.push("reporter must be text or json.");
  if (errors.length)
    throw new Error(`Invalid configuration:\n- ${errors.join("\n- ")}`);
  return {
    timeout: 10000,
    browser: "chromium",
    reporter: "text",
    viewport: { width: 1280, height: 800 },
    ...input,
    routes: input.routes.map((route) =>
      typeof route === "string" ? { path: route } : route,
    ),
  };
}

export async function loadConfig(filename) {
  const resolved = path.resolve(filename);
  const imported = await import(
    `${pathToFileURL(resolved).href}?updated=${Date.now()}`
  );
  return validateConfig(imported.default);
}
