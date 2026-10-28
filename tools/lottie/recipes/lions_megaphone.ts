import paper from "paper/dist/paper-core";
import type { Part, Rig, Vec } from "../lottie";
import type { Shape, SvgModel } from "../svg-model";

// "The triangle elements coming out of the megaphone grow and contract."
//
// After review: intermittent and stop-motion rather than a constant smooth
// pulse — a short "shout" where the triangles jump between sizes, held a
// beat each, while the whole megaphone hops; then it rests as drawn.
const FRAMES = 72;

// The three sound-blast triangles, each scaled out from its point at the
// megaphone's mouth so it shoots out and pulls back.
const BLASTS = [14, 15, 16];
const HOLD = 4; // frames per stop-motion step
const SHOUT = [80, 112, 94, 116, 100]; // percent, one per step; ends at rest
const STAGGER = 2; // frames each triangle trails the one before

// Two quick hops across the shout.
const SHOUT_FRAMES = SHOUT.length * HOLD;
const HOP_HEIGHT = 1.2; // px
const HOPS = 2;

/** The triangle's vertex nearest the mouth (its leftmost point). */
function mouthPoint(shape: Shape): Vec {
  let best: Vec = [Infinity, 0];
  const paths = shape.path instanceof paper.CompoundPath ? shape.path.children : [shape.path];
  for (const path of paths) {
    if (!(path instanceof paper.Path)) continue;
    for (const { point } of path.segments) if (point.x < best[0]) best = [point.x, point.y];
  }
  return best;
}

function hop(f: number): Vec {
  if (f >= SHOUT_FRAMES) return [0, 0];
  return [0, -HOP_HEIGHT * Math.abs(Math.sin((Math.PI * HOPS * f) / SHOUT_FRAMES))];
}

export default function lionsMegaphone({ shapes }: SvgModel): Rig {
  const body = shapes.map((s) => s.index).filter((i) => !BLASTS.includes(i));
  const parts: Part[] = [
    { name: "megaphone", select: body, offset: { fn: hop, step: 1 } },
    ...BLASTS.map(
      (index, i): Part => ({
        name: `blast-${i}`,
        parent: "megaphone",
        select: [index],
        pivot: mouthPoint(shapes[index]),
        scale: {
          fn: (f) => {
            const step = Math.floor((f - i * STAGGER) / HOLD);
            const s = step >= 0 && step < SHOUT.length ? SHOUT[step] : 100;
            return [s, s];
          },
          step: 1,
          hold: true,
        },
      }),
    ),
  ];
  // The longest blast reaches the frame's right edge; 116% overshoots it ~3px,
  // and the hop lifts the top blast ~1px above the frame.
  return { frames: FRAMES, parts, pad: 8 };
}
