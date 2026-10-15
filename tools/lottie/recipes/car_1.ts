import type { Rig } from "../lottie";
import { bob, centerOf, perspectiveWheel, range, spin } from "../motion";
import type { SvgModel } from "../svg-model";

// "The car bounces up and down slightly, as its wheels slowly rotate."
const FRAMES = 120;

export default function car1({ shapes }: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [
      // Shell, windows, lights and the wheel-arch shadows (0, 1) — the tires
      // stay planted while it bounces on its suspension.
      { name: "body", select: [0, 1, ...range(22, 33)], offset: bob(30, 0.45) },
      ...perspectiveWheel({
        name: "rear-spokes",
        hub: centerOf(shapes, [4]),
        squash: shapes[4].bbox.width / shapes[4].bbox.height,
        select: range(5, 10),
        rotation: spin(FRAMES, 1),
      }),
      ...perspectiveWheel({
        name: "front-spokes",
        hub: centerOf(shapes, [13]),
        squash: shapes[13].bbox.width / shapes[13].bbox.height,
        select: range(14, 19),
        rotation: spin(FRAMES, 1),
      }),
    ],
  };
}
