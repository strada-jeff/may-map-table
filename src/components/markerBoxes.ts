import type { MarkerBox } from "../hooks/mapTransform";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { FLAG_BODY_HEIGHT, FLAG_BODY_WIDTH } from "./LottieFlag";
import { BALLOON_BODY_HEIGHT, BALLOON_BODY_WIDTH } from "./LottieBalloon";

// The flag's pole-base anchor in its body box (measured from the
// base-shadow ellipse path) — the flag "plants" there, not at its
// bottom-center, since the fabric waves off to the right of the pole.
export const FLAG_ANCHOR_X = 14;
export const FLAG_ANCHOR_Y = 213;

// Full-size screen boxes around each marker's foot, as [left, top, right,
// bottom] px — flags and balloons are drawn at their bodies' native size
// (see LocationMarker/ModelHomeMarker).
const FLAG_BOX = [-FLAG_ANCHOR_X, -FLAG_ANCHOR_Y, FLAG_BODY_WIDTH - FLAG_ANCHOR_X, FLAG_BODY_HEIGHT - FLAG_ANCHOR_Y] as const;
const BALLOON_BOX = [-BALLOON_BODY_WIDTH / 2, -BALLOON_BODY_HEIGHT, BALLOON_BODY_WIDTH / 2, 0] as const;

/**
 * A pin's flag or balloon as a box for camera fits, so a fit frames the
 * whole marker, not just its foot — grown by `bufferPx` on every side to
 * also take in the art around it.
 */
export function markerBox(pin: DestinationPin, bufferPx = 0): MarkerBox {
  const [l, t, r, b] = pin.kind === "model-home" ? BALLOON_BOX : FLAG_BOX;
  return { point: pin.position, box: [l - bufferPx, t - bufferPx, r + bufferPx, b + bufferPx] };
}
