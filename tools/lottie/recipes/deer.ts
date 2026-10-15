import type { Rig, Vec } from "../lottie";
import { clamp01, rotationOffset } from "../motion";
import type { SvgModel } from "../svg-model";

// "The deer's tail and ears flutter up and down intermittently. Its eyes
// occasionally blink."
//
// The tan silhouette (shape 2) is one path for body, head, outer ears and
// tail, so ears and tail bend rather than rotate: each is a rotation about
// its root applied with a weight that's full past the root and zero over
// the head/body. The pale inner-ear and tail patches ride the same fields.
// One 3s loop: left ear, tail, right ear, blink, each with idle gaps between.
const FRAMES = 90;

const LEFT_EAR_ROOT: Vec = [8, 14.5];
const RIGHT_EAR_ROOT: Vec = [16, 14];
const TAIL_ROOT: Vec = [46.5, 31];

const LEFT_EAR_TWITCH = twitch(10, 8);
const TAIL_FLICK = twitch(30, 12);
const RIGHT_EAR_TWITCH = twitch(52, 8);
const BLINK = twitch(70, 5);

const EAR_ANGLE = 18; // degrees, tip up
const TAIL_ANGLE = 28; // degrees, tip out

/** 0 → 1 → 0 over [start, start + length) frames, 0 elsewhere. */
function twitch(start: number, length: number) {
  return (f: number) => (f >= start && f < start + length ? Math.sin((Math.PI * (f - start)) / length) : 0);
}

function earsAndTail(x: number, y: number, f: number): Vec {
  const left = clamp01((7.5 - x) / 3) * clamp01((19 - y) / 2);
  const right = clamp01((x - 16.5) / 2) * clamp01((16.5 - y) / 2) * clamp01((24 - x) / 2);
  const tail = clamp01((x - 45.5) / 3) * clamp01((47 - y) / 4) * clamp01((y - 26) / 3);
  let dx = 0;
  let dy = 0;
  for (const [w, root, deg] of [
    [left, LEFT_EAR_ROOT, EAR_ANGLE * LEFT_EAR_TWITCH(f)],
    [right, RIGHT_EAR_ROOT, -EAR_ANGLE * RIGHT_EAR_TWITCH(f)],
    [tail, TAIL_ROOT, -TAIL_ANGLE * TAIL_FLICK(f)],
  ] as [number, Vec, number][]) {
    if (w === 0 || deg === 0) continue;
    const [rx, ry] = rotationOffset(root, x, y, deg * w);
    dx += rx;
    dy += ry;
  }
  return [dx, dy];
}

const blinkScale = { fn: (f: number): Vec => [100, 100 - 90 * BLINK(f)], step: 1 };

export default function deer(_model: SvgModel): Rig {
  return {
    frames: FRAMES,
    parts: [
      // silhouette, inner ears, tail patch
      { name: "flutter", select: [2, 3, 4, 13], deform: { fn: earsAndTail, step: 3 } },
      { name: "left-eye", select: [25, 26, 27], pivot: [10.75, 19.4], scale: blinkScale },
      { name: "right-eye", select: [30, 31, 32], pivot: [17.45, 19.3], scale: blinkScale },
    ],
  };
}
