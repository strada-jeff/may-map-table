import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import paper from "paper/dist/paper-core";
import { loadSvgModel, type Shape } from "./svg-model";
import { SOURCE_DIR } from "./paths";

/**
 * Recipe-authoring aid: most Figma layers are just "Vector_N", so parts
 * (wheels, legs, hair) get picked by index/bbox. Prints every shape and
 * renders a scaled PNG to the scratch dir — either labeled with indices, or
 * with a selection highlighted so a recipe's picks can be eyeballed.
 *
 *   npx tsx tools/lottie/inspect.ts car_1 [--scale 8] [--hl 3,5,10-14] [--out dir]
 */
const args = process.argv.slice(2);
const name = args[0];
const flag = (key: string) => {
  const i = args.indexOf(key);
  return i >= 0 ? args[i + 1] : undefined;
};
const scale = Number(flag("--scale") ?? 8);
const outDir = flag("--out") ?? resolve(process.cwd(), "node_modules/.tmp/lottie-inspect");
const highlight = parseRanges(flag("--hl"));

const model = loadSvgModel(resolve(SOURCE_DIR, `${name}.svg`));

for (const s of model.shapes) {
  const { x, y, width, height } = s.bbox;
  console.log(
    `${String(s.index).padStart(3)}  ${s.id.padEnd(12)} ${hex(s)}  ` +
      `x=${x.toFixed(1)} y=${y.toFixed(1)} w=${width.toFixed(1)} h=${height.toFixed(1)}` +
      `${s.path instanceof paper.CompoundPath ? ` sub=${s.path.children.length}` : ""}` +
      `${s.opacity < 1 ? ` op=${s.opacity.toFixed(2)}` : ""}${s.stroke ? ` stroke=${s.stroke.width}` : ""}  ${s.ancestors.join(" > ")}`,
  );
}

const body = model.shapes
  .map((s) => {
    const color = highlight ? (highlight.has(s.index) ? "#ff00aa" : `${hex(s)}`) : hex(s);
    const op = highlight && !highlight.has(s.index) ? s.opacity * 0.25 : s.opacity;
    return s.stroke
      ? `<path d="${s.path.pathData}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${s.stroke.width}" stroke-linecap="${s.stroke.cap}" stroke-linejoin="${s.stroke.join}"/>`
      : `<path d="${s.path.pathData}" fill="${color}" fill-opacity="${op}" fill-rule="${s.evenOdd ? "evenodd" : "nonzero"}"/>`;
  })
  .join("\n");

const labels = highlight
  ? ""
  : model.shapes
      .filter((s) => s.bbox.width * s.bbox.height > 4)
      .map((s) => {
        const cx = s.bbox.x + s.bbox.width / 2;
        const cy = s.bbox.y + s.bbox.height / 2;
        return `<text x="${cx}" y="${cy}" font-size="${12 / scale}" fill="#000" stroke="#fff" stroke-width="${2 / scale}" paint-order="stroke" text-anchor="middle" dominant-baseline="middle" font-family="Arial">${s.index}</text>`;
      })
      .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${model.width}" height="${model.height}" viewBox="0 0 ${model.width} ${model.height}"><rect width="100%" height="100%" fill="#dfdfdf"/>${body}${labels}</svg>`;
const png = new Resvg(svg, {
  fitTo: { mode: "zoom", value: scale },
  font: { loadSystemFonts: true },
}).render().asPng();
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, `${name}${highlight ? "-hl" : ""}.png`);
writeFileSync(out, png);
console.log(`\n${model.shapes.length} shapes -> ${out}`);

function hex(s: Shape): string {
  return `#${s.fill.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`;
}

function parseRanges(spec: string | undefined): Set<number> | null {
  if (!spec) return null;
  const set = new Set<number>();
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-").map(Number);
    for (let i = a; i <= (b ?? a); i++) set.add(i);
  }
  return set;
}
