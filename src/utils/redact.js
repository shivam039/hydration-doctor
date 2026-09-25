const sensitiveName =
  /(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|passwd|authorization|cookie|api[_-]?key|client[_-]?secret|credential|session)/i;

export function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    for (const key of new Set(url.searchParams.keys())) {
      if (sensitiveName.test(key)) url.searchParams.set(key, "[REDACTED]");
    }
    if (url.hash.includes("=")) {
      const fragment = new URLSearchParams(url.hash.slice(1));
      let changed = false;
      for (const key of new Set(fragment.keys())) {
        if (sensitiveName.test(key)) {
          fragment.set(key, "[REDACTED]");
          changed = true;
        }
      }
      if (changed) url.hash = fragment.toString();
    }
    return url.href;
  } catch {
    return String(value).replace(
      /([?&#](?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|passwd|authorization|cookie|api[_-]?key|client[_-]?secret|credential|session)=)[^&#\s]*/gi,
      "$1[REDACTED]",
    );
  }
}

export function redactSensitiveText(value) {
  return String(value)
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(
      /(["']?(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|passwd|authorization|cookie|api[_-]?key|client[_-]?secret|credential|session)["']?\s*[:=]\s*["']?)([^\s,;"'}]+)/gi,
      "$1[REDACTED]",
    )
    .replace(/https?:\/\/[^\s"'<>]+/gi, (match) => sanitizeUrl(match));
}
