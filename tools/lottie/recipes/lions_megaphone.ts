import paper from "paper/dist/paper-core";
import type { Part, Rig, Vec } from "../lottie";
import type { Shape, SvgModel } from "../svg-model";

// "The triangle elements coming out of the megaphone grow and contract."
const FRAMES = 60;

// The three sound-blast triangles, each scaled out from its point at the
// megaphone's mouth so it shoots out and pulls back, staggered so they pulse
// in turn rather than all at once.
const BLASTS = [14, 15, 16];
const MIN_SCALE = 70;
const MAX_SCALE = 112;

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

export default function lionsMegaphone({ shapes }: SvgModel): Rig {
  const parts: Part[] = BLASTS.map((index, i) => ({
    name: `blast-${i}`,
    select: [index],
    pivot: mouthPoint(shapes[index]),
    scale: {
      fn: (f) => {
        // Eased pulse, a third of a cycle apart per triangle.
        const t = (Math.sin(2 * Math.PI * (f / (FRAMES / 2) - i / 3)) + 1) / 2;
        const s = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t;
        return [s, s];
      },
    },
  }));
  // The longest blast reaches the frame's right edge; 112% overshoots it ~2px.
  return { frames: FRAMES, parts, pad: 8 };
}
