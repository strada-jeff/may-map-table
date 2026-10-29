import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import type { ArtworkPiece } from "../src/types/artwork";
import { onlyGroup, parseSvg } from "./lottie/artwork";
import { ALSO_HIDDEN, ARTWORK_MAP } from "./lottie/artwork-map";

// Cuts every "PIN " layer out of base.svg (README: Artwork naming) as its
// own SVG, for the CMS's Artwork field: the details panel shows it, and
// while directions to its pin are on it's drawn over the dim overlay.
//
//   public/artwork-pieces/<id>.svg      the whole piece (details panel)
//   public/artwork-pieces/<id>.map.svg  without the art Lottie scenery
//                                       replaces (on the map, where the
//                                       animation shows instead)
//   src/data/generated/artwork.json     the catalog the app reads
//   cms/theme/assets/artwork.json       the Artwork field's choices
//   cms/theme/assets/artwork/<id>.svg   the whole pieces again, for the
//                                       field's preview (the CMS's map
//                                       image is built from the tiles, so
//                                       it lacks the animated parts)
//
// Each SVG keeps only the defs and style rules its piece uses, and its
// viewBox is the piece's painted bounds in map units, so it sits on the map
// at `box`.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_SVG = resolve(root, "public/base.svg");
const OUT_DIR = resolve(root, "public/artwork-pieces");
const CATALOG = resolve(root, "src/data/generated/artwork.json");
const CMS_CATALOG = resolve(root, "cms/theme/assets/artwork.json");
const CMS_DIR = resolve(root, "cms/theme/assets/artwork");

const PREFIX = "PIN_";
const PAD = 2; // map units around the painted bounds, for antialiased edges

const REFERENCES = /url\(#([^)]+)\)|href="#([^"]+)"/g;
const DEFINITIONS = new Set(["clippath", "mask", "lineargradient", "radialgradient", "symbol", "pattern", "filter"]);

/**
 * Drops defs nothing in the piece references, and style rules for classes
 * it doesn't use. References run both ways — an element's class pulls in a
 * style rule whose `url(#...)` pulls in a clip path whose children have
 * classes of their own — so it follows them until nothing new turns up.
 */
function prune(source: string): string {
  const doc = parseSvg(source);
  const all = Array.from(doc.querySelectorAll("*")) as Element[];
  const isDefinition = (el: Element) => DEFINITIONS.has(el.tagName.toLowerCase());
  const insideDefinition = (el: Element) => {
    for (let node = el.parentElement; node; node = node.parentElement) if (isDefinition(node)) return true;
    return false;
  };
  const styles = Array.from(doc.querySelectorAll("style")) as Element[];
  const rules = styles.flatMap((style) =>
    Array.from((style.textContent ?? "").matchAll(/([^{}]+)\{([^}]*)\}/g), ([, selectors, body]) => ({
      selectors: selectors.split(",").map((s) => s.trim()),
      body,
    })),
  );
  const classOf = (selector: string) => /^\.([\w-]+)$/.exec(selector)?.[1];

  const used = new Set<string>();
  const classes = new Set<string>();
  const seenRules = new Set<number>();
  const queue = all.filter((el) => !isDefinition(el) && !insideDefinition(el) && el.tagName.toLowerCase() !== "style");
  const reference = (text: string) => {
    for (const match of text.matchAll(REFERENCES)) {
      const id = match[1] ?? match[2];
      if (used.has(id)) continue;
      used.add(id);
      const target = doc.getElementById(id);
      if (target) queue.push(target, ...(Array.from(target.querySelectorAll("*")) as Element[]));
    }
  };
  for (let i = 0; i < queue.length; i++) {
    const el = queue[i];
    for (const attr of Array.from(el.attributes)) reference(attr.value);
    for (const name of (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)) {
      if (classes.has(name)) continue;
      classes.add(name);
      rules.forEach((rule, r) => {
        if (seenRules.has(r) || !rule.selectors.some((s) => classOf(s) === name)) return;
        seenRules.add(r);
        reference(rule.body);
      });
    }
  }

  for (const el of all) if (isDefinition(el) && !used.has(el.getAttribute("id") ?? "")) el.remove();
  for (const style of styles) {
    style.textContent = (style.textContent ?? "").replace(/([^{}]+)\{([^}]*)\}/g, (_, selectors: string, body: string) => {
      const kept = selectors.split(",").map((s) => s.trim()).filter((s) => {
        const name = classOf(s);
        return name === undefined || classes.has(name);
      });
      return kept.length ? `\n      ${kept.join(", ")} {${body}}` : "";
    });
  }
  return doc.toString();
}

