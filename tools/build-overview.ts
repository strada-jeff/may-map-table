import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { CONFIG } from "../src/config";

// Renders base.svg whole into the minimap's image (CompassControl). Unlike
// the tiles, nothing is left out: the minimap has no Lottie scenery over it,
// so the art those animations replace stays in. CompassControl shows it
// object-cover in a 400px square, so it's rendered taller than that to stay
// sharp, at the artwork's own aspect ratio, which CompassControl's crop math
// assumes.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = resolve(root, "public/base.svg");
const OUT = resolve(root, "public/overview.jpg");

const WIDTH = 960;
const height = Math.round((WIDTH * CONFIG.map.height) / CONFIG.map.width);

const rendered = new Resvg(readFileSync(SOURCE_SVG, "utf8"), {
  fitTo: { mode: "width", value: WIDTH },
}).render();
const info = await sharp(rendered.asPng())
  .flatten({ background: "#ffffff" })
  .resize(WIDTH, height, { fit: "fill" })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(OUT);
console.log(`Wrote ${OUT.slice(root.length + 1)} (${WIDTH}x${height}, ${(info.size / 1024).toFixed(0)}KB)`);
