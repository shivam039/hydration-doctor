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
  else if (input.routes.length > 50)
    errors.push("routes must contain no more than 50 entries.");
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
        if (route.interactions !== undefined) {
          if (
            !Array.isArray(route.interactions) ||
            route.interactions.length > 10
          ) {
            errors.push(
              `routes[${index}].interactions must be an array with at most 10 steps.`,
            );
          } else {
            route.interactions.forEach((interaction, stepIndex) => {
              const label = `routes[${index}].interactions[${stepIndex}]`;
              if (
                !interaction ||
                typeof interaction !== "object" ||
                !["click", "fill", "submit"].includes(interaction.type) ||
                typeof interaction.selector !== "string" ||
                !interaction.selector.trim()
              ) {
                errors.push(
                  `${label} must define click, fill, or submit and a selector.`,
                );
                return;
              }
              if (
                interaction.type === "fill" &&
                typeof interaction.value !== "string"
              )
                errors.push(`${label}.value must be a string for fill steps.`);
              if (
                interaction.checkpoint !== undefined &&
                !["beforeReady", "ready"].includes(interaction.checkpoint)
              ) {
                errors.push(
                  `${label}.checkpoint must be beforeReady or ready.`,
                );
              }
              if (interaction.checkpoint === "ready" && !route.readySelector)
                errors.push(
                  `${label} uses checkpoint ready but route.readySelector is missing.`,
                );
              if (interaction.expect !== undefined) {
                if (
                  !interaction.expect ||
                  typeof interaction.expect !== "object"
                ) {
                  errors.push(`${label}.expect must be an object.`);
                } else {
                  for (const key of ["selector", "text", "url"]) {
                    if (
                      interaction.expect[key] !== undefined &&
                      typeof interaction.expect[key] !== "string"
                    )
                      errors.push(`${label}.expect.${key} must be a string.`);
                  }
                  if (typeof interaction.expect.url === "string")
                    validateHttpTarget(
                      interaction.expect.url,
                      baseUrl,
                      `${label}.expect.url`,
                      errors,
                      false,
                    );
                }
              }
            });
          }
        }
        if (route.visual !== undefined) {
          if (
            !route.visual ||
            typeof route.visual !== "object" ||
            Array.isArray(route.visual)
          ) {
            errors.push(`routes[${index}].visual must be an object.`);
          } else {
            if (
              route.visual.maxDiffRatio !== undefined &&
              (typeof route.visual.maxDiffRatio !== "number" ||
                !Number.isFinite(route.visual.maxDiffRatio) ||
                route.visual.maxDiffRatio < 0 ||
                route.visual.maxDiffRatio > 1)
            ) {
              errors.push(
                `routes[${index}].visual.maxDiffRatio must be from 0 to 1.`,
              );
            }
            if (
              route.visual.maskSelectors !== undefined &&
              (!Array.isArray(route.visual.maskSelectors) ||
                route.visual.maskSelectors.length > 20 ||
                route.visual.maskSelectors.some(
                  (selector) =>
                    typeof selector !== "string" || !selector.trim(),
                ))
            ) {
              errors.push(
                `routes[${index}].visual.maskSelectors must contain at most 20 non-empty selectors.`,
              );
            }
          }
        }
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
            (route.snapshot.attributes?.length ?? 0) > 5 ||
            (route.snapshot.ignoreSelectors?.length ?? 0) > 20
          ) {
            errors.push(
              `routes[${index}].snapshot supports at most 5 attributes and 20 ignoreSelectors.`,
            );
          }
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
    Array.isArray(input.routes) &&
    input.routes.filter(
      (route) =>
        route && typeof route === "object" && route.visual !== undefined,
    ).length > 5
  ) {
    errors.push("At most 5 routes may capture visual evidence per scan.");
  }
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
  if (
    input.navigation &&
    baseUrl &&
    typeof input.navigation.from === "string" &&
    typeof input.navigation.to === "string"
  ) {
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
  if (input.allowOrigins !== undefined) {
    if (!Array.isArray(input.allowOrigins)) {
      errors.push("allowOrigins must be an array of HTTP(S) origins.");
    } else {
      const normalizedOrigins = [];
      input.allowOrigins.forEach((origin, index) => {
        try {
          if (typeof origin !== "string") throw new Error("must be a string");
          const parsed = new URL(origin);
          if (!new Set(["http:", "https:"]).has(parsed.protocol))
            throw new Error("must use http or https");
          if (parsed.username || parsed.password)
            throw new Error("must not include credentials");
          if (parsed.pathname !== "/" || parsed.search || parsed.hash)
            throw new Error("must contain only an origin");
          normalizedOrigins.push(parsed.origin);
        } catch (error) {
          errors.push(`allowOrigins[${index}] ${error.message}.`);
        }
      });
      if (new Set(normalizedOrigins).size !== normalizedOrigins.length)
        errors.push("allowOrigins must not contain duplicate origins.");
    }
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
    ...(input.allowOrigins === undefined
      ? {}
      : {
          allowOrigins: input.allowOrigins.map(
            (origin) => new URL(origin).origin,
          ),
        }),
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
