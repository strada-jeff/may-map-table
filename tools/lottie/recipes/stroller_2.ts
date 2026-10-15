import type { Rig } from "../lottie";
import { range } from "../motion";
import type { SvgModel } from "../svg-model";
import { strollerRig, type StrollerLayout } from "./stroller_1";

// "The stroller wheels slowly rotate. The woman's legs move back and forth
// as she walks." stroller_1's drawing mirrored (she pushes to the right)
// and recolored — same rig, but its own indices: the layer order diverges
// from the front sneaker onward.
const LAYOUT: StrollerLayout = {
  frontLeg: [13, 79, 16, 12, ...range(148, 153)],
  backLeg: [10, 81, 11, ...range(0, 9)],
  wheels: [
    [108, 82, 83, 117, 118, 120, 121, 122],
    [94, ...range(95, 101)],
    [123, 84, 124, 125, 126, 128, 129, 130],
    [85, ...range(86, 92)],
  ],
  direction: 1,
};

export default function stroller2(model: SvgModel): Rig {
  return strollerRig(model, LAYOUT);
}
