import type { Anim, Part, Rig, Vec } from "../lottie";
import { pulseWindow, range } from "../motion";
import type { SvgModel } from "../svg-model";

// "The lightbulbs in the M flash in sequence. The letters spelling out
// "MAYFAIR" glow and cycle off and on. The dark green grasses sway slightly
// in the breeze."
const FRAMES = 120;

// Letter fills left to right (each sits under its own gray outline shape).
const LETTERS = [24, 34, 26, 30, 28, 22, 32];
const LETTER_STAGGER = 8; // frames between letters lighting
const ALL_ON_UNTIL = 96; // then everything drops out together
const LETTER_OFF = 30; // percent — "unlit" still reads as the letter

// The neon M's bulbs: each white shape is a dashed-stroke outline, one
// subpath per bulb, in order along the stroke. Classic 3-phase marquee chase.
const BULBS = range(36, 42);
const CHASE_PHASES = 3;
const CHASE_HOLD = 4;

// One Anim per phase, shared by every bulb in it — the builder groups
// bulbs that share an Anim into a single animated fill.
const CHASE: Anim<number>[] = Array.from({ length: CHASE_PHASES }, (_, phase) => ({
  fn: (f: number) => (Math.floor(f / CHASE_HOLD) % CHASE_PHASES === phase ? 100 : 25),
  step: CHASE_HOLD,
  hold: true,
}));

const SWAY_AMP = 1.5;
const SWAY_PERIOD = 60;

/** Grass blades bend more toward their tips; a slow wave rolls across the bed. */
function grassSway(baseY: number) {
  return (x: number, y: number, f: number): Vec => {
    const w = Math.min(1, Math.max(0, (baseY - y) / 22)) ** 1.5;
    return [SWAY_AMP * w * Math.sin(2 * Math.PI * (f / SWAY_PERIOD + x / 90)), 0];
  };
}

export default function mayfairSign(_model: SvgModel): Rig {
  const letterParts: Part[] = LETTERS.map((index, i) => {
    const start = 4 + i * LETTER_STAGGER;
    return {
      name: `letter-${i}`,
      select: [index],
      opacity: pulseWindow(FRAMES, start, ALL_ON_UNTIL - start, { on: 100, off: LETTER_OFF, fade: 3 }),
    };
  });

  return {
    frames: FRAMES,
    parts: [
      ...letterParts,
      {
        name: "bulbs",
        select: BULBS,
        subpathOpacity: (_c, i) => CHASE[i % CHASE_PHASES],
      },
      // Back row (behind the light-green bushes) and front row, which sit lower.
      { name: "grass-back", select: [...range(64, 73), ...range(118, 127)], deform: { fn: grassSway(111.5), step: 5 } },
      { name: "grass-front", select: [...range(75, 77), ...range(129, 131)], deform: { fn: grassSway(116), step: 5 } },
    ],
  };
}
