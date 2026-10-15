import type { Rig, Vec } from "../lottie";
import { centerOf, range, sine } from "../motion";
import type { SvgModel } from "../svg-model";

// "Starburst expands and contracts slightly. The musical notes ripple and
// bob subtly."
const FRAMES = 60;

const STARBURST = [28, 29]; // navy drop shadow + yellow star
const STAR_PULSE = 6; // ± percent
const STAR_PERIOD = 30;

// Staff lines, notes and the treble clef (all clipped to the badge circle).
const MUSIC = range(2, 18);
const RIPPLE_AMP = 0.9;
const RIPPLE_WAVELENGTH = 40;
const RIPPLE_PERIOD = 30;
const BOB = sine(FRAMES, 0.5, 0.25);

// The staff lines run into the badge's inner ring at both ends, where
// they're clipped; motion fades to nothing there so the clipped ends stay
// tucked against the ring instead of poking past it.
const CLIP_LEFT = [24, 32];
const CLIP_RIGHT = [56, 64];

function envelope(x: number): number {
  const ramp = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
  return ramp(x, CLIP_LEFT[0], CLIP_LEFT[1]) * (1 - ramp(x, CLIP_RIGHT[0], CLIP_RIGHT[1]));
}

/** A gentle wave rolling left-to-right along the staff, on top of a slow bob. */
function ripple(x: number, _y: number, f: number): Vec {
  const dy = RIPPLE_AMP * Math.sin(2 * Math.PI * (x / RIPPLE_WAVELENGTH - f / RIPPLE_PERIOD)) + BOB(f);
  return [0, dy * envelope(x)];
}

export default function concert({ shapes }: SvgModel): Rig {
  const pulse = sine(STAR_PERIOD, STAR_PULSE);
  return {
    frames: FRAMES,
    parts: [
      {
        name: "starburst",
        select: STARBURST,
        pivot: centerOf(shapes, [29]),
        scale: { fn: (f) => [100 + pulse(f), 100 + pulse(f)] },
      },
      { name: "music", select: MUSIC, deform: { fn: ripple, step: 5 } },
    ],
  };
}
