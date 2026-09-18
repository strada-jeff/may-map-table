import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import type { MapSpace } from "../routing";
import { ROUTE_DIM_PANE, ROUTE_EXIT_FADE_MS } from "./routePanes";

const MAX_OPACITY = 0.5;

// ArtworkTiles is a GridLayer with a `bounds` option — Leaflet only skips
// tiles entirely *outside* those bounds, it doesn't crop the edge tiles
// that straddle the line, so the rendered artwork can bleed past
// space.latLngBounds by up to a tile's worth of map units. Padding the dim
// box out this far absorbs that bleed instead of leaving a sliver of
// undimmed (and still clickable) map/pin visible at the artwork's border.
// maxBounds already stops the map from panning far enough to expose the
// padding itself.
const EDGE_PADDING = 512;

/**
 * Darkens the whole map — base artwork and every pin — while directions are
 * active, so the route/arrow/active pin/"you are here" badge drawn in the
 * pane above this one (see RouteEffects) are the only bright things left.
 *
 * Positioned manually from layerPoint corners and portaled straight into
 * the pane, the same way RouteLine draws its own polyline — deliberately
 * *not* a react-leaflet <Rectangle>. A <Rectangle> goes through Leaflet's
 * SVG renderer, which — regardless of what triggered the zoom change,
 * including RouteEffects' own flyToBounds — visually approximates every
 * intermediate frame of a zoom by CSS-scaling its whole SVG element from
 * whatever it last actually drew, and only truly redraws on 'moveend'.
 * That's the same "balloons mid-transition" issue RouteLine's own comments
 * describe for a thick stroke, except here it meant the dim box could
 * visibly stop covering the real viewport for the length of any auto-pan,
 * not just look briefly thicker/thinner. Recomputing the box's own pixel
 * rect on every real 'zoom' tick (like RouteLine does) sidesteps that
 * renderer entirely, and panning alone still repositions it for free along
 * with everything else via the shared _mapPane transform.
 */
export default function RouteDimOverlay({
  space,
  fadeOut,
}: {
  space: MapSpace;
  /** True while RouteEffects is fading this out ahead of a route change. */
  fadeOut: boolean;
}) {
  const map = useMap();
  const pane = map.getPane(ROUTE_DIM_PANE) ?? map.createPane(ROUTE_DIM_PANE);
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    function compute() {
      // MapSpace flips y (lat = maxY - y) between artwork space and
      // Leaflet's lat/lng, so the artwork's smallest-y corner is the one
      // that ends up on top on screen — use minY/maxY exactly backwards
      // here and this silently produces a negative height, which the
      // browser just drops (no visible box at all).
      const topLeft = map.latLngToLayerPoint(
        space.toLatLng([space.minX - EDGE_PADDING, space.minY - EDGE_PADDING]),
      );
      const bottomRight = map.latLngToLayerPoint(
        space.toLatLng([space.maxX + EDGE_PADDING, space.maxY + EDGE_PADDING]),
      );
      setRect({
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      });
    }
    // rAF-coalesced for the same reason as RouteLine: 'zoom' can fire once
    // per frame during flyTo.
    let rafId = 0;
    function update() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(compute);
    }
    compute();
    map.on("zoom viewreset resize", update);
    return () => {
      cancelAnimationFrame(rafId);
      map.off("zoom viewreset resize", update);
    };
  }, [map, space]);

  if (!rect) return null;

  return createPortal(
    <div
      className="pointer-events-none"
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        background: "#254a5d",
        opacity: fadeOut ? 0 : MAX_OPACITY,
        transition: `opacity ${ROUTE_EXIT_FADE_MS}ms ease`,
      }}
    />,
    pane,
  );
}
