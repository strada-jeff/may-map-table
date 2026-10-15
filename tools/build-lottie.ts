import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ARTWORK_MAP } from "./lottie/artwork-map";
import { buildLottie, DEFAULT_PAD, type Rig } from "./lottie/lottie";
import { OUTPUT_DIR, ROOT, SOURCE_DIR } from "./lottie/paths";
import { compToMapMatrix, register } from "./lottie/register";
import { loadSvgModel, type SvgModel } from "./lottie/svg-model";
import type { LottieMarkerConfig } from "../src/types/lottie";

const MARKERS_FILE = resolve(ROOT, "src/data/lottie-markers.json");
const BASE_SVG = resolve(ROOT, "public/base.svg");
// Below this the Figma art and base.svg's have visibly drifted apart (or the
// mapping's wrong) — still placed, but called out.
const IOU_WARN = 0.9;

/**
 * Builds src/data/lottie/<name>.json for every recipe in tools/lottie/recipes,
 * from the matching Figma SVG export in tools/lottie/source, and — for
 * scenery listed in artwork-map.ts — fits it over its base.svg art and
 * updates its entry in src/data/lottie-markers.json. Pass names to build a
 * subset: `npm run build:lottie -- car_1 flag_red`. `--no-markers` writes
 * only the animation JSON — no base.svg fitting, markers file untouched —
 * for fast iteration on a recipe (and safe to run several at once).
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const placeMarkers = !args.includes("--no-markers");
  const only = new Set(args.filter((a) => !a.startsWith("--")));
  const recipesDir = resolve(import.meta.dirname, "lottie/recipes");
  const names = readdirSync(recipesDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => basename(f, ".ts"))
    .filter((n) => only.size === 0 || only.has(n));

  const markers = new Map<string, LottieMarkerConfig>(
    (JSON.parse(readFileSync(MARKERS_FILE, "utf8")) as LottieMarkerConfig[]).map((m) => [m.id, m]),
  );
  // Scenery whose mapping was removed shouldn't linger on the map.
  for (const [id, marker] of markers) if (!(marker.file in ARTWORK_MAP)) markers.delete(id);
  let baseSvg: string | null = null;

  for (const name of names) {
    const recipe: { default: (model: SvgModel) => Rig; source?: string } = await import(
      pathToFileURL(resolve(recipesDir, `${name}.ts`)).href
    );
    // A recipe can reuse another piece's export (a recolored variant).
    const model = loadSvgModel(resolve(SOURCE_DIR, `${recipe.source ?? name}.svg`));
    const rig = recipe.default(model);
    const lottie = buildLottie(name, model, rig);
    const json = JSON.stringify(lottie);
    writeFileSync(resolve(OUTPUT_DIR, `${name}.json`), json);
    let line = `${name}: ${model.shapes.length} shapes, ${(json.length / 1024).toFixed(0)}KB`;

    console.log(line);

    const artworkIds = [ARTWORK_MAP[name] ?? []].flat();
    if (!placeMarkers) continue;
    for (const [id] of markers) if (markers.get(id)!.file === name) markers.delete(id);
    for (const [i, artworkId] of artworkIds.entries()) {
      baseSvg ??= readFileSync(BASE_SVG, "utf8");
      const reg = await register(baseSvg, artworkId, model);
      // One marker per placement; repeated pieces (the playgrounds) share a file.
      const id = artworkIds.length > 1 ? `${name}-${i + 1}` : name;
      markers.set(id, {
        id,
        file: name as LottieMarkerConfig["file"],
        size: [lottie.w, lottie.h],
        matrix: compToMapMatrix(reg, rig.pad ?? DEFAULT_PAD) as LottieMarkerConfig["matrix"],
      });
      console.log(
        `  -> ${artworkId} at ${reg.mapBox.x},${reg.mapBox.y} ` +
          `scale ${reg.scale.toFixed(3)} rot ${reg.rotation.toFixed(1)}${reg.mirror ? " mirrored" : ""} ` +
          `fit ${reg.iou.toFixed(3)}${reg.iou < IOU_WARN ? "  <-- check this one" : ""}`,
      );
    }
  }

  if (!placeMarkers) return;
  const sorted = [...markers.values()].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(MARKERS_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
}

main();
