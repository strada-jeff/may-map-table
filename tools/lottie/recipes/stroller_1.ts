import type { Part, Rig, Vec } from "../lottie";
import { centerOf, range, sine, spin } from "../motion";
import type { Shape, SvgModel } from "../svg-model";

// "The stroller wheels slowly rotate. The woman's legs move back and forth
// as she walks."
//
// stroller_2 is the same drawing mirrored and recolored, but its layer
// order diverges (wheels, canopy, front shoe), so it shares this rig with
// its own StrollerLayout. Pivots come from bboxes, not hard-coded coordinates.
const FRAMES = 60;
const STRIDE = 30; // frames per full leg cycle — an easy pushing walk
const LEG_SWING = 5; // degrees
const WHEEL_TURNS = 1; // per loop — "slowly"

export type StrollerLayout = {
  /** Pant leg (first — its bbox places the hip) + seam dashes + sole + ankle + sneaker. */
  frontLeg: number[];
  backLeg: number[];
  /** Each wheel as [rim ring, ...hub/spokes]. Rims are circular, so a plain spin. */
  wheels: number[][];
  /** -1 rolls left (counter-clockwise), 1 rolls right — the way she's pushing. */
  direction: 1 | -1;
};

const LAYOUT: StrollerLayout = {
  frontLeg: [13, 79, 16, 12, ...range(150, 155)],
  backLeg: [10, 81, 11, ...range(0, 9)],
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
  const parts: Part[] = [
    {
      name: "front-leg",
      select: layout.frontLeg,
      // Hip, tucked up under the jacket hem.
      pivot: at(shapes[layout.frontLeg[0]], 0.51, 0.2),
      rotation: { fn: sine(STRIDE, LEG_SWING) },
    },
    {
      name: "back-leg",
      select: layout.backLeg,
      pivot: at(shapes[layout.backLeg[0]], 0.48, 0.07),
      rotation: { fn: sine(STRIDE, LEG_SWING, 0.5) },
    },
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