function withoutIds(source: string, ids: string[]): string {
  const doc = parseSvg(source);
  for (const id of ids) doc.getElementById(id)?.remove();
  return doc.toString();
}

/** Painted bounds in map units (1-unit precision), or null when nothing paints. */
function bounds(svg: string): [number, number, number, number] | null {
  const { width, height, pixels } = new Resvg(svg, { background: "rgba(0,0,0,0)" }).render();
  let l = width, t = height, r = -1, b = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      if (x < l) l = x;
      if (x > r) r = x;
      if (y < t) t = y;
      if (y > b) b = y;
    }
  }
  return r < 0 ? null : [l, t, r + 1, b + 1];
}

function cropTo(svg: string, [x, y, width, height]: ArtworkPiece["box"]): string {
  return svg
    .replace(/viewBox="[^"]*"/, `viewBox="${x} ${y} ${width} ${height}"`)
    .replace(/ width="[\d.]+" height="[\d.]+"/, ` width="${width}" height="${height}"`);
}

function main(): void {
  const source = readFileSync(SOURCE_SVG, "utf8");
  const doc = parseSvg(source);
  const ids = (Array.from(doc.querySelectorAll(`[id^="${PREFIX}"]`)) as Element[]).map((el) => el.getAttribute("id")!);
  if (ids.length === 0) throw new Error(`base.svg has no "${PREFIX}" layers (README: Artwork naming).`);

  // Lottie scenery by the base.svg group it replaces, with the marker id
  // build-lottie gives it.
  const scenery = Object.entries(ARTWORK_MAP).flatMap(([name, groups]) => {
    const list = [groups].flat();
    return list.map((group, i) => ({
      group,
      marker: list.length > 1 ? `${name}-${i + 1}` : name,
      hidden: [group, ...(ALSO_HIDDEN[name] ?? [])],
    }));
  });

  for (const dir of [OUT_DIR, CMS_DIR]) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }

  const pieces: ArtworkPiece[] = [];
  for (const id of ids) {
    const element = doc.getElementById(id)!;
    const inside = scenery.filter(({ group }) => {
      const el = doc.getElementById(group);
      return el && (el === element || element.contains(el));
    });

    const whole = prune(onlyGroup(source, id));
    const painted = bounds(whole);
    if (!painted) {
      console.log(`  ${id}: paints nothing, skipped`);
      continue;
    }
    const [l, t, r, b] = painted;
    const box: ArtworkPiece["box"] = [l - PAD, t - PAD, r - l + 2 * PAD, b - t + 2 * PAD];
    const cut = cropTo(whole, box);
    writeFileSync(resolve(OUT_DIR, `${id}.svg`), cut);
    writeFileSync(resolve(CMS_DIR, `${id}.svg`), cut);

    // Without the animated parts, for the map. Absent when the animation
    // covers the whole piece; the same file when there's none.
    let map: ArtworkPiece["map"] = "whole";
    if (inside.length) {
      const rest = prune(withoutIds(whole, inside.flatMap((s) => s.hidden)));
      map = bounds(rest) ? "separate" : "none";
      if (map === "separate") writeFileSync(resolve(OUT_DIR, `${id}.map.svg`), cropTo(rest, box));
    }

    pieces.push({ id, label: id.slice(PREFIX.length).replace(/_/g, " "), box, map, lottie: inside.map((s) => s.marker) });
    console.log(`  ${id}: ${box.map(Math.round).join(",")}${inside.length ? `, animated: ${inside.map((s) => s.marker).join(", ")}` : ""}`);
  }

  pieces.sort((a, b) => a.label.localeCompare(b.label));
  mkdirSync(dirname(CATALOG), { recursive: true });
  writeFileSync(CATALOG, JSON.stringify(pieces, null, 2) + "\n");
  writeFileSync(CMS_CATALOG, JSON.stringify(pieces.map(({ id, label, box }) => ({ id, label, box }))) + "\n");
  console.log(`Wrote ${pieces.length} pieces -> ${OUT_DIR.slice(root.length + 1)}, catalog -> ${CATALOG.slice(root.length + 1)}`);
}

main();
