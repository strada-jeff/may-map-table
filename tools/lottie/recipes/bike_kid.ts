import type { Rig } from "../lottie";
import { centerOf, range, spin, sway } from "../motion";
import type { SvgModel } from "../svg-model";

// "The bike pivots up and down from the back wheel as if doing a wheelie.
// The front wheel spins slowly. The boy's hair sways slightly in the wind."
const FRAMES = 90;

const GROUND = [0];
const REAR_WHEEL = [...range(11, 20), 35]; // tire, spokes, hub — stays planted
const FRONT_WHEEL = range(21, 31); // tire, spokes, hub
const HAIR_TUFT = [56]; // the curls sticking out the back of the helmet

const WHEELIE = 5; // degrees the front lifts at the top of the wheelie

export default function bikeKid({ shapes }: SvgModel): Rig {
  const all = shapes.map((s) => s.index);
  const bike = all.filter((i) => !GROUND.includes(i) && !REAR_WHEEL.includes(i));
  return {
    frames: FRAMES,
    parts: [
      {
        name: "bike",
        select: bike,
        pivot: centerOf(shapes, [11]),
        // Counter-clockwise lifts the front; eases up and back down once per loop.
        rotation: { fn: (f) => -WHEELIE * (0.5 - 0.5 * Math.cos((2 * Math.PI * f) / FRAMES)) },
      },
      { name: "front-wheel", parent: "bike", select: FRONT_WHEEL, pivot: centerOf(shapes, [21]), rotation: spin(FRAMES, 1) },
      { name: "hair", parent: "bike", select: HAIR_TUFT, pivot: [21.5, 6], rotation: sway(30, 6) },
    ],
  };
}
