import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { CONFIG } from "../src/config";
import { withoutGroups } from "./lottie/artwork";
import { ALSO_HIDDEN, ARTWORK_MAP } from "./lottie/artwork-map";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = resolve(root, "public/base.svg");
const TILES_DIR = resolve(root, "public/artwork-tiles");

const { width: baseWidth, height: baseHeight, maxZoom } = CONFIG.map;
const { width: tileWidth, height: tileHeight } = CONFIG.tiles;

/**
 * Rasterizes base.svg once, at maxZoom's resolution (baseWidth * 2^maxZoom
 * — crisp at the map's maximum zoom), then writes a tile pyramid from it:
 * level z is that render scaled to baseWidth * 2^z, cut into
 * CONFIG.tiles-sized tiles at public/artwork-tiles/{z}/{row}-{col}.webp.
 *
 * Why a pyramid: the kiosk's NUC has integrated (Iris Xe) graphics sharing
 * system RAM. A single full-resolution level meant every zoomed-out view
 * held the whole ~2GB decoded master and shrank it every frame; with one
 * level per zoom step, ArtworkTiles only ever holds about a screenful of
 * tiles at roughly screen resolution. See ArtworkTiles.tsx.
 */
async function main(): Promise<void> {
  if (baseWidth % tileWidth !== 0 || baseHeight % tileHeight !== 0) {
    throw new Error(
      `CONFIG.tiles ${tileWidth}x${tileHeight} doesn't divide CONFIG.map ` +
        `${baseWidth}x${baseHeight} evenly.`,
    );
  }

  console.log(`Reading ${SOURCE_SVG}`);
  // Art that animated Lottie scenery stands in for (tools/lottie/artwork-map.ts)
  // comes out before rasterizing, or it'd show through/around the animation.
  // base.svg itself stays untouched.
  const hidden = [...Object.values(ARTWORK_MAP), ...Object.values(ALSO_HIDDEN)].flat();
  console.log(`Leaving out ${hidden.length} group(s) replaced by Lottie scenery: ${hidden.join(", ")}`);
  const svg = withoutGroups(readFileSync(SOURCE_SVG, "utf8"), hidden);

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
  if (rendered.width !== masterWidth || rendered.height !== baseHeight * 2 ** maxZoom) {
    throw new Error(
      `Rendered size ${rendered.width}x${rendered.height} isn't ` +
        `${masterWidth}x${baseHeight * 2 ** maxZoom} — base.svg's aspect ratio must match CONFIG.map's.`,
    );
  }
  // Decoded once to raw pixels; every level is resized from this.
  const master = await sharp(rendered.asPng(), { limitInputPixels: false }).raw().toBuffer();
  const masterRaw = { width: rendered.width, height: rendered.height, channels: 4 as const };

  rmSync(TILES_DIR, { recursive: true, force: true });

  let totalTiles = 0;
  let totalBytes = 0;
  for (let z = 0; z <= maxZoom; z++) {
    const width = baseWidth * 2 ** z;
    const height = baseHeight * 2 ** z;
    const cols = width / tileWidth;
    const rows = height / tileHeight;
    console.log(`Level ${z}: ${width}x${height}, ${cols}x${rows} tiles...`);

    const level =
      z === maxZoom
        ? master
        : await sharp(master, { raw: masterRaw, limitInputPixels: false })
            .resize(width, height)
            .raw()
            .toBuffer();
    const levelRaw = { width, height, channels: 4 as const };

    const dir = resolve(TILES_DIR, String(z));
    mkdirSync(dir, { recursive: true });
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Lossless: flat vector illustration, not a photo. File size isn't
        // the bottleneck here (kiosk hardware, not network), so no reason
        // to trade quality for it.
        const tile = await sharp(level, { raw: levelRaw, limitInputPixels: false })
          .extract({ left: col * tileWidth, top: row * tileHeight, width: tileWidth, height: tileHeight })
          .webp({ lossless: true })
          .toBuffer();
        writeFileSync(resolve(dir, `${row}-${col}.webp`), tile);
        totalTiles++;
        totalBytes += tile.length;
      }
    }
  }

  console.log(
    `Wrote ${totalTiles} tiles over ${maxZoom + 1} levels, ` +
      `${(totalBytes / 1024 / 1024).toFixed(1)}MB total -> ${TILES_DIR}`,
  );
}

main();
