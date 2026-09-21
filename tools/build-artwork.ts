import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { CONFIG } from "../src/config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = resolve(root, "public/base.svg");
const OUT_FILE = resolve(root, "public/artwork.webp");

const { width: baseWidth, maxZoom } = CONFIG.map;

/**
 * Rasterizes base.svg once, at the resolution the old tile pyramid's
 * highest zoom level used to provide (baseWidth * 2^maxZoom) — crisp at
 * the gesture library's maximum zoom, since the SVG scene now just scales
 * this one image via a GPU-composited transform instead of swapping tiles.
 */
async function main(): Promise<void> {
  console.log(`Reading ${SOURCE_SVG}`);
  const svg = readFileSync(SOURCE_SVG);

  const masterWidth = Math.round(baseWidth * 2 ** maxZoom);

  console.log(`Rasterizing at width ${masterWidth} (zoom ${maxZoom})...`);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: masterWidth },
    background: "rgba(255,255,255,0)",
  });

  const unresolved = resvg.imagesToResolve();
  if (unresolved.length > 0) {
    console.log(
      `\n${unresolved.length} embedded image(s) base.svg links to but doesn't include ` +
        `(rendered blank):`,
    );
    for (const href of unresolved) console.log(`  ${href}`);
  }

  const rendered = resvg.render();
  const png = rendered.asPng();

  // Lossless: same pixels as the PNG this replaced, just smaller on disk —
  // this is flat vector illustration, not a photo, so WebP's predictor +
  // entropy coding beats PNG's DEFLATE by a wide margin even losslessly.
  const webp = await sharp(png, { limitInputPixels: false }).webp({ lossless: true }).toBuffer();
  writeFileSync(OUT_FILE, webp);
  console.log(
    `Wrote ${rendered.width}x${rendered.height}, ${(webp.length / 1024 / 1024).toFixed(1)}MB ` +
      `(from ${(png.length / 1024 / 1024).toFixed(1)}MB PNG) -> ${OUT_FILE}`,
  );
}

main();
