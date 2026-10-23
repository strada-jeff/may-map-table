import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { CONFIG } from "../src/config";

// Stitches the artwork pyramid's zoom-0 level (build-artwork's tiles,
// exactly map.width x map.height, one pixel per map unit) into the single
// image the CMS's map position field places pins on. Lossy, unlike the
// tiles: it's a placement guide in an admin page, not the kiosk display.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TILES = resolve(root, "public/artwork-tiles/0");
const OUT = resolve(root, "cms/theme/assets/map.webp");

const { width, height } = CONFIG.map;
const { width: tileWidth, height: tileHeight } = CONFIG.tiles;

const tiles: OverlayOptions[] = [];
for (let row = 0; row < height / tileHeight; row++) {
  for (let col = 0; col < width / tileWidth; col++) {
    tiles.push({ input: resolve(TILES, `${row}-${col}.webp`), left: col * tileWidth, top: row * tileHeight });
  }
}

mkdirSync(dirname(OUT), { recursive: true });
const info = await sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
  .composite(tiles)
  .webp({ quality: 85 })
  .toFile(OUT);
console.log(`Wrote ${OUT.slice(root.length + 1)} (${width}x${height}, ${(info.size / 1024).toFixed(0)}KB)`);
