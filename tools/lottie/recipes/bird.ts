import type { Rig, Vec } from "../lottie";
import { bob, range, sine } from "../motion";
import type { SvgModel } from "../svg-model";

// "The bird bobs up and down subtly as its wings flap slightly."
//
// The cream silhouette (shape 4) is one path covering body, raised wing and
// tail, so the near wing can't be cut out and rotated. Instead it bends: a
// rotation about the shoulder applied with a weight that's full out at the
// wingtip and fades to nothing over the body and head. Everything drawn over
// that region (orange wing, feather marks) gets the same field so it stays
// glued. The far wing is its own shapes, drawn behind, and just rotates.
const FRAMES = 60;

const SHOULDER: Vec = [19, 17];
const FLAP = sine(30, 9); // degrees; two flaps per loop, one a second
const NEAR_WING = [4, 5, 6, ...range(12, 19), 20];
const FAR_WING = [2, 3, 24, 25];
const FAR_WING_ROOT: Vec = [22, 20];

function wingBend(x: number, y: number, f: number): Vec {
  const w = Math.min(1, Math.max(0, (18 - y) / 10)) * Math.min(1, Math.max(0, (21 - x) / 5));
  if (w === 0) return [0, 0];
  const a = ((FLAP(f) * Math.PI) / 180) * w;
  const dx = x - SHOULDER[0];
  const dy = y - SHOULDER[1];
  return [dx * Math.cos(a) - dy * Math.sin(a) - dx, dx * Math.sin(a) + dy * Math.cos(a) - dy];
}

export default function bird({ shapes }: SvgModel): Rig {
  const rest = shapes.map((s) => s.index).filter((i) => !NEAR_WING.includes(i) && !FAR_WING.includes(i));
  return {
    frames: FRAMES,
    parts: [
      { name: "bird", select: rest, offset: bob(FRAMES, 0.6) },
      { name: "near-wing", parent: "bird", select: NEAR_WING, deform: { fn: wingBend, step: 4 } },
      {
        name: "far-wing",
        parent: "bird",
        select: FAR_WING,
        pivot: FAR_WING_ROOT,
        rotation: { fn: (f) => -0.6 * FLAP(f) },
      },
    ],
  };
}
