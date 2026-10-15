import type { Rig } from "../lottie";
import { sway } from "../motion";
import type { SvgModel } from "../svg-model";

// "The swing sways back and forth slightly."
const FRAMES = 90;

const SWING = [7, 8, 9]; // two chains + seat
const SWING_PIVOT: [number, number] = [56, 21]; // under the top bar, between the chain tops
const SWING_AMP = 7; // degrees

export default function playground(_model: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [{ name: "swing", select: SWING, pivot: SWING_PIVOT, rotation: sway(FRAMES, SWING_AMP) }],
  };
}
