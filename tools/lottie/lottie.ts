import paper from "paper/dist/paper-core";
import type { Shape, SvgModel } from "./svg-model";

export type Vec = [number, number];

/**
 * A property that's either constant or a function of the frame number,
 * sampled into keyframes every `step` frames. `hold` emits hold (stepped)
 * keyframes instead of linear ones — the stop-motion look the Figma notes
 * ask for on the radiating "lines". Functions must be periodic over the
 * rig's `frames` so the loop is seamless; the last keyframe is always
 * sampled at `frames` itself.
 */
export type Sampled<T> = { fn: (frame: number) => T; step?: number; hold?: boolean };
export type Anim<T> = T | Sampled<T>;

export type Part = {
  name: string;
  /** Shape indices (see inspect.ts) or a predicate. Empty = a pure transform node in a parent chain. */
  select: number[] | ((s: Shape) => boolean);
  /** Another part's name; this part's transform is applied inside that one's. */
  parent?: string;
  /** Pivot for rotation/scale, in frame (comp) coordinates. */
  pivot?: Vec;
  /** Offset from rest, in parent space. */
  offset?: Anim<Vec>;
  /** Degrees, clockwise. */
  rotation?: Anim<number>;
  /** Percent, [x, y]. */
  scale?: Anim<Vec>;
  /** Percent. */
  opacity?: Anim<number>;
  /**
   * Per-vertex displacement in comp coordinates (flag ripple, kite tail).
   * `rigid` instead moves each subpath as a whole by the displacement at its
   * center — far smaller output for scatters of tiny shapes (the flag's
   * texture dots) that ride a deformation without needing to bend.
   */
  deform?: { fn: (x: number, y: number, frame: number) => Vec; step?: number; rigid?: boolean };
  /**
   * Per-subpath fill opacity (percent), given the subpath's center and its
   * running index across this part's shapes in painter's order — for
   * compound paths that are really many small things, like the neon M's
   * bulbs (one dashed-stroke outline each) flashing in sequence.
   */
  subpathOpacity?: (center: Vec, index: number) => Anim<number>;
  /** Emitted as the shape layer's `cl`, which lottie-web's SVG renderer puts on the layer's <g> as a class. */
  className?: string;
};

export type Rig = {
  frames: number;
  fps?: number;
  parts: Part[];
  /** Shapes dropped from the output entirely (e.g. the balloon's "c" text, re-added at runtime). */
  exclude?: number[];
  /**
   * Transparent margin added on every side of the comp, in frame pixels.
   * lottie-web clips its root to the comp size, and the Figma frames are
   * cropped tight to the art, so anything that moves outward (a bounce,
   * the expanding lines) would otherwise get shaved off. Placement
   * subtracts it back out.
   */
  pad?: number;
};

export const DEFAULT_PAD = 6;

type LottieLayer = Record<string, unknown>;

const LINEAR = { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } };

