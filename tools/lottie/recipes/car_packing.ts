import type { Rig, Vec } from "../lottie";
import type { SvgModel } from "../svg-model";

// "The man lifts the bag up and down intermittently as he loads it into the
// car."
//
// His forearms swing up about the elbows; at the full lift both hands move
// by ≈(1.1, -2.0), so the bag (with his fingers on its handles) translates
// by that much and stays in his grip.
const FRAMES = 150;

const BAG = [37, 38, 39, 40, 41, 119, 120, 121]; // bag, straps, fingers on the handles
const NEAR_FOREARM = 88;
const FAR_FOREARM = 89;
const NEAR_ELBOW: Vec = [32.1, 35];
const FAR_ELBOW: Vec = [39.3, 33.6];
const ARM_LIFT = -10; // degrees at full lift (counter-clockwise raises the hands)
const BAG_LIFT: Vec = [1.1, -2.0];

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
