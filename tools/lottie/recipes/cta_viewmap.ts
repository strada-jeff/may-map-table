import type { Rig } from "../lottie";
import { centerOf, range, stopMotionScale } from "../motion";
import type { SvgModel } from "../svg-model";

// "Outer lines expand and contract in a cartoony stop-motion-like movement."
//
// Interactive: ExploreCta's button on the welcome overlay. "VIEW THE MAP"
// and the arrow are outlined shapes in the export and stay still.
const FRAMES = 60;
const LINES = range(2, 17);

export default function ctaViewmap({ shapes }: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [
      {
        name: "lines",
        select: LINES,
        pivot: centerOf(shapes, LINES),
        scale: stopMotionScale([100, 105, 102, 107, 98, 104], 5),
      },
    ],
    // Lines reach the frame edge; at 107% they overshoot it by ~13px.
    pad: 16,
  };
}