export function buildLottie(name: string, model: SvgModel, rig: Rig) {
  const fps = rig.fps ?? 30;
  const op = rig.frames;
  const partsByName = new Map(rig.parts.map((p) => [p.name, p]));
  const exclude = new Set(rig.exclude ?? []);

  // Later parts win, so a recipe can list a broad "body" first and carve
  // wheels/limbs out of it after.
  const partFor = (s: Shape): Part | null => {
    for (let i = rig.parts.length - 1; i >= 0; i--) {
      const p = rig.parts[i];
      if (Array.isArray(p.select) ? p.select.includes(s.index) : p.select(s)) return p;
    }
    return null;
  };

  const pad = rig.pad ?? DEFAULT_PAD;
  const ROOT_IND = 1;
  const nullInd = new Map<string, number>();
  let nextInd = ROOT_IND + 1;
  for (const p of rig.parts) nullInd.set(p.name, nextInd++);

  // Everything hangs off one root null that shifts the art in by `pad`, so
  // parts keep working in plain frame coordinates.
  const layers: LottieLayer[] = [
    {
      ddd: 0,
      ind: ROOT_IND,
      ty: 3,
      nm: "pad",
      sr: 1,
      ks: {
        a: { a: 0, k: [0, 0, 0] },
        p: { a: 0, k: [pad, pad, 0] },
        r: { a: 0, k: 0 },
        s: { a: 0, k: [100, 100, 100] },
        o: { a: 0, k: 100 },
      },
      ao: 0,
      ip: 0,
      op,
      st: 0,
      bm: 0,
    },
  ];
  for (const p of rig.parts) {
    if (p.parent && !partsByName.has(p.parent)) throw new Error(`${name}: ${p.name} has unknown parent ${p.parent}`);
    const pivot = p.pivot ?? [0, 0];
    layers.push({
      ddd: 0,
      ind: nullInd.get(p.name),
      ty: 3,
      nm: p.name,
      parent: p.parent ? nullInd.get(p.parent) : ROOT_IND,
      sr: 1,
      ks: {
        a: { a: 0, k: [pivot[0], pivot[1], 0] },
        p: prop(p.offset ?? [0, 0], op, (v) => [pivot[0] + v[0], pivot[1] + v[1], 0]),
        r: prop(p.rotation ?? 0, op, (v) => [v]),
        s: prop(p.scale ?? [100, 100], op, (v) => [v[0], v[1], 100]),
        o: { a: 0, k: 100 },
      },
      ao: 0,
      ip: 0,
      op,
      st: 0,
      bm: 0,
    });
  }

  // Consecutive shapes owned by the same part share one shape layer; a part
  // whose shapes interleave with others' in z-order gets several layers, all
  // parented to its one null so they move together.
  const shapeLayers: LottieLayer[] = [];
  let run: { part: Part | null; shapes: Shape[] } | null = null;
  const subpathIndex = new Map<Part, number>();
  const flush = () => {
    if (!run || run.shapes.length === 0) return;
    const part = run.part;
    let groups: object[];
    if (part?.subpathOpacity) {
      const start = subpathIndex.get(part) ?? 0;
      groups = subpathOpacityGroups(run.shapes, part.subpathOpacity, start, op);
      subpathIndex.set(part, start + run.shapes.reduce((n, s) => n + pathsOf(s.path).length, 0));
    } else if (part?.deform) {
      groups = run.shapes.map((s) => deformedGroup(s, part.deform!, op));
    } else {
      groups = mergedGroups(run.shapes);
    }
    shapeLayers.push({
      ddd: 0,
      ind: nextInd++,
      ty: 4,
      nm: `${part?.name ?? "static"}:${run.shapes[0].index}`,
      parent: part ? nullInd.get(part.name) : ROOT_IND,
      ...(part?.className ? { cl: part.className } : {}),
      sr: 1,
      ks: {
        a: { a: 0, k: [0, 0, 0] },
        p: { a: 0, k: [0, 0, 0] },
        r: { a: 0, k: 0 },
        s: { a: 0, k: [100, 100, 100] },
        // Here rather than on the part's null: Lottie (like AE) doesn't
        // inherit opacity through parenting. So it also doesn't reach
        // child parts' layers — set it on each part that needs it.
        o: prop(part?.opacity ?? 100, op, (v) => [v]),
      },
      ao: 0,
      // Lottie draws the first item on top; groups are in painter's order.
      shapes: groups.reverse(),
      ip: 0,
      op,
      st: 0,
      bm: 0,
    });
  };

  for (const s of model.shapes) {
    if (exclude.has(s.index)) continue;
    const part = partFor(s);
    if (!run || run.part !== part) {
      flush();
      run = { part, shapes: [] };
    }
    run.shapes.push(s);
  }
  flush();

  // Lottie's layer order is top-first.
  return {
    v: "5.9.6",
    fr: fps,
    ip: 0,
    op,
    w: Math.round(model.width + pad * 2),
    h: Math.round(model.height + pad * 2),
    nm: name,
    ddd: 0,
    assets: [],
    layers: [...shapeLayers.reverse(), ...layers],
    markers: [],
  };
}

