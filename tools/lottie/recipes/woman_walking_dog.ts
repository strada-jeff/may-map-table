import type { Part, Rig, Vec } from "../lottie";
import { bend, clamp01, fadeBelow, range, sine } from "../motion";
import type { SvgModel } from "../svg-model";

// "The woman's legs move back and forth as she walks. Her hair bobs up and
// down slightly. The dog's legs move back and forth as it walks, and its
// tongue moves as it pants."
//
// Two shapes here are a body and a leg in one path: her pink trousers (41,
// waist + front leg) and the dog's body (114, torso + both near legs). Those
// bend instead of rotating rigidly — vertices rotate about the joint by an
// angle weighted by how far below it (and, for the dog, how far into the
// leg's side of the body) they sit. Local `bend` helper below.
const FRAMES = 60;


// Her stride.
const STRIDE = 30;
const LEG_SWING = 6; // degrees
const FRONT_SWING = sine(STRIDE, LEG_SWING);
const BACK_SWING = sine(STRIDE, LEG_SWING, 0.5);
const FRONT_HIP: Vec = [34, 47];
const BACK_HIP: Vec = [30, 49];
const HIP_RAMP = 7;
// The puff (82) overlaps her head (81), whose path also traces a thin
// outline around the puff, so neither can move rigidly. Both take the same
// deform: full at the back of the puff, fading to nothing at the seam, so
// her face (right of HAIR_FIXED_X) never moves.
const HAIR_BOB = 0.7; // px, once per stride
const HAIR_FIXED_X = 29; // puff/head seam
const HAIR_RAMP = 7;
function hairBob(x: number, _y: number, f: number): Vec {
  return [0, clamp01((HAIR_FIXED_X - x) / HAIR_RAMP) * sine(STRIDE, HAIR_BOB)(f)];
}

// The dog's trot: quicker steps, diagonal pairs in phase.
const TROT = 20;
const DOG_SWING = 10;
const DIAG_A = sine(TROT, DOG_SWING); // near back + far front
const DIAG_B = sine(TROT, DOG_SWING, 0.5); // near front + far back
const NEAR_BACK_HIP: Vec = [67, 69];
const NEAR_FRONT_SHOULDER: Vec = [86, 70];
const FAR_BACK_HIP: Vec = [73.5, 70];
const FAR_FRONT_SHOULDER: Vec = [80.5, 73.5];
const DOG_RAMP = 5;
// Fur marks (141-266) below the hip line belong to whichever leg they sit
// on — sorted by x, since the far legs' marks are drawn over the body path
// too. Marks higher up are on the torso and stay put.
const FUR = range(141, 266);
const LEG_FUR_TOP = 68;
const FAR_BACK_X: Vec = [69.5, 77.8];
const FAR_FRONT_X: Vec = [77.8, 82.8];

const PANT_PERIOD = 10; // frames per pant
const TONGUE_TOP: Vec = [89.9, 61.8];

// The dog body's two near legs, each faded out toward the belly between them.
const nearBack = bend(NEAR_BACK_HIP, DIAG_A, (x, y) => fadeBelow(NEAR_BACK_HIP, DOG_RAMP)(x, y) * clamp01((72 - x) / 3));
const nearFront = bend(NEAR_FRONT_SHOULDER, DIAG_B, (x, y) => fadeBelow(NEAR_FRONT_SHOULDER, DOG_RAMP)(x, y) * clamp01((x - 81) / 3));
function dogBody(x: number, y: number, f: number): Vec {
  const a = nearBack(x, y, f);
  const b = nearFront(x, y, f);
  return [a[0] + b[0], a[1] + b[1]];
}

export default function womanWalkingDog({ shapes }: SvgModel): Rig {
  const frontBend = bend(FRONT_HIP, FRONT_SWING, fadeBelow(FRONT_HIP, HIP_RAMP));

  const legFur = FUR.filter((i) => shapes[i].bbox.y >= LEG_FUR_TOP);
  const cx = (i: number) => shapes[i].bbox.x + shapes[i].bbox.width / 2;
  const within = ([a, b]: Vec) => (i: number) => cx(i) >= a && cx(i) < b;
  const farBackFur = legFur.filter(within(FAR_BACK_X));
  const farFrontFur = legFur.filter(within(FAR_FRONT_X));
  const nearFur = legFur.filter((i) => !farBackFur.includes(i) && !farFrontFur.includes(i));

  const parts: Part[] = [
    // Her
    { name: "hair", select: [81, 82], deform: { fn: hairBob, step: 5 } },
    { name: "front-trousers", select: [41], deform: { fn: frontBend, step: 3 } },
    { name: "front-seam", select: [48], deform: { fn: frontBend, step: 3, rigid: true } },
    { name: "front-foot", select: [26, 47, ...range(27, 38)], pivot: FRONT_HIP, rotation: { fn: FRONT_SWING } },
    { name: "back-leg", select: [39, 49, 40, 14, ...range(15, 25)], pivot: BACK_HIP, rotation: { fn: BACK_SWING } },

    // The dog
    { name: "dog-body", select: [114], deform: { fn: dogBody, step: 3 } },
    { name: "dog-near-fur", select: nearFur, deform: { fn: dogBody, step: 3, rigid: true } },
    { name: "dog-far-back", select: [112, ...farBackFur], pivot: FAR_BACK_HIP, rotation: { fn: DIAG_B } },
    { name: "dog-far-front", select: [113, ...farFrontFur], pivot: FAR_FRONT_SHOULDER, rotation: { fn: DIAG_A } },
    {
      name: "tongue",
      select: [115],
      pivot: TONGUE_TOP,
      scale: { fn: (f) => [100, 100 + 15 * (1 + Math.sin((2 * Math.PI * f) / PANT_PERIOD))], step: 1 },
    },
  ];
  return { frames: FRAMES, parts };
}
