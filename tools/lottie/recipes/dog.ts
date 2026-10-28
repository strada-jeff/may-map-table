import type { Rig } from "../lottie";
import { sine, sway } from "../motion";
import type { SvgModel } from "../svg-model";

// "The dog's tail wags side to side. The corners of its mouth expand and
// contract as it pants. Its ears flap up and down slightly."
//
// Tail and ears are drawn behind the body shape, so their roots stay hidden
// as they rotate.
//
// Ears flick intermittently (a double flap, a pause, a single, a longer
// pause) rather than flapping constantly; the loop is long enough for the
// stillness to read.
const FRAMES = 120;

const TAIL = [5, 6];
const TAIL_BASE: [number, number] = [36.5, 16];
const LEFT_EAR = [0, 1];
const LEFT_EAR_ROOT: [number, number] = [6.5, 3.5];
const RIGHT_EAR = [2, 3];
const RIGHT_EAR_ROOT: [number, number] = [13, 3];
const MOUTH = [15]; // the open mouth around the ball
const MOUTH_CENTER: [number, number] = [9.3, 15];

const PANT = sine(10, 1); // fast pant, 6 per loop

const EAR_FLAP = 15; // frames per flap
const EAR_SWING = 7; // degrees
const EAR_FLICKS: [start: number, flaps: number][] = [
  [0, 2],
  [75, 1],
];

/** Whole flaps inside each flick window (so they start and end at rest), still otherwise. */
function earFlick(phase: number) {
  const flap = sine(EAR_FLAP, EAR_SWING, phase);
  return (f: number) => {
    for (const [start, flaps] of EAR_FLICKS) {
      if (f >= start && f < start + flaps * EAR_FLAP) return flap(f - start);
    }
    return 0;
  };
}

export default function dog(_model: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [
      { name: "tail", select: TAIL, pivot: TAIL_BASE, rotation: sway(12, 12) },
      { name: "left-ear", select: LEFT_EAR, pivot: LEFT_EAR_ROOT, rotation: { fn: earFlick(0), step: 1 } },
      { name: "right-ear", select: RIGHT_EAR, pivot: RIGHT_EAR_ROOT, rotation: { fn: earFlick(0.5), step: 1 } },
      {
        name: "mouth",
        select: MOUTH,
        pivot: MOUTH_CENTER,
        scale: { fn: (f) => [100 + 7 * (0.5 + 0.5 * PANT(f)), 100 + 3 * (0.5 + 0.5 * PANT(f))], step: 1 },
      },
    ],
  };
}
