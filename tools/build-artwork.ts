import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { CONFIG } from "../src/config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = resolve(root, "public/base.svg");
const OUT_FILE = resolve(root, "public/artwork.png");

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
  writeFileSync(OUT_FILE, png);
  console.log(
    `Wrote ${rendered.width}x${rendered.height}, ${(png.length / 1024 / 1024).toFixed(1)}MB -> ${OUT_FILE}`,
  );
}

main();
