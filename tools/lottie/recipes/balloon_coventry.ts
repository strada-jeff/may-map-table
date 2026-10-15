import type { Part, Rig, Vec } from "../lottie";
import { centerOf, range, sine, stopMotionScale } from "../motion";
import type { SvgModel } from "../svg-model";

// "Balloon sways and bobs slightly. Outer lines expand and contract in a
// cartoony stop-motion-like movement."
//
// Interactive: ModelHomeMarker plants this at the string's foot and writes
// the builder's abbreviation into the balloon itself — the recipe drops
// Figma's placeholder "c" and tags the balloon's layer "balloon-body" so the
// app can append its own <text> there, riding the same sway.
const FRAMES = 90;

const STRING = 0;
const BODY = 1; // balloon envelope
const LABEL_PLACEHOLDER = 38; // Figma's "c"
const LINES = range(39, 48);

const SWAY = sine(FRAMES, 1.8); // degrees about the string's foot
const BOB = sine(FRAMES / 2, 1.5, 0.25);

export default function balloonCoventry({ shapes }: SvgModel): Rig {
  const string = shapes[STRING].bbox;
  const anchor: Vec = [string.x + string.width / 2, string.y + string.height - string.width / 2];
  const knotY = shapes[BODY].bbox.y + shapes[BODY].bbox.height; // where the string leaves the balloon

  /**
   * The string bends rather than swinging rigidly: points at or above the
   * knot turn with the balloon (same angle, same bob), and the effect fades
   * linearly to nothing at the foot, which stays planted on the pin's anchor.
   */
  function stringDeform(x: number, y: number, f: number): Vec {
    const w = Math.min(1, Math.max(0, (anchor[1] - y) / (anchor[1] - knotY)));
    const a = (SWAY(f) * w * Math.PI) / 180;
    const dx = x - anchor[0];
    const dy = y - anchor[1];
    const rx = anchor[0] + dx * Math.cos(a) - dy * Math.sin(a);
    const ry = anchor[1] + dx * Math.sin(a) + dy * Math.cos(a);
    return [rx - x, ry - y + BOB(f) * w];
  }

  const parts: Part[] = [
    {
      name: "balloon",
      // Envelope, its texture dots and shine — everything between the string and the lines.
      select: range(BODY, LABEL_PLACEHOLDER - 1),
      pivot: anchor,
      rotation: { fn: SWAY },
      offset: { fn: (f) => [0, BOB(f)] },
      className: "balloon-body",
    },
    { name: "string", select: [STRING], deform: { fn: stringDeform, step: 2 } },
    {
      name: "lines",
      select: LINES,
      pivot: centerOf(shapes, [BODY]),
      scale: stopMotionScale([100, 106, 102, 108, 98, 104], 5),
    },
  ];
  // Lines reach the frame edge; at 108% they overshoot it by ~5px.
  return { frames: FRAMES, parts, exclude: [LABEL_PLACEHOLDER], pad: 10 };
}
