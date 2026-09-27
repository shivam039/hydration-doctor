import { PNG } from "pngjs";

const MAX_PIXELS = 2_000_000;
const MAX_IMAGE_BYTES = 256 * 1024;
const PIXEL_CHANNEL_THRESHOLD = 16;

export async function captureVisualEvidence(page, options) {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width * viewport.height > MAX_PIXELS) {
    return {
      complete: false,
      captureNote: `Visual capture is limited to ${MAX_PIXELS} viewport pixels.`,
    };
  }
  try {
    const mask = (options.maskSelectors ?? []).map((selector) =>
      page.locator(selector),
    );
    const buffer = await page.screenshot({
      type: "png",
      fullPage: false,
      animations: "disabled",
      caret: "hide",
      mask,
      maskColor: "#ff00ff",
      timeout: 5000,
    });
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return {
        complete: false,
        byteLength: buffer.byteLength,
        captureNote: `Visual image exceeds the ${MAX_IMAGE_BYTES}-byte evidence limit.`,
      };
    }
    return {
      complete: true,
      mimeType: "image/png",
      width: viewport.width,
      height: viewport.height,
      byteLength: buffer.byteLength,
      data: buffer.toString("base64"),
    };
  } catch {
    return {
      complete: false,
      captureNote:
        "Visual capture failed; verify the configured mask selectors and retry.",
    };
  }
}

export function compareVisualEvidence(before, after, maxDiffRatio = 0) {
  if (!before?.complete || !after?.complete) return null;
  const left = PNG.sync.read(Buffer.from(before.data, "base64"));
  const right = PNG.sync.read(Buffer.from(after.data, "base64"));
  if (
    left.width !== right.width ||
    left.height !== right.height ||
    left.width * left.height > MAX_PIXELS
  ) {
    return {
      width: left.width,
      height: left.height,
      changedPixels: left.width * left.height,
      totalPixels: left.width * left.height,
      changedPixelRatio: 1,
      maxDiffRatio,
      passed: false,
      diffMimeType: null,
      diffImage: null,
    };
  }
  const totalPixels = left.width * left.height;
  const diff = new PNG({ width: left.width, height: left.height });
  let changedPixels = 0;
  for (let index = 0; index < left.data.length; index += 4) {
    const changed =
      Math.abs(left.data[index] - right.data[index]) >
        PIXEL_CHANNEL_THRESHOLD ||
      Math.abs(left.data[index + 1] - right.data[index + 1]) >
        PIXEL_CHANNEL_THRESHOLD ||
      Math.abs(left.data[index + 2] - right.data[index + 2]) >
        PIXEL_CHANNEL_THRESHOLD;
    if (changed) {
      changedPixels += 1;
      diff.data[index] = 255;
      diff.data[index + 1] = 0;
      diff.data[index + 2] = 0;
      diff.data[index + 3] = 255;
    } else {
      diff.data[index] = 0;
      diff.data[index + 1] = 0;
      diff.data[index + 2] = 0;
      diff.data[index + 3] = 0;
    }
  }
  const changedPixelRatio = changedPixels / totalPixels;
  const diffBuffer = PNG.sync.write(diff);
  const diffImage =
    diffBuffer.byteLength <= MAX_IMAGE_BYTES
      ? diffBuffer.toString("base64")
      : null;
  return {
    width: left.width,
    height: left.height,
    changedPixels,
    totalPixels,
    changedPixelRatio: Number(changedPixelRatio.toFixed(6)),
    maxDiffRatio,
    passed: changedPixelRatio <= maxDiffRatio,
    diffMimeType: diffImage ? "image/png" : null,
    diffImage,
    ...(diffImage
      ? {}
      : { diffImageNote: "Diff image exceeded the evidence size limit." }),
  };
}
