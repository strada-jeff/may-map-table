import type { Point } from "../routing/types";
import { pinSize } from "../hooks/mapTransform";
import type { ArtworkPiece } from "../types/artwork";
import { MARKER_SIZE } from "./MarkerIcons";

/**
 * Which side of the route destination's circle its directions label (name,
 * street, close button — PinMarker) hangs on. Figma draws it below; the
 * others are for when below would cover the route line or the place's art.
 */
export type LabelSide = "below" | "right" | "left" | "above";
export type LabelSize = { width: number; height: number };

// Preferred first: a tie (usually nothing in the way anywhere) keeps Figma's
// layout.
const SIDES: readonly LabelSide[] = ["below", "right", "left", "above"];
export const LABEL_GAP_PX = 30; // from the marker box to the label, whichever side (Figma's is 16, below)
const CLEARANCE_PX = 12; // around the label when checking what it covers
// Route length under the label counts this many px² each: the line is
// thin, but covering it hides where the visitor is going.
const ROUTE_WEIGHT = 40;

type Rect = readonly [number, number, number, number]; // left, top, right, bottom

/**
 * The label's rectangle on `side`, in the marker's full-size px relative
 * to its anchor (the frame markerBoxes uses): centered on the circle's
 * axis, a gap clear of the marker box.
 */
export function labelRect(side: LabelSide, { width, height }: LabelSize, [anchorX, anchorY]: readonly [number, number]): Rect {
  const left = -anchorX;
  const top = -anchorY;
  const center = MARKER_SIZE / 2;
  switch (side) {
    case "below":
      return [left + center - width / 2, top + MARKER_SIZE + LABEL_GAP_PX, left + center + width / 2, top + MARKER_SIZE + LABEL_GAP_PX + height];
    case "above":
      return [left + center - width / 2, top - LABEL_GAP_PX - height, left + center + width / 2, top - LABEL_GAP_PX];
    case "right":
      return [left + MARKER_SIZE + LABEL_GAP_PX, top + center - height / 2, left + MARKER_SIZE + LABEL_GAP_PX + width, top + center + height / 2];
    case "left":
      return [left - LABEL_GAP_PX - width, top + center - height / 2, left - LABEL_GAP_PX, top + center + height / 2];
  }
}

type Choice = {
  /** Where the marker is drawn (its iconOffset-nudged position), map units. */
  position: Point;
  anchor: readonly [number, number];
  route: readonly Point[];
  piece: ArtworkPiece | undefined;
  /** The scale the route is framed at: sets how much map the label covers. */
  scale: number;
  size: LabelSize;
};

/**
 * The side where the label covers the least of the route line and the
 * destination's art, at the scale the route will be framed at. The label
 * keeps a fixed screen size while the map zooms (KeepScale), so map
 * features are brought into the marker's own px for the comparison.
 */
export function chooseLabelSide({ position, anchor, route, piece, scale, size }: Choice): { side: LabelSide; costs: Record<LabelSide, number> } {
  const k = scale / pinSize(scale); // map units -> marker px
  const local = ([x, y]: Point): Point => [(x - position[0]) * k, (y - position[1]) * k];
  const line = route.map(local);
  const art: Rect | null = piece
    ? (() => {
        const [x, y, w, h] = piece.box;
        const [l, t] = local([x, y]);
        const [r, b] = local([x + w, y + h]);
        return [l, t, r, b];
      })()
    : null;

  const costs = {} as Record<LabelSide, number>;
  for (const side of SIDES) {
    const [l, t, r, b] = labelRect(side, size, anchor);
    const rect: Rect = [l - CLEARANCE_PX, t - CLEARANCE_PX, r + CLEARANCE_PX, b + CLEARANCE_PX];
    let routeInside = 0;
    for (let i = 1; i < line.length; i++) routeInside += clippedLength(line[i - 1], line[i], rect);
    costs[side] = routeInside * ROUTE_WEIGHT + (art ? overlapArea(rect, art) : 0);
  }
  // Strictly lower only, so ties fall to the earlier (preferred) side.
  const side = SIDES.reduce((best, s) => (costs[s] < costs[best] ? s : best));
  return { side, costs };
}

function overlapArea(a: Rect, b: Rect): number {
  return Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
}

/** Length of segment p–q inside `rect` (Liang–Barsky clipping). */
function clippedLength(p: Point, q: Point, [l, t, r, b]: Rect): number {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  let t0 = 0;
  let t1 = 1;
  for (const [edge, delta] of [
    [p[0] - l, -dx],
    [r - p[0], dx],
    [p[1] - t, -dy],
    [b - p[1], dy],
  ] as const) {
    if (delta === 0) {
      if (edge < 0) return 0;
      continue;
    }
    const ratio = edge / delta;
    if (delta < 0) t0 = Math.max(t0, ratio);
    else t1 = Math.min(t1, ratio);
    if (t0 > t1) return 0;
  }
  return (t1 - t0) * Math.hypot(dx, dy);
}
