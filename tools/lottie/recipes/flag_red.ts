import type { Part, Rig } from "../lottie";
import { centerOf, range, stopMotionScale, sway } from "../motion";
import type { SvgModel } from "../svg-model";

// "Flag ripples and sways slightly in the wind. Outer lines expand and
// contract in a cartoony stop-motion-like movement."
//
// Interactive: LocationMarker recolors the fabric and lines per category
// via the "flag-color" class (see index.css), so they must stay separate
// layers from the base shadow and the black texture overlay.
const FRAMES = 60;

const POLE_RIGHT = 77; // fabric starts just right of the pole
const RAMP = 45; // px over which the ripple fades in from the pole
const RIPPLE_AMP = 4;
const RIPPLE_WAVELENGTH = 110;
const RIPPLE_PERIOD = 30;

function ripple(x: number, _y: number, frame: number): [number, number] {
  const weight = Math.min(1, Math.max(0, (x - POLE_RIGHT) / RAMP));
  const phase = 2 * Math.PI * (x / RIPPLE_WAVELENGTH - frame / RIPPLE_PERIOD);
  return [0, weight * RIPPLE_AMP * Math.sin(phase)];
}

export default function flagRed({ shapes }: SvgModel): Rig {
  const lines = range(3, 17);
  const poleBase: [number, number] = centerOf(shapes, [0]);
  const deform = { fn: ripple, step: 3 };

  const parts: Part[] = [
    { name: "pole", select: [], pivot: poleBase, rotation: sway(FRAMES, 1.2) },
    { name: "fabric", select: [1], parent: "pole", deform, className: "flag-color" },
    { name: "texture", select: [2], parent: "pole", deform: { ...deform, rigid: true } },
    {
      name: "lines",
      select: lines,
      pivot: centerOf(shapes, lines),
      scale: stopMotionScale([100, 106, 102, 108, 98, 104], 5),
      className: "flag-color",
    },
  ];
  // The lines reach the frame edge; at 108% they overshoot it by ~11px.
  return { frames: FRAMES, parts, pad: 14 };
}
