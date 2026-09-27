const MAX_ELEMENTS = 100;
const MAX_VALUE_LENGTH = 512;
const MAX_DIFFERENCES = 500;

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
      const pending = [{ element: root, path: "0" }];
      let truncated = false;
      while (pending.length && elements.length < 100) {
        const { element, path } = pending.pop();
        if (ignored.some((selector) => element.matches(selector))) continue;
        const attributes = Object.fromEntries(
          selectedAttributes
            .filter((name) => element.hasAttribute(name))
            .map((name) => [name, element.getAttribute(name).slice(0, 512)]),
        );
        const directText = settings.compareText
          ? Array.from(element.childNodes)
              .filter((node) => node.nodeType === Node.TEXT_NODE)
              .map((node) => node.textContent.replace(/\s+/g, " ").trim())
              .filter(Boolean)
              .join(" ")
              .slice(0, 512)
          : undefined;
        elements.push({
          path,
          tag: element.tagName.toLowerCase(),
          attributes,
          text: directText,
        });
        const children = element.children;
        const available = Math.max(0, 100 - elements.length - pending.length);
        const count = Math.min(children.length, available);
        if (count < children.length) truncated = true;
        for (let index = count - 1; index >= 0; index -= 1)
          pending.push({ element: children[index], path: `${path}.${index}` });
      }
      if (pending.length) truncated = true;
      return { selector: settings.selector, elements, truncated };
    },
    { htmlText: html, settings: options },
  );
}

function snapshotElement(root, settings) {
  const MAX_ELEMENTS = 100;
  const MAX_VALUE_LENGTH = 512;
  const ignored = settings.ignoreSelectors ?? [];
  const selectedAttributes = settings.attributes ?? [];
  const elements = [];
  const pending = [{ element: root, path: "0" }];
  let truncated = false;
  while (pending.length && elements.length < MAX_ELEMENTS) {
    const { element, path } = pending.pop();
    if (ignored.some((selector) => element.matches(selector))) continue;
    const attributes = Object.fromEntries(
      selectedAttributes
        .filter((name) => element.hasAttribute(name))
        .map((name) => [
          name,
          element.getAttribute(name).slice(0, MAX_VALUE_LENGTH),
        ]),
    );
    const directText = settings.compareText
      ? Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" ")
          .slice(0, MAX_VALUE_LENGTH)
      : undefined;
    elements.push({
      path,
      tag: element.tagName.toLowerCase(),
      attributes,
      text: directText,
    });
    const children = element.children;
    const available = Math.max(
      0,
      MAX_ELEMENTS - elements.length - pending.length,
    );
    const count = Math.min(children.length, available);
    if (count < children.length) truncated = true;
    for (let index = count - 1; index >= 0; index -= 1)
      pending.push({ element: children[index], path: `${path}.${index}` });
  }
  if (pending.length) truncated = true;
  return { selector: settings.selector, elements, truncated };
}

export function compareSnapshots(before, after) {
  const differences = [];
  let differencesTruncated = false;
  const add = (difference) => {
    if (differences.length < MAX_DIFFERENCES) differences.push(difference);
    else differencesTruncated = true;
  };
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
      add({
        path: left?.path ?? right.path,
        kind: "element-presence",
        before: left?.tag ?? null,
        after: right?.tag ?? null,
      });
      continue;
    }
    if (left.tag !== right.tag)
      add({ path: left.path, kind: "tag", before: left.tag, after: right.tag });
    for (const name of new Set([
      ...Object.keys(left.attributes),
      ...Object.keys(right.attributes),
    ])) {
      if (left.attributes[name] !== right.attributes[name])
        add({
          path: left.path,
          kind: "attribute",
          name,
          before: left.attributes[name] ?? null,
          after: right.attributes[name] ?? null,
        });
    }
    if (left.text !== right.text)
      add({
        path: left.path,
        kind: "text",
        before: left.text ?? "",
        after: right.text ?? "",
      });
  }
  if (differencesTruncated)
    differences.push({
      kind: "differences-truncated",
      maximum: MAX_DIFFERENCES,
    });
  if (before.truncated || after.truncated)
    differences.push({
      kind: "snapshot-truncated",
      before: !!before.truncated,
      after: !!after.truncated,
    });
  return differences;
}
