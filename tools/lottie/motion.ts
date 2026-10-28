import type { Anim, Part, Vec } from "./lottie";
import type { Shape } from "./svg-model";

/**
 * Small vocabulary behind the Figma annotations ("bobs", "sways", "wheels
 * slowly rotate", "outer lines expand and contract in a cartoony
 * stop-motion-like movement"...). Every function is periodic over the
 * caller's loop length so the Lottie repeats without a seam — pass periods
 * that divide the rig's `frames`.
 */

const TAU = Math.PI * 2;

/** amp * sin over `period` frames, optionally phase-shifted (0..1 of a period). */
export const sine = (period: number, amp: number, phase = 0) => (f: number) =>
  amp * Math.sin(TAU * (f / period + phase));

/** Vertical bob as a position offset. */
export function bob(period: number, amp: number, phase = 0): Anim<Vec> {
  const s = sine(period, amp, phase);
  return { fn: (f) => [0, s(f)] };
}

/** Rotation that rocks ±amp degrees. */
export function sway(period: number, amp: number, phase = 0): Anim<number> {
  return { fn: sine(period, amp, phase) };
}

/** Continuous rotation, `turns` full turns over the loop. */
export function spin(frames: number, turns: number): Anim<number> {
  return { fn: (f) => (f / frames) * 360 * turns, step: 1 };
}

/**
 * Stepped scale cycling through `values` (percent), holding each for
 * `hold` frames — the radiating lines' cartoony expand/contract.
 */
export function stopMotionScale(values: number[], hold: number): Anim<Vec> {
  return {
    fn: (f) => {
      const v = values[Math.floor(f / hold) % values.length];
      return [v, v];
    },
    step: hold,
    hold: true,
  };
}

/**
 * The radiating lines as one part each, scaling about the burst's `center`
 * so each pushes in and out along its own ray. Every line steps through its
 * own sequence of `values`, on its own beat (offset up to a hold), so the
 * burst flickers line by line instead of pulsing as one block. Seeded, so
 * rebuilds are stable. `frames` must be a multiple of `hold`.
 */
export function burstLines(opts: {
  lines: number[];
  center: Vec;
  frames: number;
  hold: number;
  values?: number[];
  className?: string;
  parent?: string;
}): Part[] {
  const { lines, center, frames, hold, values = [98, 100, 102, 104, 106, 108], className, parent } = opts;
  if (frames % hold) throw new Error(`burstLines: ${frames} frames isn't a multiple of hold ${hold}`);
  const steps = frames / hold;
  return lines.map((index, n) => {
    const rand = mulberry32(index * 7919 + n);
    const offset = Math.floor(rand() * hold);
    const seq: number[] = [];
    for (let i = 0; i < steps; i++) {
      // Never hold the same size twice running (or across the loop seam).
      const avoid = new Set([seq[i - 1], i === steps - 1 ? seq[0] : undefined]);
      const pool = values.filter((v) => !avoid.has(v));
      seq.push(pool[Math.floor(rand() * pool.length)]);
    }
    return {
      name: `line-${index}`,
      select: [index],
      pivot: center,
      parent,
      className,
      scale: {
        fn: (f) => {
          const v = seq[Math.floor((((f + offset) % frames) + frames) % frames / hold)];
          return [v, v];
        },
        step: 1,
        hold: true,
      },
    };
  });
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Opacity that's `on` for a window of the loop and `off` otherwise, with
 * `fade` frames of ramp — the sequenced string lights / sign letters.
 * `start`/`length` are in frames, may wrap past the loop end.
 */
export function pulseWindow(
  frames: number,
  start: number,
  length: number,
  { on = 100, off = 0, fade = 3 } = {},
): Anim<number> {
  return {
    fn: (f) => {
      const local = (((f - start) % frames) + frames) % frames;
      if (local >= length + fade * 2) return off;
      if (local < fade) return off + ((on - off) * local) / fade;
      if (local < fade + length) return on;
      return on - ((on - off) * (local - fade - length)) / fade;
    },
    step: 1,
  };
}

/**
 * 3/4-view wheels are ellipses, so a plain 2D rotation would wobble the
 * spokes out of the rim. Spin in "circle space" instead: unsquash x about
 * the hub, rotate, re-squash. Returns the three chained parts; the spokes'
 * shapes go on the innermost one.
 */
export function perspectiveWheel(opts: {
  name: string;
  hub: Vec;
  /** Rim width / height — the ellipse's x squash. */
  squash: number;
  select: Part["select"];
  rotation: Anim<number>;
  parent?: string;
}): Part[] {
  const { name, hub, squash, select, rotation, parent } = opts;
  return [
    { name: `${name}-squash`, select: [], pivot: hub, scale: [squash * 100, 100], parent },
    { name: `${name}-spin`, select: [], pivot: hub, rotation, parent: `${name}-squash` },
    { name, select, pivot: hub, scale: [100 / squash, 100], parent: `${name}-spin` },
  ];
}

/** Center of a set of shapes' combined bbox. */
export function centerOf(shapes: Shape[], indices: number[]): Vec {
  const [x0, y0, x1, y1] = boundsOf(shapes, indices);
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

export function boundsOf(shapes: Shape[], indices: number[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const i of indices) {
    const b = shapes[i].bbox;
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width);
    y1 = Math.max(y1, b.y + b.height);
  }
  return [x0, y0, x1, y1];
}

/** Inclusive index range. */
export function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How far (x, y) moves when rotated `deg` degrees (clockwise) about `pivot`. */
export function rotationOffset(pivot: Vec, x: number, y: number, deg: number): Vec {
  const a = (deg * Math.PI) / 180;
  const dx = x - pivot[0];
  const dy = y - pivot[1];
  return [dx * Math.cos(a) - dy * Math.sin(a) - dx, dx * Math.sin(a) + dy * Math.cos(a) - dy];
}

/**
 * Deform that rotates points about `pivot` by `angle(f)` degrees, scaled per
 * point by `weight(x, y)` (0..1) — for a limb or wing drawn into a larger
 * shape (jeans that are waist and leg in one path, a wing that's part of the
 * body silhouette), so it can't be its own layer and rotated whole.
 */
export function bend(pivot: Vec, angle: (f: number) => number, weight: (x: number, y: number) => number) {
  return (x: number, y: number, f: number): Vec => rotationOffset(pivot, x, y, angle(f) * weight(x, y));
}

/** bend() weight: none at the pivot's height, fading in to full over `ramp` px below it. */
export function fadeBelow(pivot: Vec, ramp: number) {
  return (_x: number, y: number) => clamp01((y - pivot[1]) / ramp);
}
