import type { Rig } from "../lottie";
import { sine, sway } from "../motion";
import type { SvgModel } from "../svg-model";

// "The dog's tail wags side to side. The corners of its mouth expand and
// contract as it pants. Its ears flap up and down slightly."
//
// Tail and ears are drawn behind the body shape, so their roots stay hidden
// as they rotate.
const FRAMES = 60;

const TAIL = [5, 6];
const TAIL_BASE: [number, number] = [36.5, 16];
const LEFT_EAR = [0, 1];
const LEFT_EAR_ROOT: [number, number] = [6.5, 3.5];
const RIGHT_EAR = [2, 3];
const RIGHT_EAR_ROOT: [number, number] = [13, 3];
const MOUTH = [15]; // the open mouth around the ball
const MOUTH_CENTER: [number, number] = [9.3, 15];

const PANT = sine(10, 1); // fast pant, 6 per loop

export default function dog(_model: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [
      { name: "tail", select: TAIL, pivot: TAIL_BASE, rotation: sway(12, 12) },
      { name: "left-ear", select: LEFT_EAR, pivot: LEFT_EAR_ROOT, rotation: sway(30, 7) },
      { name: "right-ear", select: RIGHT_EAR, pivot: RIGHT_EAR_ROOT, rotation: sway(30, 7, 0.5) },
      {
        name: "mouth",
        select: MOUTH,
        pivot: MOUTH_CENTER,
        scale: { fn: (f) => [100 + 7 * (0.5 + 0.5 * PANT(f)), 100 + 3 * (0.5 + 0.5 * PANT(f))], step: 1 },
      },
    ],
  };
}
