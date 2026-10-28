import type { Rig, Vec } from "../lottie";
import { rotationOffset } from "../motion";
import type { SvgModel } from "../svg-model";

// "The man lifts the bag up and down intermittently as he loads it into the
// car."
//
// His forearms swing up about the elbows, and the bag (with his fingers on
// its handles) translates by however far his hand moves, so it stays in
// his grip.
const FRAMES = 150;

const BAG = [37, 38, 39, 40, 41, 119, 120, 121]; // bag, straps, fingers on the handles
const NEAR_FOREARM = 88;
const FAR_FOREARM = 89;
const NEAR_ELBOW: Vec = [32.1, 35];
const FAR_ELBOW: Vec = [39.3, 33.6];
const NEAR_HAND: Vec = [43, 42.3]; // at the handles
const ARM_LIFT = -15; // degrees at full lift (counter-clockwise raises the hands); was -10, made more apparent after review
const BAG_LIFT = rotationOffset(NEAR_ELBOW, NEAR_HAND[0], NEAR_HAND[1], ARM_LIFT);

// Two heaves per loop, then a pause: [start, up, hold-until, down] in frames.
const HEAVES = [
  [20, 35, 45, 60],
  [75, 90, 100, 115],
];

const ease = (t: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2;

/** 0..1 lift amount over the loop. */
function lift(f: number): number {
  for (const [start, up, hold, down] of HEAVES) {
    if (f >= start && f < up) return ease((f - start) / (up - start));
    if (f >= up && f < hold) return 1;
    if (f >= hold && f < down) return 1 - ease((f - hold) / (down - hold));
  }
  return 0;
}

export default function carPacking(_model: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [
      { name: "near-forearm", select: [NEAR_FOREARM], pivot: NEAR_ELBOW, rotation: { fn: (f) => ARM_LIFT * lift(f) } },
      { name: "far-forearm", select: [FAR_FOREARM], pivot: FAR_ELBOW, rotation: { fn: (f) => ARM_LIFT * lift(f) } },
      { name: "bag", select: BAG, offset: { fn: (f) => [BAG_LIFT[0] * lift(f), BAG_LIFT[1] * lift(f)] } },
    ],
  };
}
