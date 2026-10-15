import type { Part, Rig } from "../lottie";
import { centerOf } from "../motion";
import type { SvgModel } from "../svg-model";

// "Starbursts expand and contract slightly with a twinkling effect."
const FRAMES = 60;

// The Figma frame holds the sign twice, stacked exactly on top of each other
// (shapes 0-150 and 151-300), so each starburst is four shapes: its white
// body and black outline in both copies. All four move together.
const STARS = [
  [21, 22, 172, 173],
  [23, 24, 174, 175],
  [25, 26, 176, 177],
  [27, 28, 178, 179],
];

const TWINKLE_PERIOD = 20; // frames per pulse; three per loop
const SCALE_MIN = 88;
const SCALE_MAX = 112;
const TWIST = 6; // degrees of turn at full size, for the sparkle

/** A quick swell and settle — sharper than a sine, so it reads as a twinkle. */
function twinkle(f: number, phase: number): number {
  const t = (((f / TWINKLE_PERIOD - phase) % 1) + 1) % 1;
  return Math.pow(Math.sin(Math.PI * t), 3);
}

export default function helloSign({ shapes }: SvgModel): Rig {
  const parts: Part[] = STARS.map((select, i) => {
    const phase = i / STARS.length;
    return {
      name: `star-${i}`,
      select,
      pivot: centerOf(shapes, [select[0]]),
      scale: {
        fn: (f) => {
          const s = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * twinkle(f, phase);
          return [s, s];
        },
        step: 1,
      },
      rotation: { fn: (f) => TWIST * twinkle(f, phase), step: 1 },
    };
  });
  return { frames: FRAMES, parts };
}
