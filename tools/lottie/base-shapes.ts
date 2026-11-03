import paper from "paper/dist/paper-core";
import { parseSvg } from "./artwork";
import { parseColor, type Shape, type Stroke } from "./svg-model";

/**
 * A base.svg group as Lottie-ready shapes, in map units — the Illustrator
 * counterpart of svg-model's Figma loader, for FOREGROUND art
 * (artwork-map.ts) baked into an animation. Illustrator's export styles by
 * class (`<style>` rules, "Internal CSS"), clips with `clip-path` classes
 * whose clip paths are plain rects/polygons, and bakes transforms into the
 * geometry; anything outside that vocabulary throws rather than drawing
 * wrong.
 *
 * `index` is left at -1: buildLottie numbers foreground shapes itself.
 */
export function baseShapes(baseSvg: string, id: string): Shape[] {
  const doc = parseSvg(baseSvg);
  const target = doc.getElementById(id);
  if (!target) throw new Error(`base.svg has no element with id "${id}"`);

  const rules = new Map<string, Record<string, string>>();
  for (const style of Array.from(doc.querySelectorAll("style")) as Element[]) {
    for (const [, selectors, body] of (style.textContent ?? "").matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const declarations = Object.fromEntries(
        body
          .split(";")
          .map((d) => d.split(":").map((s) => s.trim()))
          .filter((d) => d.length === 2 && d[0]),
      );
      for (const selector of selectors.split(",").map((s) => s.trim())) {
        const name = /^\.([\w-]+)$/.exec(selector)?.[1];
        if (name) rules.set(name, { ...rules.get(name), ...declarations });
      }
    }
  }

  const PROPS = [
    "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "stroke-miterlimit", "stroke-opacity", "opacity", "clip-path", "clip-rule", "display", "mix-blend-mode",
  ];
  const styleOf = (el: Element): Record<string, string> => {
    const style: Record<string, string> = {};
    for (const name of (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)) Object.assign(style, rules.get(name));
    for (const prop of PROPS) {
      const value = el.getAttribute(prop);
      if (value !== null) style[prop] = value;
    }
    return style;
  };

  const clipOf = (ref: string): paper.PathItem => {
    const clip = doc.getElementById(ref);
    if (!clip) throw new Error(`base.svg: missing clip path ${ref}`);
    let union: paper.PathItem | null = null;
    for (const child of Array.from(clip.children) as Element[]) {
      const item = geometry(child, styleOf(child)["clip-rule"] === "evenodd");
      union = union ? union.unite(item) : item;
    }
    if (!union) throw new Error(`base.svg: empty clip path ${ref}`);
    return union;
  };

  const shapes: Shape[] = [];
  const walk = (el: Element, ancestors: string[], opacity: number, clip: paper.PathItem | null) => {
    const tag = el.tagName.toLowerCase();
    if (el.getAttribute("transform")) throw new Error(`base.svg: unexpected transform on <${tag}> in ${id}`);
    const style = styleOf(el);
    if (style.display === "none") return;
    if (style["mix-blend-mode"] && style["mix-blend-mode"] !== "normal") {
      throw new Error(`base.svg: unsupported blend mode ${style["mix-blend-mode"]} in ${id}`);
    }
    const ownOpacity = opacity * Number(style.opacity ?? 1);
    const clipRef = style["clip-path"]?.match(/url\(#(.+)\)/)?.[1];
    const ownClip = clipRef ? (clip ? clip.intersect(clipOf(clipRef)) : clipOf(clipRef)) : clip;

    if (tag === "g") {
      const elId = el.getAttribute("id");
      for (const child of Array.from(el.children) as Element[]) {
        walk(child, elId && el !== target ? [...ancestors, elId] : ancestors, ownOpacity, ownClip);
      }
      return;
    }
    if (!["path", "rect", "polygon", "polyline", "line", "circle", "ellipse"].includes(tag)) {
      throw new Error(`base.svg: unsupported element <${tag}> in ${id}`);
    }

    const evenOdd = style["fill-rule"] === "evenodd";
    const fill = style.fill ?? "#000"; // SVG's default fill
    const stroke = style.stroke && style.stroke !== "none" ? style.stroke : null;
    const shapeId = el.getAttribute("id") ?? tag;

    // A filled shape that's also stroked becomes two shapes, fill beneath, as SVG paints them.
    if (fill !== "none" && tag !== "line" && tag !== "polyline") {
      let path = geometry(el, evenOdd);
      if (ownClip) path = path.intersect(ownClip);
      if (!path.isEmpty()) {
        shapes.push(shape(shapeId, ancestors, path, parseColor(fill), ownOpacity * Number(style["fill-opacity"] ?? 1), evenOdd));
      }
    }
    if (stroke) {
      const width = parseFloat(style["stroke-width"] ?? "1");
      const strokeStyle: Stroke = {
        width,
        cap: (style["stroke-linecap"] ?? "butt") as Stroke["cap"],
        join: (style["stroke-linejoin"] ?? "miter") as Stroke["join"],
        miterLimit: Number(style["stroke-miterlimit"] ?? 4),
      };
      const color = parseColor(stroke);
      const strokeOpacity = ownOpacity * Number(style["stroke-opacity"] ?? 1);
      const path = geometry(el, false);
      if (ownClip) {
        // SVG clips the stroke's painted area, not its centerline (a
        // mullion at a clip's edge keeps only half its width), so a clipped
        // stroke becomes its outline, filled and clipped like any fill.
        const outline = strokeOutline(path, strokeStyle, id).intersect(ownClip);
        if (!outline.isEmpty()) shapes.push(shape(shapeId, ancestors, outline, color, strokeOpacity, false));
      } else {
        shapes.push({ ...shape(shapeId, ancestors, path, color, strokeOpacity, false), stroke: strokeStyle });
      }
    }
  };
  walk(target, [], 1, null);
  return shapes;
}

/** Moves shapes by an affine matrix (CSS matrix() order) — uniform scale only, which stroke widths follow. */
export function transformShapes(shapes: Shape[], [a, b, c, d, e, f]: number[]): Shape[] {
  const matrix = new paper.Matrix(a, b, c, d, e, f);
  const scale = Math.sqrt(Math.abs(a * d - b * c));
  return shapes.map((s) => {
    const path = s.path.clone({ insert: false });
    path.transform(matrix);
    const stroke = s.stroke ? { ...s.stroke, width: s.stroke.width * scale } : undefined;
    const box = stroke ? path.bounds.expand(stroke.width) : path.bounds;
    return { ...s, path, stroke, bbox: { x: box.x, y: box.y, width: box.width, height: box.height } };
  });
}

function shape(id: string, ancestors: string[], path: paper.PathItem, fill: Shape["fill"], opacity: number, evenOdd: boolean): Shape {
  const b = path.bounds;
  return { index: -1, id, ancestors, path, fill, opacity, evenOdd, bbox: { x: b.x, y: b.y, width: b.width, height: b.height } };
}

/**
 * A straight-sided stroke's painted area as a filled shape: a rectangle
 * along each segment, run on by half the width at corners (a right-angle
 * miter join, which is all the building art has) and at square-capped
 * ends. Curved strokes would need real offsetting; they throw instead.
 */
function strokeOutline(path: paper.PathItem, stroke: Stroke, id: string): paper.PathItem {
  if (stroke.cap === "round" || stroke.join !== "miter") {
    throw new Error(`base.svg: clipped ${stroke.cap}-capped/${stroke.join}-joined stroke in ${id} isn't supported`);
  }
  const half = stroke.width / 2;
  const capRun = stroke.cap === "square" ? half : 0;
  const subpaths = path instanceof paper.CompoundPath ? (path.children as paper.Path[]) : [path as paper.Path];
  let outline: paper.PathItem | null = null;
  for (const sub of subpaths) {
    sub.curves.forEach((curve, i) => {
      if (!curve.isStraight()) throw new Error(`base.svg: clipped curved stroke in ${id} isn't supported`);
      const along = curve.point2.subtract(curve.point1);
      if (along.length === 0) return;
      const dir = along.normalize();
      const normal = dir.rotate(90, new paper.Point(0, 0)).multiply(half);
      const start = curve.point1.subtract(dir.multiply(!sub.closed && i === 0 ? capRun : half));
      const end = curve.point2.add(dir.multiply(!sub.closed && i === sub.curves.length - 1 ? capRun : half));
      const piece = new paper.Path({
        segments: [start.add(normal), end.add(normal), end.subtract(normal), start.subtract(normal)],
        closed: true,
        insert: false,
      });
      outline = outline ? outline.unite(piece) : piece;
    });
  }
  return outline ?? new paper.Path({ insert: false });
}

function geometry(el: Element, evenOdd: boolean): paper.PathItem {
  const n = (attr: string) => Number(el.getAttribute(attr) ?? 0);
  const points = () =>
    (el.getAttribute("points") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .reduce<number[][]>((pairs, v, i) => (i % 2 ? (pairs[pairs.length - 1].push(v), pairs) : [...pairs, [v]]), []);
  let item: paper.PathItem;
  switch (el.tagName.toLowerCase()) {
    case "path":
      item = paper.PathItem.create(el.getAttribute("d")!);
      break;
    case "rect": {
      const rx = n("rx") || n("ry");
      item = new paper.Path.Rectangle({ point: [n("x"), n("y")], size: [n("width"), n("height")], radius: rx, insert: false });
      break;
    }
    case "polygon":
    case "polyline":
      item = new paper.Path({ segments: points(), closed: el.tagName.toLowerCase() === "polygon", insert: false });
      break;
    case "line":
      item = new paper.Path({ segments: [[n("x1"), n("y1")], [n("x2"), n("y2")]], insert: false });
      break;
    case "circle":
      item = new paper.Path.Circle({ center: [n("cx"), n("cy")], radius: n("r"), insert: false });
      break;
    case "ellipse":
      item = new paper.Path.Ellipse({ center: [n("cx"), n("cy")], radius: [n("rx"), n("ry")], insert: false });
      break;
    default:
      throw new Error(`base.svg: no geometry for <${el.tagName}>`);
  }
  item.fillRule = evenOdd ? "evenodd" : "nonzero";
  return item;
}
