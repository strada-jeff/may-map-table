import type { Part, Rig, Vec } from "../lottie";
import { range, sine } from "../motion";
import type { SvgModel } from "../svg-model";

// "The woman's legs move back and forth as she walks. Her hair waves
// slightly in the breeze."
//
// After review her walk was dropped; only the hair and bags move.
const FRAMES = 60;
const TAU = Math.PI * 2;

const HAIR_AMP = 1.2;
const HAIR_ROOT_X = 34; // strands start waving right of the scalp
const HAIR_RAMP = 16;
const HAIR_PERIOD = 60; // a breeze, not a bounce

const BAG_PERIOD = 30;
const BAG_SWAY = 1.5; // degrees — a little swing from her grip
const HAND: Vec = [47, 47];

function hairWave(x: number, _y: number, f: number): Vec {
  const w = Math.min(1, Math.max(0, (x - HAIR_ROOT_X) / HAIR_RAMP));
  return [0, HAIR_AMP * w * Math.sin(TAU * (x / 20 - f / HAIR_PERIOD))];
}

export default function womanShopping(_model: SvgModel): Rig {
  const parts: Part[] = [
    // Only strands that reach past HAIR_ROOT_X — the ones framing her face
    // (6-11) sit where the wave weight is 0 and would just carry dead keyframes.
    { name: "hair", select: [1, 2, 3, 4, 5, 12], deform: { fn: hairWave, step: 5 } },
    {
      name: "bags",
      select: [...range(57, 65), ...range(96, 98)],
      pivot: HAND,
      rotation: { fn: sine(BAG_PERIOD, BAG_SWAY, 0.25) },
    },
  ];
  return { frames: FRAMES, parts };
}
