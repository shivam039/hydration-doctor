import { pathToFileURL } from "node:url";
import path from "node:path";

export function defineConfig(config) {
  return config;
}

export function validateConfig(input) {
  const errors = [];
  let baseUrl;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(
      "Configuration must export an object via `export default`.",
    );
  }
  if (typeof input.baseUrl !== "string")
    errors.push("baseUrl must be a URL string.");
  else {
    try {
      baseUrl = new URL(input.baseUrl);
      if (!new Set(["http:", "https:"]).has(baseUrl.protocol))
        errors.push("baseUrl must use http or https.");
      if (baseUrl.username || baseUrl.password)
        errors.push("baseUrl must not include credentials.");
    } catch {
      errors.push("baseUrl must be a valid absolute URL.");
    }
  }
  if (!Array.isArray(input.routes) || input.routes.length === 0)
    errors.push("routes must be a non-empty array.");
  else
    input.routes.forEach((route, index) => {
      if (typeof route === "string") {
        if (!route.trim()) errors.push(`routes[${index}] must not be empty.`);
        else
          validateHttpTarget(route, baseUrl, `routes[${index}]`, errors, false);
        return;
      }
      if (!route || typeof route !== "object" || typeof route.path !== "string")
        errors.push(
          `routes[${index}] must be a path string or an object with a path.`,
        );
      else {
        if (!route.path.trim())
          errors.push(`routes[${index}].path must not be empty.`);
        else
          validateHttpTarget(
            route.path,
            baseUrl,
            `routes[${index}].path`,
            errors,
            false,
          );
        if (typeof route.expectedUrl === "string")
          validateHttpTarget(
            route.expectedUrl,
            baseUrl,
            `routes[${index}].expectedUrl`,
            errors,
            true,
          );
        for (const key of [
          "expectedSelector",
          "expectedText",
          "expectedUrl",
          "readySelector",
        ]) {
          if (route[key] !== undefined && typeof route[key] !== "string")
            errors.push(`routes[${index}].${key} must be a string.`);
        }
        if (
          route.snapshot !== undefined &&
          (!route.snapshot ||
            typeof route.snapshot !== "object" ||
            typeof route.snapshot.selector !== "string" ||
            !route.snapshot.selector.trim())
        ) {
          errors.push(`routes[${index}].snapshot must include a selector.`);
        } else if (route.snapshot) {
          if (
            route.snapshot.compareText !== undefined &&
            typeof route.snapshot.compareText !== "boolean"
          ) {
            errors.push(
              `routes[${index}].snapshot.compareText must be boolean.`,
            );
          }
          for (const key of ["attributes", "ignoreSelectors"]) {
            if (
              route.snapshot[key] !== undefined &&
              (!Array.isArray(route.snapshot[key]) ||
                route.snapshot[key].some((value) => typeof value !== "string"))
            ) {
              errors.push(
                `routes[${index}].snapshot.${key} must be an array of strings.`,
              );
            }
          }
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
  if (input.navigation && baseUrl) {
    validateHttpTarget(
      input.navigation.from,
      baseUrl,
      "navigation.from",
      errors,
      false,
    );
    validateHttpTarget(
      input.navigation.to,
      baseUrl,
      "navigation.to",
      errors,
      false,
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
    input.viewport !== undefined &&
    (!input.viewport ||
      !Number.isInteger(input.viewport.width) ||
      !Number.isInteger(input.viewport.height) ||
      input.viewport.width < 1 ||
      input.viewport.height < 1 ||
      input.viewport.width > 7680 ||
      input.viewport.height > 7680)
  ) {
    errors.push("viewport width and height must be integers from 1 to 7680.");
  }
  if (
    input.retries !== undefined &&
    (!Number.isInteger(input.retries) || input.retries < 0 || input.retries > 5)
  ) {
    errors.push("retries must be an integer from 0 to 5.");
  }
  if (
    input.concurrency !== undefined &&
    (!Number.isInteger(input.concurrency) ||
      input.concurrency < 1 ||
      input.concurrency > 8)
  ) {
    errors.push("concurrency must be an integer from 1 to 8.");
  }
  if (
    input.colorScheme !== undefined &&
    !["light", "dark", "no-preference"].includes(input.colorScheme)
  ) {
    errors.push("colorScheme must be light, dark, or no-preference.");
  }
  if (
    input.reducedMotion !== undefined &&
    !["reduce", "no-preference"].includes(input.reducedMotion)
  ) {
    errors.push("reducedMotion must be reduce or no-preference.");
  }
  if (
    input.locale !== undefined &&
    (typeof input.locale !== "string" || !input.locale.trim())
  ) {
    errors.push("locale must be a non-empty string.");
  }
  if (
    input.timezoneId !== undefined &&
    (typeof input.timezoneId !== "string" || !input.timezoneId.trim())
  ) {
    errors.push("timezoneId must be a non-empty IANA timezone identifier.");
  }
  if (
    input.device !== undefined &&
    (typeof input.device !== "string" || !input.device.trim())
  ) {
    errors.push("device must be a Playwright device descriptor name.");
  }
  if (
    input.storageState !== undefined &&
    typeof input.storageState !== "string" &&
    (typeof input.storageState !== "object" || input.storageState === null)
  ) {
    errors.push(
      "storageState must be a Playwright storage state object or path.",
    );
  }
  if (
    input.includeHtmlEvidence !== undefined &&
    typeof input.includeHtmlEvidence !== "boolean"
  ) {
    errors.push("includeHtmlEvidence must be boolean.");
  }
  const reporters =
    input.reporter === undefined
      ? []
      : Array.isArray(input.reporter)
        ? input.reporter
        : typeof input.reporter === "string"
          ? input.reporter.split(",").map((reporter) => reporter.trim())
          : [input.reporter];
  if (
    reporters.some(
      (reporter) => !["text", "json", "html"].includes(reporter),
    ) ||
    new Set(reporters).size !== reporters.length
  )
    errors.push(
      "reporter must be text, json, html, or an array of distinct reporter names.",
    );
  if (errors.length)
    throw new Error(`Invalid configuration:\n- ${errors.join("\n- ")}`);
  return {
    timeout: 10000,
    browser: "chromium",
    reporter: "text",
    viewport: { width: 1280, height: 800 },
    concurrency: 1,
    retries: 0,
    ...input,
    ...(input.reporter === undefined
      ? {}
      : { reporter: reporters.length === 1 ? reporters[0] : reporters }),
    routes: input.routes.map((route) =>
      typeof route === "string" ? { path: route } : route,
    ),
  };
}

function validateHttpTarget(value, baseUrl, label, errors, allowExternal) {
  if (!baseUrl || typeof value !== "string") return;
  try {
    const target = new URL(value, baseUrl);
    if (!new Set(["http:", "https:"]).has(target.protocol))
      throw new Error("unsupported protocol");
    if (target.username || target.password)
      throw new Error("embedded credentials are not allowed");
    if (!allowExternal && target.origin !== baseUrl.origin)
      throw new Error("must stay on the configured baseUrl origin");
  } catch (error) {
    errors.push(`${label} is invalid: ${error.message}.`);
  }
}

export async function loadConfig(filename) {
  const resolved = path.resolve(filename);
  const imported = await import(
    `${pathToFileURL(resolved).href}?updated=${Date.now()}`
  );
  return validateConfig(imported.default);
}