function prop<T>(anim: Anim<T>, op: number, toK: (v: T) => number[]) {
  const unwrap = (k: number[]) => (k.length === 1 ? k[0] : k);
  if (!isAnimated(anim)) return { a: 0, k: unwrap(toK(anim as T)) };
  const { fn, step = 2, hold = false } = anim;
  let frames = sampleFrames(op, step);
  // A hold keyframe repeating the one before it changes nothing; dropping
  // them lets stepped values be sampled every frame (for off-beat steps)
  // without bloating the output.
  if (hold) {
    const same = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
    frames = frames.filter(
      (t, i) => i === 0 || i === frames.length - 1 || !same(toK(fn(t)), toK(fn(frames[i - 1]))),
    );
  }
  return {
    a: 1,
    k: frames.map((t, i) => {
      const s = toK(fn(t));
      return i === frames.length - 1 ? { t, s } : { t, s, ...(hold ? { h: 1 } : LINEAR) };
    }),
  };
}

function isAnimated<T>(anim: Anim<T>): anim is Sampled<T> {
  return typeof anim === "object" && anim !== null && "fn" in anim;
}

function sampleFrames(op: number, step: number): number[] {
  const frames: number[] = [];
  for (let t = 0; t < op; t += step) frames.push(t);
  frames.push(op);
  return frames;
}

/**
 * Static shapes, painter's order. Consecutive shapes with the same fill go in
 * one group — lottie-web then draws the group as a single <path>, which
 * matters with hundreds of flower dots and kiosk-grade graphics — but only
 * while none of them overlap, since merged paths share one fill rule and
 * overlapping ones could punch holes in each other.
 */
function mergedGroups(shapes: Shape[]): object[] {
  const groups: object[] = [];
  let batch: Shape[] = [];
  const sameFill = (a: Shape, b: Shape) =>
    a.fill.every((c, i) => c === b.fill[i]) &&
    a.opacity === b.opacity &&
    a.evenOdd === b.evenOdd &&
    JSON.stringify(a.stroke) === JSON.stringify(b.stroke);
  const overlaps = (a: Shape, b: Shape) =>
    a.bbox.x < b.bbox.x + b.bbox.width &&
    b.bbox.x < a.bbox.x + a.bbox.width &&
    a.bbox.y < b.bbox.y + b.bbox.height &&
    b.bbox.y < a.bbox.y + a.bbox.height;
  const emit = () => {
    if (batch.length === 0) return;
    const items = batch.flatMap((s) => pathsOf(s.path)).map((path, i) => staticPath(path, `p${i}`));
    groups.push(group(batch[0], items, batch.map((s) => s.index).join(",")));
    batch = [];
  };
  for (const s of shapes) {
    if (batch.length > 0 && (!sameFill(batch[0], s) || batch.some((b) => overlaps(b, s)))) emit();
    batch.push(s);
  }
  emit();
  return groups;
}

function deformedGroup(s: Shape, deform: NonNullable<Part["deform"]>, op: number) {
  const subpaths = pathsOf(s.path);
  const frames = sampleFrames(op, deform.step ?? 2);
  if (deform.rigid) {
    const items = subpaths.map((path, i) => {
      const c = path.bounds.center;
      return {
        ty: "gr",
        nm: `p${i}`,
        it: [
          staticPath(path, "path"),
          transform({
            a: 1,
            k: frames.map((t, j) => {
              const [dx, dy] = deform.fn(c.x, c.y, t);
              const s = [round(dx), round(dy)];
              return j === frames.length - 1 ? { t, s } : { t, s, ...LINEAR };
            }),
          }),
        ],
      };
    });
    return group(s, items);
  }
  const items = subpaths.map((path, i) => ({
    ty: "sh",
    nm: `p${i}`,
    ks: {
      a: 1,
      k: frames.map((t, j) => {
        const v = bezier(path, (x, y) => {
          const [dx, dy] = deform.fn(x, y, t);
          return [x + dx, y + dy];
        });
        return j === frames.length - 1 ? { t, s: [v] } : { t, s: [v], ...LINEAR };
      }),
    },
  }));
  return group(s, items);
}

/**
 * Subpaths whose opacity animates independently. Ones that get the *same*
 * Anim object back (e.g. one per marquee phase) share a group and a single
 * animated fill, so a 60-bulb chase is three animations, not sixty.
 */
