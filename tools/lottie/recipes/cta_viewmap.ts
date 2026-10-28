import type { Rig } from "../lottie";
import { burstLines, centerOf, range } from "../motion";
import type { SvgModel } from "../svg-model";

// "Outer lines expand and contract in a cartoony stop-motion-like movement."
//
// Interactive: ExploreCta's button on the welcome overlay. "VIEW THE MAP"
// and the arrow are outlined shapes in the export and stay still.
const FRAMES = 72;
const LINES = range(2, 17);

export default function ctaViewmap({ shapes }: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: burstLines({ lines: LINES, center: centerOf(shapes, LINES), frames: FRAMES, hold: 8 }),
    // Lines reach the frame edge; at 108% they overshoot it by ~15px.
    pad: 16,
  };
}
