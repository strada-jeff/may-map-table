import { useLayoutEffect, useRef } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { ROUTE_EXIT_FADE_MS } from "./routePanes";

const MAX_OPACITY = 0.5;

// Extra margin, in *screen* pixels, beyond the viewport-covering rect below
// — so a fast pan/zoom mid-gesture can't expose a sliver of undimmed (and
// still clickable) map at the edge before this effect's next update lands.
const EDGE_PADDING_PX = 256;

/**
 * Darkens the whole map — base artwork and every pin — while directions are
 * active, so the route/arrow/active pin/"you are here" badge drawn after
 * this in the same SVG (see RouteLine) are the only bright things left.
 * Plain DOM order handles the pin stacking now — no separate pane needed,
 * since everything lives in one shared coordinate space (the active pin
 * re-asserts itself above this with its own z-index — see
 * LocationMarker/ModelHomeMarker's `active` prop).
 *
 * Sized and positioned imperatively (same technique as KeepScale) rather
 * than as a fixed content-space rect: this SVG lives inside the same
 * panned/zoomed content div as the artwork, so a static content-space size
 * only covers the actual viewport at one specific zoom/pan combination —
 * at any other, the transformed rect's screen-space footprint shrinks or
 * drifts and leaves the wrapper's own background exposed at the edges.
 * Reading the live transform and covering `wrapper size / scale` in
 * content units, recentered on the current pan, guarantees full coverage
 * at any zoom/pan the map can reach.
 */
export default function RouteDimOverlay({
  fadeOut,
}: {
  /** True while RouteContext is fading this out ahead of a route change. */
  fadeOut: boolean;
}) {
  const controls = useControls();
  const rectRef = useRef<SVGRectElement | null>(null);

  useLayoutEffect(() => {
    const apply = () => {
      const rect = rectRef.current;
      const wrapper = controls.instance.wrapperComponent;
      if (!rect || !wrapper) return;
      const { width, height } = wrapper.getBoundingClientRect();
      const { positionX, positionY, scale } = controls.instance.state;
      const pad = EDGE_PADDING_PX / scale;
      rect.setAttribute("x", String(-positionX / scale - pad));
      rect.setAttribute("y", String(-positionY / scale - pad));
      rect.setAttribute("width", String(width / scale + 2 * pad));
      rect.setAttribute("height", String(height / scale + 2 * pad));
    };
    apply();
    return controls.instance.onChange(apply);
  }, [controls]);

  return (
    <rect
      ref={rectRef}
      className="pointer-events-none"
      fill="#254a5d"
      opacity={fadeOut ? 0 : MAX_OPACITY}
      style={{ transition: `opacity ${ROUTE_EXIT_FADE_MS}ms ease` }}
    />
  );
}
