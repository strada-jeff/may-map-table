import { CONFIG } from "../config";
import { ROUTE_EXIT_FADE_MS } from "./routePanes";

const MAX_OPACITY = 0.5;

// Padding beyond the artwork's own bounds so a fast pan can't expose a
// sliver of undimmed (and still clickable) map at the edge before the
// wrapper's own pan clamping catches up.
const EDGE_PADDING = 512;

/**
 * Darkens the whole map — base artwork and every pin — while directions are
 * active, so the route/arrow/active pin/"you are here" badge drawn after
 * this in the same SVG (see RouteEffects/RouteLine) are the only bright
 * things left. Plain DOM order handles the stacking now — no separate pane
 * needed, since everything lives in one shared coordinate space.
 */
export default function RouteDimOverlay({
  fadeOut,
}: {
  /** True while RouteContext is fading this out ahead of a route change. */
  fadeOut: boolean;
}) {
  return (
    <rect
      className="pointer-events-none"
      x={-EDGE_PADDING}
      y={-EDGE_PADDING}
      width={CONFIG.map.width + 2 * EDGE_PADDING}
      height={CONFIG.map.height + 2 * EDGE_PADDING}
      fill="#254a5d"
      opacity={fadeOut ? 0 : MAX_OPACITY}
      style={{ transition: `opacity ${ROUTE_EXIT_FADE_MS}ms ease` }}
    />
  );
}
