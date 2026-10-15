import { readFileSync } from "node:fs";
import { DOMParser } from "linkedom";
import paper from "paper/dist/paper-core";

paper.setup(new paper.Size(1, 1));

export type Rgb = [number, number, number];

/** Set on a stroked (rather than filled) shape; `fill` is then its stroke color. */
export type Stroke = { width: number; cap: "butt" | "round" | "square"; join: "miter" | "round" | "bevel"; miterLimit: number };

/**
 * One painted path from a Figma SVG export, flattened: its clip-path-group
 * masks already intersected into the geometry and its ancestors' opacity
 * multiplied in. The pieces on Figma's "Animated Elements" page are solid
 * fills plus a few solid strokes (strings, outlines) — no gradients — so
 * this is the whole vocabulary the Lottie converter needs.
 */
export type Shape = {
  /** Sequential, painter's order (0 = bottom). Stable across re-exports only if Figma's layer order is. */
  index: number;
  /** Figma layer name as exported by svgIdAttribute, e.g. "Vector_12" or "color". */
  id: string;
  /** Ids of the enclosing <g>s, outermost first, below the exported frame itself. */
  ancestors: string[];
  path: paper.PathItem;
  /** Fill color, or the stroke color when `stroke` is set. */
  fill: Rgb;
  stroke?: Stroke;
  opacity: number;
  evenOdd: boolean;
  bbox: { x: number; y: number; width: number; height: number };
};

export type SvgModel = { width: number; height: number; shapes: Shape[] };

const SKIP_GROUP_IDS = new Set(["Elements", "interactive", "map illustration"]);

export function loadSvgModel(file: string): SvgModel {
  const doc = new DOMParser().parseFromString(readFileSync(file, "utf8"), "image/svg+xml");
  const svg = doc.documentElement;
  const width = Number(svg.getAttribute("width"));
  const height = Number(svg.getAttribute("height"));

  const masks = new Map<string, paper.PathItem>();
  for (const mask of svg.querySelectorAll("mask")) {
    let union: paper.PathItem | null = null;
    for (const p of mask.querySelectorAll("path")) {
      const item = toPathItem(p.getAttribute("d")!, p.getAttribute("fill-rule") === "evenodd");
      union = union ? union.unite(item) : item;
    }
    if (union) masks.set(mask.getAttribute("id")!, union);
  }

  const shapes: Shape[] = [];

  const walk = (el: Element, ancestors: string[], opacity: number, clip: paper.PathItem | null) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "mask" || tag === "defs" || tag === "pattern" || tag === "image") continue;
      const id = child.getAttribute("id") ?? "";
      const ownOpacity = Number(child.getAttribute("opacity") ?? 1);
      let childClip = clip;
      const maskRef = child.getAttribute("mask")?.match(/url\(#(.+)\)/)?.[1];
      if (maskRef) {
        const mask = masks.get(maskRef);
        if (!mask) throw new Error(`${file}: missing mask ${maskRef}`);
        childClip = clip ? clip.intersect(mask) : mask;
      }
      if (tag === "g") {
        const nextAncestors = SKIP_GROUP_IDS.has(id) || id === "" ? ancestors : [...ancestors, id];
        walk(child, nextAncestors, opacity * ownOpacity, childClip);
      } else if (tag === "rect" && !id) {
        // Figma's export backdrop (frame fill + page background): not art.
        continue;
      } else if (tag === "rect" && child.getAttribute("fill")?.startsWith("url(")) {
        // Embedded raster fills (a couple of faint ~10px texture swatches on
        // the whole page) have no Lottie-shape equivalent; say so rather
        // than drop them silently.
        console.warn(`${file}: dropped image-filled rect "${id}"`);
        continue;
      } else if (tag === "path" || tag === "rect") {
        if (child.getAttribute("transform")) throw new Error(`${file}: unexpected transform on ${id}`);
        const fill = child.getAttribute("fill");
        const strokeColor = child.getAttribute("stroke");
        const stroked = !!strokeColor && strokeColor !== "none";
        if ((!fill || fill === "none") && !stroked) continue;
        if (stroked && fill && fill !== "none") throw new Error(`${file}: ${id} is both filled and stroked`);
        const evenOdd = child.getAttribute("fill-rule") === "evenodd";
        let path = tag === "rect" ? rectPath(child) : toPathItem(child.getAttribute("d")!, evenOdd);
        if (childClip) {
          // trace: false keeps an open stroke path open — just the pieces inside the clip.
          path = path.intersect(childClip, stroked ? { trace: false } : undefined);
          if (path.isEmpty()) continue;
        }
        // Stroke bbox includes half the width, so recipes see what's painted.
        const b = stroked
          ? path.bounds.expand(Number(child.getAttribute("stroke-width") ?? 1))
          : path.bounds;
        shapes.push({
          index: shapes.length,
          id,
          ancestors,
          path,
          fill: parseColor(stroked ? strokeColor : fill!),
          ...(stroked
            ? {
                stroke: {
                  width: Number(child.getAttribute("stroke-width") ?? 1),
                  cap: (child.getAttribute("stroke-linecap") ?? "butt") as Stroke["cap"],
                  join: (child.getAttribute("stroke-linejoin") ?? "miter") as Stroke["join"],
                  miterLimit: Number(child.getAttribute("stroke-miterlimit") ?? 4),
                },
              }
            : {}),
          opacity:
            opacity * ownOpacity * Number(child.getAttribute(stroked ? "stroke-opacity" : "fill-opacity") ?? 1),
          evenOdd,
          bbox: { x: b.x, y: b.y, width: b.width, height: b.height },
        });
      } else {
        throw new Error(`${file}: unsupported element <${tag}> (${id})`);
      }
    }
  };

  // The export wraps the frame in Elements > (interactive|map illustration) > <frame>;
  // the frame's own <g> is dropped from ancestors so recipes see only its inner groups.
  const frameGroup = svg.querySelector("g#Elements > g > g");
  if (!frameGroup) throw new Error(`${file}: no frame group found`);
  walk(frameGroup, [], 1, null);

  return { width, height, shapes };
}

function rectPath(el: Element): paper.PathItem {
  const n = (attr: string) => Number(el.getAttribute(attr) ?? 0);
  return new paper.Path.Rectangle({
    point: [n("x"), n("y")],
    size: [n("width"), n("height")],
    radius: n("rx"),
    insert: false,
  });
}

function toPathItem(d: string, evenOdd: boolean): paper.PathItem {
  const item = paper.PathItem.create(d);
  item.fillRule = evenOdd ? "evenodd" : "nonzero";
  return item;
}

function parseColor(value: string): Rgb {
  if (value === "white") return [1, 1, 1];
  if (value === "black") return [0, 0, 0];
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) throw new Error(`unsupported fill ${value}`);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
}
