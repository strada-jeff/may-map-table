import type { Rig } from "../lottie";
import { bob, range } from "../motion";
import type { SvgModel } from "../svg-model";

// No Figma annotation; the user chose: "the fork and load rise and lower
// now and then, plus a slight bounce". The tines rest just above the top box
// of the stack, so each cycle the fork drops to the box's base (the tines
// draw in front of it, reading as sliding under), lifts it up the mast,
// holds, sets it back down and returns to rest. The rest of the loop is idle.
const FRAMES = 180;
const REACH = 10.8; // fork drop from rest to the top box's base
const LIFT = 6; // how high the box is carried

// Keyframes for the fork's y offset (frame, offset), eased between.
const FORK_KEYS: [number, number][] = [
  [0, 0],
  [30, 0],
  [50, REACH],
  [60, REACH],
  [80, REACH - LIFT],
  [110, REACH - LIFT],
  [130, REACH],
  [140, REACH],
  [160, 0],
  [FRAMES, 0],
];

const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

function forkY(f: number): number {
  for (let i = 1; i < FORK_KEYS.length; i++) {
    const [f1, y1] = FORK_KEYS[i];
    const [f0, y0] = FORK_KEYS[i - 1];
    if (f <= f1) return y0 + (y1 - y0) * ease((f - f0) / (f1 - f0));
  }
  return 0;
}

// The stretch where the tines are under the box (picked up at 60, set down by 130).
const CARRY_START = 60;
const CARRY_END = 130;

/** The box only moves while it's on the tines. */
const loadY = (f: number) => (f >= CARRY_START && f <= CARRY_END ? forkY(f) - REACH : 0);

export default function forklift(_model: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [
      // Cab, seat, wheel, mast and counterweight bounce on the tires (25-40),
      // which stay planted with the lower boxes (0-7).
      { name: "truck", select: range(10, 24), offset: bob(30, 0.35) },
      { name: "fork", parent: "truck", select: [10, 11, 12], offset: { fn: (f) => [0, forkY(f)], step: 2 } },
      // The top box rides the fork while it's up; it isn't parented to the
      // truck so it doesn't bounce while sitting on the stack.
      { name: "load", select: [8, 9], offset: { fn: (f) => [0, loadY(f)], step: 2 } },
    ],
  };
}
