import type { Part, Rig, Vec } from "../lottie";
import { bend, centerOf, fadeBelow, range, spin, stepIn } from "../motion";
import type { Shape, SvgModel } from "../svg-model";

// "The stroller wheels slowly rotate. The woman's legs move back and forth
// as she walks."
//
// She's drawn mid-stride, ankles ~18px apart, so (as with the dog walker)
// each leg swings in from its drawn angle until the feet meet under her
// hips, then back out; the shoes counter-rotate at the ankle to stay flat.
// The trousers bend rather than rotate whole: rotating rigidly, the fabric
// above the hip swung the other way and showed between her arms. The back
// leg's seam is stacked over the front trousers in the export, so it's
// moved beneath them.
//
// stroller_2 is the same drawing mirrored and recolored, but its layer
// order diverges (wheels, canopy, front shoe), so it shares this rig with
// its own StrollerLayout. Pivots come from bboxes, not hard-coded coordinates.
const FRAMES = 60;
const STRIDE = 30; // frames per step — an easy pushing walk
const STEP = stepIn(STRIDE);
const FRONT_MEET = 14; // degrees in from the drawn pose (~13° off vertical)
const BACK_MEET = 14;
const HIP_RAMP = 6; // px below the hip over which the bend fades in
const WHEEL_TURNS = 1; // per loop — "slowly"

export type StrollerLeg = {
  /** The trouser leg — its bbox places the hip. */
  trousers: number;
  /** Seam dashes, bent along with the trousers. */
  seams: number[];
  /** Hem and ankle (last — places the ankle joint), which turn rigidly with the leg. */
  lower: number[];
  shoe: number[];
};

export type StrollerLayout = {
  frontLeg: StrollerLeg;
  backLeg: StrollerLeg;
  /** Each wheel as [rim ring, ...hub/spokes]. Rims are circular, so a plain spin. */
  wheels: number[][];
  /** -1 rolls left (counter-clockwise), 1 rolls right — the way she's pushing. */
  direction: 1 | -1;
};

const LAYOUT: StrollerLayout = {
  frontLeg: { trousers: 13, seams: [79, 80], lower: [16, 12], shoe: range(150, 155) },
  backLeg: { trousers: 10, seams: [81], lower: [11, 0], shoe: range(1, 9) },
  wheels: [
    [85, ...range(86, 92)],
    [107, 83, 84, 110, 117, 126, 127, 128],
    [94, ...range(95, 101)],
    [109, 82, ...range(111, 116)],
  ],
  direction: -1,
};

/** Point at fractions (fx, fy) of a shape's bbox. */
function at(s: Shape, fx: number, fy: number): Vec {
  return [s.bbox.x + s.bbox.width * fx, s.bbox.y + s.bbox.height * fy];
}

export function strollerRig({ shapes }: SvgModel, layout: StrollerLayout): Rig {
  // Positive rotation swings a foot left, so which way is "in" depends on
  // which way she's walking.
  const front = (f: number) => layout.direction * FRONT_MEET * STEP(f);
  const back = (f: number) => -layout.direction * BACK_MEET * STEP(f);
  const leg = (name: string, l: StrollerLeg, hip: Vec, angle: (f: number) => number, drawBelow?: number): Part[] => {
    const bent = bend(hip, angle, fadeBelow(hip, HIP_RAMP));
    const ankle = at(shapes[l.lower[l.lower.length - 1]], 0.5, 0.5);
    return [
      { name: `${name}-trousers`, select: [l.trousers], deform: { fn: bent, step: 2 } },
      { name: `${name}-seams`, select: l.seams, deform: { fn: bent, step: 2, rigid: true }, drawBelow },
      { name, select: l.lower, pivot: hip, rotation: { fn: angle } },
      { name: `${name}-shoe`, parent: name, select: l.shoe, pivot: ankle, rotation: { fn: (f) => -angle(f) } },
    ];
  };
  const parts: Part[] = [
    // Hips, tucked up under the jacket hem.
    ...leg("front-leg", layout.frontLeg, at(shapes[layout.frontLeg.trousers], 0.51, 0.2), front),
    ...leg("back-leg", layout.backLeg, at(shapes[layout.backLeg.trousers], 0.48, 0.07), back, layout.frontLeg.trousers),
    ...layout.wheels.map(
      (wheel, i): Part => ({
        name: `wheel-${i}`,
        select: wheel,
        pivot: centerOf(shapes, [wheel[0]]),
        rotation: spin(FRAMES, layout.direction * WHEEL_TURNS),
      }),
    ),
  ];
  return { frames: FRAMES, parts };
}

export default function stroller1(model: SvgModel): Rig {
  return strollerRig(model, LAYOUT);
}
