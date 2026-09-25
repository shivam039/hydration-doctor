export async function captureSnapshot(page, options) {
  return page
    .locator(options.selector)
    .first()
    .evaluate(snapshotElement, options);
}

export async function captureServerSnapshot(page, html, options) {
  return page.evaluate(
    ({ htmlText, settings }) => {
      const document = new DOMParser().parseFromString(htmlText, "text/html");
      const root = document.querySelector(settings.selector);
      if (!root) return null;
      const ignored = settings.ignoreSelectors ?? [];
      const selectedAttributes = settings.attributes ?? [];
      const elements = [];
      const visit = (element, path) => {
        if (ignored.some((selector) => element.matches(selector))) return;
        const attributes = Object.fromEntries(
          selectedAttributes
            .filter((name) => element.hasAttribute(name))
            .map((name) => [name, element.getAttribute(name)]),
        );
        const directText = settings.compareText
          ? Array.from(element.childNodes)
              .filter((node) => node.nodeType === Node.TEXT_NODE)
              .map((node) => node.textContent.replace(/\s+/g, " ").trim())
              .filter(Boolean)
              .join(" ")
          : undefined;
        elements.push({
          path,
          tag: element.tagName.toLowerCase(),
          attributes,
          text: directText,
        });
        Array.from(element.children).forEach((child, index) =>
          visit(child, `${path}.${index}`),
        );
      };
      visit(root, "0");
      return { selector: settings.selector, elements };
    },
    { htmlText: html, settings: options },
  );
}

function snapshotElement(root, settings) {
  const ignored = settings.ignoreSelectors ?? [];
  const selectedAttributes = settings.attributes ?? [];
  const elements = [];
  const visit = (element, path) => {
    if (ignored.some((selector) => element.matches(selector))) return;
    const attributes = Object.fromEntries(
      selectedAttributes
        .filter((name) => element.hasAttribute(name))
        .map((name) => [name, element.getAttribute(name)]),
    );
    const directText = settings.compareText
      ? Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" ")
      : undefined;
    elements.push({
      path,
      tag: element.tagName.toLowerCase(),
      attributes,
      text: directText,
    });
    Array.from(element.children).forEach((child, index) =>
      visit(child, `${path}.${index}`),
    );
  };
  visit(root, "0");
  return { selector: settings.selector, elements };
}

export function compareSnapshots(before, after) {
  const differences = [];
  if (before.selector !== after.selector) {
    return [
      {
        path: "0",
        kind: "selector",
        before: before.selector,
        after: after.selector,
      },
    ];
  }
  const limit = Math.max(before.elements.length, after.elements.length);
  for (let index = 0; index < limit; index += 1) {
    const left = before.elements[index];
    const right = after.elements[index];
    if (!left || !right) {
      differences.push({
        path: left?.path ?? right.path,
        kind: "element-presence",
        before: left?.tag ?? null,
        after: right?.tag ?? null,
      });
      continue;
    }
    if (left.tag !== right.tag)
      differences.push({
        path: left.path,
        kind: "tag",
        before: left.tag,
        after: right.tag,
      });
    for (const name of new Set([
      ...Object.keys(left.attributes),
      ...Object.keys(right.attributes),
    ])) {
      if (left.attributes[name] !== right.attributes[name])
        differences.push({
          path: left.path,
          kind: "attribute",
          name,
          before: left.attributes[name] ?? null,
          after: right.attributes[name] ?? null,
        });
    }
    if (left.text !== right.text)
      differences.push({
        path: left.path,
        kind: "text",
        before: left.text ?? "",
        after: right.text ?? "",
      });
  }
  return differences;
}
