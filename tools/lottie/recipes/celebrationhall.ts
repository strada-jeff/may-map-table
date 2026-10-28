import type { Anim, Part, Rig, Vec } from "../lottie";
import { bend, clamp01, range, sine } from "../motion";
import type { SvgModel } from "../svg-model";

// "String lights flash in sequence and loop. Dancers move their arms and
// legs slightly as they dance. Their hair moves subtly as well. The woman on
// the right's dress waves slightly in the breeze."
//
// After review: everything ~20% slower, and the dancers' bouncy dip dropped
// (it read as jitter) — they keep a gentle sway from the feet.
const FRAMES = 72;
const BEAT = 36; // two grooves per loop
const TAU = Math.PI * 2;

// String lights: each white shape is one swag of the strand (a compound
// path, one subpath per bulb) plus the little hook between swags, left to
// right — a 4-phase marquee chase along the strand.
const LIGHTS = range(324, 340);
const CHASE_PHASES = 4;
const CHASE_HOLD = 6;
const CHASE: Anim<number>[] = Array.from({ length: CHASE_PHASES }, (_, phase) => ({
  fn: (f: number) => (Math.floor(f / CHASE_HOLD) % CHASE_PHASES === phase ? 100 : 35),
  step: CHASE_HOLD,
  hold: true,
}));

/** A dancer's whole-body groove: a sway from the feet, phase-offset per dancer. */
function groove(name: string, select: number[], feet: Vec, phase: number): Part {
  return { name, select, pivot: feet, rotation: { fn: sine(BEAT, 2, phase) } };
}

export default function celebrationHall(_model: SvgModel): Rig {
  // Left woman: one skin shape (281) covers her face, raised arm and the
  // hand on her thigh; the arm is bent out of it around her shoulder.
  const leftShoulder: Vec = [40.5, 47];
  const leftArm = bend(leftShoulder, sine(BEAT, 8, 0.1), (x, y) => clamp01((41.5 - x) / 5) * clamp01((48 - y) / 5));

  // Man: his raised arm is part of skin shape 265, likewise bent out of it.
  const manShoulder: Vec = [71, 46];
  const manArm = bend(manShoulder, sine(BEAT, -8, 0.4), (x, y) => clamp01((46 - y) / 4) * clamp01((75 - x) / 3));

  // Right woman's skirt: flutters more toward the hem.
  const skirt = (x: number, y: number, f: number): Vec => {
    const w = clamp01((y - 60) / 20);
    return [1.2 * w * Math.sin(TAU * (f / 24 + y / 15)), 0.4 * w * Math.sin(TAU * (f / 24 + x / 25))];
  };

  return {
    frames: FRAMES,
    parts: [
      // --- Left woman (271-323) ---
      groove("left-dancer", range(271, 323), [47, 92], 0),
      {
        name: "left-arm",
        parent: "left-dancer",
        select: [281],
        deform: { fn: leftArm, step: 6 },
      },
      {
        name: "left-fingers",
        parent: "left-dancer",
        select: [314, 315, 316],
        deform: { fn: leftArm, step: 6, rigid: true },
      },
      {
        name: "left-ponytail",
        parent: "left-dancer",
        select: [278],
        pivot: [42.5, 38],
        rotation: { fn: sine(BEAT / 1.5, 6) },
      },

      // --- Man (239-270) ---
      groove("man", range(239, 270), [72, 92], 0.33),
      { name: "man-arm", parent: "man", select: [265], deform: { fn: manArm, step: 6 } },
      { name: "man-elbow-arm", parent: "man", select: [246], pivot: [82, 46], rotation: { fn: sine(BEAT, 5, 0.6) } },
      {
        name: "man-left-leg",
        parent: "man",
        select: [247, ...range(248, 253), 266],
        pivot: [64.5, 72.5],
        rotation: { fn: sine(BEAT, 4) },
      },
      {
        name: "man-right-leg",
        parent: "man",
        select: [254, ...range(255, 260), 270],
        pivot: [73, 76.5],
        rotation: { fn: sine(BEAT, 4, 0.5) },
      },

      // --- Right woman (198-238) ---
      groove("right-dancer", range(198, 238), [107, 87], 0.66),
      {
        name: "right-hair",
        parent: "right-dancer",
        select: [198],
        pivot: [110, 45],
        rotation: { fn: sine(BEAT / 1.5, 2.5, 0.2) },
      },
      {
        name: "right-arm",
        parent: "right-dancer",
        select: [204, 205, 216, 220, 221],
        pivot: [119.5, 50],
        rotation: { fn: sine(BEAT, 7, 0.8) },
      },
      { name: "right-skirt", parent: "right-dancer", select: [203], deform: { fn: skirt, step: 4 } },
      {
        name: "right-left-leg",
        parent: "right-dancer",
        select: [199, 200],
        pivot: [103, 74],
        rotation: { fn: sine(BEAT, 3) },
      },
      {
        name: "right-right-leg",
        parent: "right-dancer",
        select: [201, 202],
        pivot: [114, 74],
        rotation: { fn: sine(BEAT, 3, 0.5) },
      },

      // --- Lights ---
      { name: "lights", select: LIGHTS, subpathOpacity: (_c, i) => CHASE[i % CHASE_PHASES] },
    ],
  };
}
