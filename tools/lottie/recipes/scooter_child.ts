import type { Rig } from "../lottie";
import { bob, centerOf, range, sine, spin } from "../motion";
import type { SvgModel } from "../svg-model";

// "The boy and scooter bob up and down slightly. The scooter wheels rotate
// slowly. The boy's back leg raises and lowers slightly."
//
// The wheels stay planted (spinning) while the deck, stem and rider bob on
// them — the ground shadow (0-2) doesn't move at all.
const FRAMES = 60;

const BOB_PERIOD = 30;
const BOB_AMP = 0.5;
const WHEEL_TURNS = 1; // per loop — "slowly"

const BACK_LEG = range(13, 21); // leg, sock, sneaker
const BACK_HIP: [number, number] = [41, 38.5]; // tucked under the shorts hem
// Negative = foot lifts (it trails to the right of the hip). Rests near the
// drawn pose and lifts a few degrees, twice per loop.
const LEG_LIFT = (f: number) => -2 + sine(BOB_PERIOD, 3, 0.25)(f);

const FRONT_WHEEL = [24, ...range(25, 27)]; // rim + stroked spokes
const REAR_WHEEL = [28, ...range(29, 32)];

export default function scooterChild({ shapes }: SvgModel): Rig {
  const wheels = new Set([...FRONT_WHEEL, ...REAR_WHEEL, 0, 1, 2]);
  const riding = shapes.map((s) => s.index).filter((i) => !wheels.has(i));

  return {
    frames: FRAMES,
    parts: [
      { name: "rider", select: riding, offset: bob(BOB_PERIOD, BOB_AMP) },
      { name: "back-leg", parent: "rider", select: BACK_LEG, pivot: BACK_HIP, rotation: { fn: LEG_LIFT } },
      {
        name: "front-wheel",
        select: FRONT_WHEEL,
        pivot: centerOf(shapes, [24]),
        rotation: spin(FRAMES, -WHEEL_TURNS), // rolling left
      },
      {
        name: "rear-wheel",
        select: REAR_WHEEL,
        pivot: centerOf(shapes, [28]),
        rotation: spin(FRAMES, -WHEEL_TURNS),
      },
    ],
  };
}
