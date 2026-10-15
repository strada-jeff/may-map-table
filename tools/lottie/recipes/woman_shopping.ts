import type { Part, Rig, Vec } from "../lottie";
import { bend, fadeBelow, range, sine } from "../motion";
import type { SvgModel } from "../svg-model";

// "The woman's legs move back and forth as she walks. Her hair waves
// slightly in the breeze."
//
// The light-blue jeans shape (55) is the waist *and* the front leg in one
// path, so a rigid rotation would swing her pelvis too. The jeans bend
// instead: each vertex rotates about the hip by an angle that ramps from 0
// at the hip to full at mid-thigh (local `bend` helper below). Shoes and
// cuffs sit below the ramp, so they take the full angle as plain rotations.
const FRAMES = 60;
const TAU = Math.PI * 2;

const STRIDE = 30; // frames per full leg cycle
const LEG_SWING = 6; // degrees
const FRONT_SWING = sine(STRIDE, LEG_SWING);
const BACK_SWING = sine(STRIDE, LEG_SWING, 0.5);

const FRONT_HIP: Vec = [27, 46];
const BACK_HIP: Vec = [37, 50];
const BEND_RAMP = 8; // px below the hip over which the bend fades in

const HAIR_AMP = 1.2;
const HAIR_ROOT_X = 34; // strands start waving right of the scalp
const HAIR_RAMP = 16;
const HAIR_PERIOD = 60; // slower than the stride — a breeze, not a bounce

const BAG_SWAY = 1.5; // degrees — a little swing from her grip
const HAND: Vec = [47, 47];

function hairWave(x: number, _y: number, f: number): Vec {
  const w = Math.min(1, Math.max(0, (x - HAIR_ROOT_X) / HAIR_RAMP));
  return [0, HAIR_AMP * w * Math.sin(TAU * (x / 20 - f / HAIR_PERIOD))];
}

export default function womanShopping(_model: SvgModel): Rig {
  const frontBend = bend(FRONT_HIP, FRONT_SWING, fadeBelow(FRONT_HIP, BEND_RAMP));
  const backBend = bend(BACK_HIP, BACK_SWING, fadeBelow(BACK_HIP, BEND_RAMP));

  const parts: Part[] = [
    // Only strands that reach past HAIR_ROOT_X — the ones framing her face
    // (6-11) sit where the wave weight is 0 and would just carry dead keyframes.
    { name: "hair", select: [1, 2, 3, 4, 5, 12], deform: { fn: hairWave, step: 5 } },
    { name: "front-jeans", select: [55], deform: { fn: frontBend, step: 3 } },
    { name: "front-seam", select: [94], deform: { fn: frontBend, step: 3, rigid: true } },
    {
      name: "front-foot",
      select: [52, 38, ...range(39, 44)],
      pivot: FRONT_HIP,
      rotation: { fn: FRONT_SWING },
    },
    { name: "back-jeans", select: [54], deform: { fn: backBend, step: 3 } },
    { name: "back-seam", select: [95], deform: { fn: backBend, step: 3, rigid: true } },
    {
      name: "back-foot",
      select: [53, ...range(45, 51)],
      pivot: BACK_HIP,
      rotation: { fn: BACK_SWING },
    },
    {
      name: "bags",
      select: [...range(57, 65), ...range(96, 98)],
      pivot: HAND,
      rotation: { fn: sine(STRIDE, BAG_SWAY, 0.25) },
    },
  ];
  return { frames: FRAMES, parts };
}
