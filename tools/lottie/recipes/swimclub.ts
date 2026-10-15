import type { Part, Rig, Vec } from "../lottie";
import { centerOf, range, sine, stopMotionScale } from "../motion";
import type { SvgModel } from "../svg-model";

// "The child on the float kicks their legs and splashes water. The woman in
// the hat's hair moves in the breeze. The umbrella sways slightly."
const FRAMES = 60;
const KICK = 20; // frames per kick; three per loop
const TAU = Math.PI * 2;

// Child on the flamingo float: the leg kicked out over the water (90, with
// its knee/foot line marks) swings from the hip; the one dangling in the
// water (98, clipped at the waterline) swings opposite from the knee.
const KICK_LEG = [90, ...range(122, 129), 143, 144];
const DANGLE_LEG = [98];

// Droplets around the kicking foot and the dangling one, popping in a
// stepped, cartoony rhythm on each kick.
const SPLASH_HIGH = [147, 148, 149, 150, 155, 157, 158];
const SPLASH_LOW = [151, 152, 153, 154, 156];
const SPLASH_HOLD = 5; // 4 steps x 5 frames = one kick

// Woman in the yellow hat: long hair hanging down her back.
const HAIR = 166;
const HAIR_TOP = 52;

// Umbrella: canopy and pole, rocking on the stand.
const UMBRELLA = [228, 227];
const UMBRELLA_BASE: Vec = [44.5, 63.5];

/** Hair flutters more toward its ends, a ripple running down it. */
function hairBreeze(x: number, y: number, f: number): Vec {
  const w = Math.min(1, Math.max(0, (y - HAIR_TOP) / 14));
  return [0.9 * w * Math.sin(TAU * (f / 30 + y / 12)), 0.2 * w * Math.sin(TAU * (f / 30 + x / 15))];
}

/** Droplets flash in step with the kick: dim and small, then out and bright. */
function splash(name: string, select: number[], pivot: Vec, phase: number): Part {
  const steps = [0, 1, 2, 3].map((i) => (i + phase) % 4);
  const opacity = [45, 100, 90, 65];
  return {
    name,
    select,
    pivot,
    scale: stopMotionScale(
      steps.map((i) => [75, 118, 102, 88][i]),
      SPLASH_HOLD,
    ),
    opacity: { fn: (f) => opacity[steps[Math.floor(f / SPLASH_HOLD) % 4]], step: SPLASH_HOLD, hold: true },
  };
}

export default function swimClub({ shapes }: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [
      { name: "kick-leg", select: KICK_LEG, pivot: [110.7, 21.5], rotation: { fn: sine(KICK, 10) } },
      { name: "dangle-leg", select: DANGLE_LEG, pivot: [108.5, 24], rotation: { fn: sine(KICK, 8, 0.5) } },
      splash("splash-high", SPLASH_HIGH, centerOf(shapes, SPLASH_HIGH), 0),
      splash("splash-low", SPLASH_LOW, centerOf(shapes, SPLASH_LOW), 2),
      { name: "hair", select: [HAIR], deform: { fn: hairBreeze, step: 3 } },
      { name: "umbrella", select: UMBRELLA, pivot: UMBRELLA_BASE, rotation: { fn: sine(FRAMES, 1.5) } },
    ],
  };
}
