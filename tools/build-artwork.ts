import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { CONFIG } from "../src/config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = resolve(root, "public/base.svg");
const TILES_DIR = resolve(root, "public/artwork-tiles");

// Must match ArtworkTiles.tsx's GRID_SIZE — each tile then lands at exactly
// the kiosk's native 3840x2160 screen resolution (15360/4, 8640/4), so no
// zoom level ever needs more than a small neighborhood of tiles resident.
const GRID_SIZE = 4;

const { width: baseWidth, maxZoom } = CONFIG.map;

/**
 * Rasterizes base.svg once, at the resolution the old tile pyramid's
 * highest zoom level used to provide (baseWidth * 2^maxZoom) — crisp at
 * the gesture library's maximum zoom — then slices it into a GRID_SIZE x
 * GRID_SIZE grid instead of writing one master image. See ArtworkTiles.tsx
 * for why: the kiosk's NUC has integrated (Iris Xe) graphics sharing
 * system RAM, so holding one ~500MB decoded bitmap resident regardless of
 * pan/zoom position is real, avoidable cost on that hardware — only the
 * tiles intersecting the current viewport are ever mounted at runtime.
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

  if (rendered.width % GRID_SIZE !== 0 || rendered.height % GRID_SIZE !== 0) {
    throw new Error(
      `Rendered size ${rendered.width}x${rendered.height} doesn't divide evenly by ` +
        `GRID_SIZE ${GRID_SIZE} — base.svg's aspect ratio must match CONFIG.map's.`,
    );
  }
  const tileWidth = rendered.width / GRID_SIZE;
  const tileHeight = rendered.height / GRID_SIZE;

  mkdirSync(TILES_DIR, { recursive: true });

  console.log(
    `Slicing ${rendered.width}x${rendered.height} into a ${GRID_SIZE}x${GRID_SIZE} grid ` +
      `(${tileWidth}x${tileHeight} per tile)...`,
  );

  let totalBytes = 0;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Lossless: same reasoning as the single-image version this
      // replaced — flat vector illustration, not a photo. File size isn't
      // the bottleneck here (kiosk hardware, not network), so no reason to
      // trade quality for it.
      const tile = await sharp(png, { limitInputPixels: false })
        .extract({ left: col * tileWidth, top: row * tileHeight, width: tileWidth, height: tileHeight })
        .webp({ lossless: true })
        .toBuffer();
      writeFileSync(resolve(TILES_DIR, `${row}-${col}.webp`), tile);
      totalBytes += tile.length;
    }
  }

  console.log(
    `Wrote ${GRID_SIZE * GRID_SIZE} tiles, ${(totalBytes / 1024 / 1024).toFixed(1)}MB total -> ${TILES_DIR}`,
  );
}

main();