function subpathOpacityGroups(
  shapes: Shape[],
  opacityFor: NonNullable<Part["subpathOpacity"]>,
  start: number,
  op: number,
): object[] {
  // Keyed by the Anim itself plus the fill, since only same-colored paths can share a fill.
  const buckets = new Map<string, { anim: Anim<number>; shape: Shape; paths: paper.Path[] }>();
  const animIds = new Map<Anim<number>, number>();
  let index = start;
  for (const s of shapes) {
    for (const path of pathsOf(s.path)) {
      const c = path.bounds.center;
      const anim = opacityFor([c.x, c.y], index++);
      if (!animIds.has(anim)) animIds.set(anim, animIds.size);
      const key = `${animIds.get(anim)}|${s.fill.join()}|${s.opacity}|${s.evenOdd}`;
      if (!buckets.has(key)) buckets.set(key, { anim, shape: s, paths: [] });
      buckets.get(key)!.paths.push(path);
    }
  }
  return [...buckets.values()].map(({ anim, shape, paths }) => {
    return {
      ty: "gr",
      nm: `${shape.id}#${shape.index}`,
      it: [
        ...paths.map((path, i) => staticPath(path, `p${i}`)),
        paint(shape, prop(anim, op, (v) => [round(v * shape.opacity)])),
        transform({ a: 0, k: [0, 0] }),
      ],
    };
  });
}

function staticPath(path: paper.Path, nm: string) {
  return { ty: "sh", nm, ks: { a: 0, k: bezier(path, (x, y) => [x, y]) } };
}

/** A shape's group: its paths (or per-subpath groups), then its fill, which applies to all of them. */
function group(s: Shape, items: object[], indices = `${s.index}`) {
  return {
    ty: "gr",
    nm: `${s.id}#${indices}`,
    it: [
      ...items,
      paint(s, { a: 0, k: round(s.opacity * 100) }),
      transform({ a: 0, k: [0, 0] }),
    ],
  };
}

/** The shape's fill — or, for a stroked shape, its stroke — with the given opacity property. */
function paint(s: Shape, opacity: object) {
  if (s.stroke) {
    return {
      ty: "st",
      c: { a: 0, k: [...s.fill, 1] },
      o: opacity,
      w: { a: 0, k: s.stroke.width },
      lc: { butt: 1, round: 2, square: 3 }[s.stroke.cap],
      lj: { miter: 1, round: 2, bevel: 3 }[s.stroke.join],
      ml: s.stroke.miterLimit,
    };
  }
  return { ty: "fl", c: { a: 0, k: [...s.fill, 1] }, o: opacity, r: s.evenOdd ? 2 : 1 };
}

function transform(p: object) {
  return {
    ty: "tr",
    p,
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 },
    sk: { a: 0, k: 0 },
    sa: { a: 0, k: 0 },
  };
}

function pathsOf(item: paper.PathItem): paper.Path[] {
  if (item instanceof paper.CompoundPath) return item.children as paper.Path[];
  return [item as paper.Path];
}

/**
 * Lottie's bezier format: absolute vertices plus in/out tangents relative to
 * their vertex — the same as paper's segments. Deformation maps the absolute
 * handle points too, then re-relativizes, so curves bend with their vertices.
 */
function bezier(path: paper.Path, map: (x: number, y: number) => Vec) {
  const v: Vec[] = [];
  const i: Vec[] = [];
  const o: Vec[] = [];
  for (const seg of path.segments) {
    const p = map(seg.point.x, seg.point.y);
    const hin = map(seg.point.x + seg.handleIn.x, seg.point.y + seg.handleIn.y);
    const hout = map(seg.point.x + seg.handleOut.x, seg.point.y + seg.handleOut.y);
    v.push([round(p[0]), round(p[1])]);
    i.push([round(hin[0] - p[0]), round(hin[1] - p[1])]);
    o.push([round(hout[0] - p[0]), round(hout[1] - p[1])]);
  }
  return { i, o, v, c: path.closed };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
