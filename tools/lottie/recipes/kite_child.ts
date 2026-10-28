import type { Rig, Vec } from "../lottie";
import { range, sine } from "../motion";
import type { SvgModel } from "../svg-model";

// "The girl's legs move back and forth as she runs. Her arm raises and
// lowers with the kite string. The tail of the kite ripples in the wind."
const FRAMES = 60;
const TAU = Math.PI * 2;

const STRIDE = 20; // frames per full leg cycle
const LEG_SWING = 7; // degrees
// Hips sit up under the skirt so the thighs' tops shift sideways out of
// sight rather than dipping below the hem. The export stacks the back leg
// over the skirt, so it's moved beneath it — swinging, it rode up over it —
// with the lining beneath the leg as the art has it.
const SKIRT = 31; // the skirt's fabric
const SKIRT_LINING = 32; // its red underside, which the back leg covers
const FRONT_HIP: Vec = [36, 69];
const BACK_HIP: Vec = [25, 69];
const BOB = sine(STRIDE, 0.5, 0.25); // body rises once per stride — twice read as jittery

const SHOULDER: Vec = [35.5, 50]; // raised arm's pivot, where it leaves the sleeve
const HAND: Vec = [47, 30.6]; // where the string leaves her fist
const ARM_SWING = sine(FRAMES, 6); // degrees; one slow raise/lower per loop

const KITE_ANCHOR: Vec = [85, 15.5]; // where the string meets the kite
const TAIL_ATTACH: Vec = [84, 24.5];
const TAIL_PERIOD = 60; // frames per ripple
const KITE_DRIFT = (f: number): Vec => [sine(FRAMES, 0.6, 0.1)(f), sine(FRAMES, 1.2, 0.35)(f)];

/** The fist's displacement: arm rotation about the shoulder plus the body bob. */
function handOffset(f: number): Vec {
  const a = (ARM_SWING(f) * Math.PI) / 180;
  const [dx, dy] = [HAND[0] - SHOULDER[0], HAND[1] - SHOULDER[1]];
  const rx = SHOULDER[0] + dx * Math.cos(a) - dy * Math.sin(a);
  const ry = SHOULDER[1] + dx * Math.sin(a) + dy * Math.cos(a);
  return [rx - HAND[0], ry - HAND[1] + BOB(f)];
}

/** String: each point blends the fist's and the kite's motion by how far along it is. */
function stringDeform(x: number, _y: number, f: number): Vec {
  const u = Math.min(1, Math.max(0, (x - HAND[0]) / (KITE_ANCHOR[0] - HAND[0])));
  const h = handOffset(f);
  const k = KITE_DRIFT(f);
  return [h[0] * (1 - u) + k[0] * u, h[1] * (1 - u) + k[1] * u];
}

/** Tail: rides the kite, plus a wave that grows with distance from where it's tied on. */
function tailDeform(x: number, y: number, f: number): Vec {
  const s = Math.hypot(x - TAIL_ATTACH[0], y - TAIL_ATTACH[1]);
  const amp = 1.3 * Math.min(1, s / 25);
  const phase = TAU * (s / 40 - f / TAIL_PERIOD);
  const k = KITE_DRIFT(f);
  return [k[0] + amp * Math.sin(phase), k[1] + amp * 0.6 * Math.cos(phase)];
}

export default function kiteChild(_model: SvgModel): Rig {
  const frontLeg = [14, ...range(15, 30)]; // leg + sneaker
  const backLeg = [44, ...range(45, 59)];
  const backArm = [13, ...range(132, 137)]; // arm + finger marks
  const raisedArm = [70, 71, ...range(126, 131)]; // arm + string handle + finger marks
  const torsoAndHead = [...range(31, 43), ...range(60, 69), ...range(92, 125)];

  return {
    frames: FRAMES,
    parts: [
      { name: "runner", select: torsoAndHead, offset: { fn: (f) => [0, BOB(f)] } },
      {
        name: "front-leg",
        parent: "runner",
        select: frontLeg,
        pivot: FRONT_HIP,
        rotation: { fn: sine(STRIDE, LEG_SWING) },
      },
      {
        name: "back-leg",
        parent: "runner",
        select: backLeg,
        pivot: BACK_HIP,
        drawBelow: SKIRT,
        rotation: { fn: sine(STRIDE, LEG_SWING, 0.5) },
      },
      {
        name: "back-arm",
        parent: "runner",
        select: backArm,
        pivot: [19.5, 61],
        rotation: { fn: sine(STRIDE, 5, 0.5) },
      },
      { name: "skirt-lining", parent: "runner", select: [SKIRT_LINING], drawBelow: SKIRT },
      { name: "raised-arm", parent: "runner", select: raisedArm, pivot: SHOULDER, rotation: { fn: ARM_SWING } },
      { name: "string", select: [72], deform: { fn: stringDeform, step: 2 } },
      { name: "kite", select: range(86, 91), offset: { fn: KITE_DRIFT } },
      { name: "tail", select: [73], deform: { fn: tailDeform, step: 2 } },
      { name: "bows", select: range(74, 85), deform: { fn: tailDeform, step: 2, rigid: true } },
    ],
  };
}
