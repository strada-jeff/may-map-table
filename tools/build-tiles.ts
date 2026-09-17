import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { CONFIG } from "../src/config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = resolve(root, "public/base.svg");
const OUT_DIR = resolve(root, "public/tiles");

const { tileSize } = CONFIG.tiles;
const { width: baseWidth, height: baseHeight, minZoom, maxZoom } = CONFIG.map;

/**
 * Slices base.svg into a Leaflet-ready raster tile pyramid, one directory
 * per zoom level covering CONFIG.map.minZoom..maxZoom, so the map never
 * has to decode one giant bitmap to stay crisp while zooming (see
 * ArtworkTileLayer for the runtime half of this).
 *
 * File layout is {z}/{x}/{y}.png with (0,0) at the artwork's top-left, like
 * any plain image export — NOT Leaflet's own CRS.Simple tile numbering,
 * which runs negative because latitude increases upward. ArtworkTileLayer
 * is what remaps one to the other at request time.
 */
async function main(): Promise<void> {
  console.log(`Reading ${SOURCE_SVG}`);
  const svg = readFileSync(SOURCE_SVG);

  const masterWidth = Math.round(baseWidth * 2 ** maxZoom);
  const masterHeight = Math.round(baseHeight * 2 ** maxZoom);

  console.log(`Rasterizing at ${masterWidth}x${masterHeight} (zoom ${maxZoom})...`);
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
  const masterPng = rendered.asPng();
  console.log(
    `  rendered ${rendered.width}x${rendered.height}, ` +
      `${(masterPng.length / 1024 / 1024).toFixed(1)}MB\n`,
  );

  rmSync(OUT_DIR, { recursive: true, force: true });

  let tileCount = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const w = Math.round(baseWidth * 2 ** z);
    const h = Math.round(baseHeight * 2 ** z);
    const cols = Math.ceil(w / tileSize);
    const rows = Math.ceil(h / tileSize);
    const paddedW = cols * tileSize;
    const paddedH = rows * tileSize;

    console.log(`zoom ${z}: ${w}x${h} artwork -> ${cols}x${rows} tiles`);

    // Downsampled once per zoom level, then every tile at that level is cut
    // from this same decoded buffer (via .clone()) instead of re-decoding
    // the whole level per tile.
    const levelBuffer = await sharp(masterPng, { limitInputPixels: false })
      .resize(w, h, { fit: "fill" })
      .extend({
        top: paddedH - h,
        left: 0,
        right: paddedW - w,
        bottom: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const level = sharp(levelBuffer, { limitInputPixels: false });

    for (let row = 0; row < rows; row++) {
      const dir = resolve(OUT_DIR, String(z));
      for (let col = 0; col < cols; col++) {
        mkdirSync(resolve(dir, String(col)), { recursive: true });
        await level
          .clone()
          .extract({ left: col * tileSize, top: row * tileSize, width: tileSize, height: tileSize })
          .png({ compressionLevel: 9 })
          .toFile(resolve(dir, String(col), `${row}.png`));
        tileCount++;
      }
    }
  }

  console.log(`\nWrote ${tileCount} tiles to ${OUT_DIR}`);
}

main();
