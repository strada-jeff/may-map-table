import type { MarkerBox } from "../hooks/mapTransform";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { BALLOON_ANCHOR, FLAG_ANCHOR, MARKER_SIZE } from "./MarkerIcons";
import { labelRect, type LabelSide, type LabelSize } from "./directionsLabel";

/** Where a pin's icon meets the map, in its MARKER_SIZE box. */
export function markerAnchor(pin: DestinationPin): readonly [number, number] {
  return pin.kind === "model-home" ? BALLOON_ANCHOR : FLAG_ANCHOR;
}

/**
 * A pin's flag or balloon as a box for camera fits, so a fit frames the
 * whole marker, not just its foot — as full-size screen px around its
 * anchor, [left, top, right, bottom]: the MARKER_SIZE box it's drawn in
 * (see PinMarker). With `label`, the route destination's directions label
 * on its side too. Grown by `bufferPx` on every side to also take in the
 * art around it.
 */
export function markerBox(pin: DestinationPin, bufferPx = 0, label?: { side: LabelSide; size: LabelSize }): MarkerBox {
  const [x, y] = markerAnchor(pin);
  let [l, t, r, b] = [-x, -y, MARKER_SIZE - x, MARKER_SIZE - y];
  if (label) {
    const [ll, lt, lr, lb] = labelRect(label.side, label.size, [x, y]);
    [l, t, r, b] = [Math.min(l, ll), Math.min(t, lt), Math.max(r, lr), Math.max(b, lb)];
  }
  return { point: pin.position, box: [l - bufferPx, t - bufferPx, r + bufferPx, b + bufferPx] };
}
