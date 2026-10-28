import type { Rig, Vec } from "../lottie";
import { bob, range } from "../motion";
import type { SvgModel } from "../svg-model";

// "Hot air balloon bobs up and down slightly. Banner ripples slightly in the
// wind."
//
// Nearly all of this piece's ~3,000 shapes are the envelope's speckle
// texture; it only bobs as a whole, so it stays static geometry inside one
// moving layer (lottie.ts merges same-colored runs into single paths).
const FRAMES = 60;
const TAU = Math.PI * 2;

// Banner: the rope tying it to the basket, its two navy tails and the cream
// body bend with the wave, and so does the "Midtown" script, point by point
// in the same field — so it stays printed on the banner. (It used to ride
// rigidly per subpath, which let the i's dot and the o's counter drift off
// their letters.)
const BANNER = [3042, 3043, 3044, 3045];
const LETTERING = [3060, ...range(3061, 3072)];

const TIE: Vec = [50.5, 145]; // where the rope meets the basket — stays put
const RIPPLE_AMP = 0.6; // calmed after review (was 1.4)
const RIPPLE_WAVELENGTH = 30;
const RIPPLE_PERIOD = 30;

/** A wave travelling along the banner, growing with distance from the tie. */
function ripple(x: number, y: number, f: number): Vec {
  const w = Math.min(1, Math.hypot(x - TIE[0], y - TIE[1]) / 20);
  const phase = TAU * (x / RIPPLE_WAVELENGTH - f / RIPPLE_PERIOD);
  return [0.2 * RIPPLE_AMP * w * Math.cos(phase), RIPPLE_AMP * w * Math.sin(phase)];
}

export default function hotairballoonMidtown(_model: SvgModel): Rig {
  const deform = { fn: ripple, step: 4 };
  return {
    frames: FRAMES,
    parts: [
      { name: "balloon", select: () => true, offset: bob(FRAMES, 1.5) },
      { name: "banner", parent: "balloon", select: BANNER, deform },
      { name: "lettering", parent: "balloon", select: LETTERING, deform },
    ],
  };
}
