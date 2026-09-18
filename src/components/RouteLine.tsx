import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { MapSpace, type Point } from "../routing";

type RouteLineProps = {
  space: MapSpace;
  coordinates: readonly Point[];
};

const PANE_NAME = "routeLine";

/**
 * Drawn as a plain SVG overlay in its own Leaflet pane, using layer-point
 * coordinates (map.latLngToLayerPoint) instead of react-leaflet's
 * <Polyline>. Every pane shares one ancestor (map._mapPane) that Leaflet
 * translates via CSS for a plain drag, so panning repositions this line for
 * free along with tiles/markers/everything else — no recompute needed on
 * 'move' at all, only on 'zoom'/'viewreset'/'resize', when the projection
 * itself actually changes.
 *
 * Known tradeoff, deliberately deferred: Leaflet's discrete,
 * CSS-transition-driven zoom animation (e.g. the +/- zoom control) scales
 * _mapPane for the duration of the transition, and every pane — including
 * this one — inherits that scale, which can visibly balloon a thick stroke
 * mid-transition. RouteEffects' own flyToBounds doesn't hit this (it drives
 * real per-frame reprojection, not a CSS scale approximation), so this is
 * fine for how the route line is actually shown today; revisit if that
 * changes.
 */
export default function RouteLine({ space, coordinates }: RouteLineProps) {
  const map = useMap();
  const latLngs = useMemo(() => space.toLatLngs(coordinates), [space, coordinates]);
  const [points, setPoints] = useState<[number, number][]>([]);
  const pane = map.getPane(PANE_NAME) ?? map.createPane(PANE_NAME);

  useEffect(() => {
    function compute() {
      setPoints(
        latLngs.map((latLng) => {
          const p = map.latLngToLayerPoint(latLng);
          return [p.x, p.y];
        }),
      );
    }
    // 'zoom' can still fire once per frame during flyTo — rAF-coalesce so a
    // fast transition can't queue more re-renders than the browser can
    // paint, same as CompassControl.
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
  }, [map, latLngs]);

  if (points.length < 2) return null;

  const pointsAttr = points.map(([x, y]) => `${x},${y}`).join(" ");
  const size = map.getSize();

  return createPortal(
    // width/height give the svg a sane box matching the viewport (an <svg>
    // with no explicit size defaults to a degenerate/inconsistent one) —
    // but that box is pinned to the pane's local origin, and this pane
    // isn't re-measured on pan (on purpose — see above), so the box itself
    // drifts out of alignment with the route's actual layer-point
    // coordinates as soon as the map moves. overflow: visible is what
    // actually prevents clipping once that happens; it's not a z-index
    // issue — an <svg> clips to its own box by default (UA stylesheet),
    // and the polyline's own coordinates are already correct regardless of
    // where that box sits.
    <svg
      className="pointer-events-none"
      style={{ width: size.x, height: size.y, overflow: "visible" }}
    >
      <polyline points={pointsAttr} fill="none" stroke="#254a5d" strokeWidth={10} strokeOpacity={0.9} />
      <polyline points={pointsAttr} fill="none" stroke="#f2a03d" strokeWidth={5} strokeOpacity={1} />
    </svg>,
    pane,
  );
}
