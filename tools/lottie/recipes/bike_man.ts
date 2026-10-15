import type { Rig } from "../lottie";
import { bob, centerOf, range, spin } from "../motion";
import type { SvgModel } from "../svg-model";

// "The bike wheels rotate at a moderate speed. The bike and biker bob up
// and down slightly."
const FRAMES = 60;

const SCENERY = range(0, 25); // bushes and the MAYFAIR STROLL sign stay put
const REAR_WHEEL = range(49, 54); // tire + spokes + hub
const FRONT_WHEEL = range(43, 48);

export default function bikeMan({ shapes }: SvgModel): Rig {
  const rider = shapes.map((s) => s.index).filter((i) => !SCENERY.includes(i));
  return {
    frames: FRAMES,
    parts: [
      { name: "rider", select: rider, offset: bob(20, 0.5) },
      { name: "rear-wheel", parent: "rider", select: REAR_WHEEL, pivot: centerOf(shapes, [49]), rotation: spin(FRAMES, 2) },
      { name: "front-wheel", parent: "rider", select: FRONT_WHEEL, pivot: centerOf(shapes, [43]), rotation: spin(FRAMES, 2) },
    ],
  };
}
