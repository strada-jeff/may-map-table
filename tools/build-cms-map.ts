import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { CONFIG } from "../src/config";

// Renders base.svg whole into the single image the CMS's map position field
// places pins on, exactly map.width x map.height, one pixel per map unit.
// Not stitched from the tiles: they leave out the art Lottie scenery
// replaces, and the admin has no animations over those holes — editors
// need to see the Celebration Hall to place its pin. Lossy, unlike the
// tiles: it's a placement guide in an admin page, not the kiosk display.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = resolve(root, "public/base.svg");
const OUT = resolve(root, "cms/theme/assets/map.webp");

const { width, height } = CONFIG.map;

const rendered = new Resvg(readFileSync(SOURCE_SVG, "utf8"), {
  fitTo: { mode: "width", value: width },
}).render();
mkdirSync(dirname(OUT), { recursive: true });
const info = await sharp(rendered.asPng(), { limitInputPixels: false })
  .flatten({ background: "#ffffff" })
  .resize(width, height, { fit: "fill" })
  .webp({ quality: 85 })
  .toFile(OUT);
console.log(`Wrote ${OUT.slice(root.length + 1)} (${width}x${height}, ${(info.size / 1024).toFixed(0)}KB)`);
