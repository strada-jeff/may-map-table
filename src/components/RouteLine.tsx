import { useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import gsap from "gsap";
import { CONFIG } from "../config";
import { distance, resolveMapPoint, type MapSpace } from "../routing";
import type { ActiveRoute } from "../types/routing";
import { ROUTE_ACTIVE_PANE, ROUTE_EXIT_FADE_MS } from "./routePanes";
import YouAreHerePinArtwork, {
  CIRCLE_CX as BADGE_CIRCLE_CX,
  CIRCLE_CY as BADGE_CIRCLE_CY,
  CIRCLE_RADIUS as BADGE_CIRCLE_RADIUS,
} from "./YouAreHerePinIcon";

type RouteLineProps = {
  space: MapSpace;
  route: ActiveRoute;
  /** True while RouteEffects is fading this out ahead of a route change. */
  fadeOut: boolean;
};

// Static ids are fine — RouteEffects only ever renders one RouteLine at a
// time (a new route replaces the old one rather than adding a second).
const MASK_ID = "route-line-reveal-mask";
const BADGE_CUTOUT_MASK_ID = "route-line-badge-cutout-mask";
const SKETCH_FILTER_ID = "route-line-sketch-filter";
const ARROW_SKETCH_FILTER_ID = "route-arrow-sketch-filter";
const BADGE_SKETCH_FILTER_ID = "route-line-badge-sketch-filter";
const DRAW_DURATION_S = 3;
const ARROW_POP_DURATION_S = 0.35;
// 25% shorter than the original "36 22".
const DASH_LENGTH = 27;
const DASH_GAP = 16.5;
const DASH_ARRAY = `${DASH_LENGTH} ${DASH_GAP}`;
// Figma's own filter on the comp's path (fractal-noise feTurbulence run
// through feDisplacementMap), tuned for the line's actual stroke width.
const SKETCH_BASE_FREQUENCY = 0.25;
const SKETCH_DISPLACEMENT_SCALE = 10;
// 25% narrower than the originals (18/12/26) — kept proportional so the
// mask's reveal corridor still comfortably covers the widest visible
// stroke plus its rounded caps.
const SHADOW_STROKE_WIDTH = 10.5;
const LINE_STROKE_WIDTH = 8;
const MASK_STROKE_WIDTH = 12.5;
// Local-space triangle, tip at (+size, 0) — rotated to the final segment's
// angle at render time, so 0deg here means "pointing along +x".
const ARROW_SIZE = 18;

// The "you are here" badge's on-screen circle radius. Drawing it here
// (rather than as a separate Marker/<img>, which is how this used to work)
// means its ring can reuse the line's own DASH_LENGTH/DASH_GAP/
// SHADOW_STROKE_WIDTH/LINE_STROKE_WIDTH/sketch-filter constants directly —
// one real definition instead of two files trying to independently arrive
// at the same numbers. (An <img>-referenced external SVG turned out not to
// reliably apply a sketch filter through Chrome's <img> pipeline either,
// so inlining this also sidesteps that.)
const BADGE_RADIUS_PX = 54;
const BADGE_SCALE = BADGE_RADIUS_PX / BADGE_CIRCLE_RADIUS;
// The badge's ring is drawn in the artwork's native (larger) coordinate
// space, then shrunk by BADGE_SCALE along with the rest of the badge — so
// every size-like value here is the line's real on-screen target divided
// (or, for spatial frequency, multiplied) by that same factor, and comes
// back out at the exact same real pixels once the shrink is applied.
const BADGE_RING_STROKE_WIDTH = LINE_STROKE_WIDTH / BADGE_SCALE;
const BADGE_RING_SHADOW_STROKE_WIDTH = SHADOW_STROKE_WIDTH / BADGE_SCALE;
const BADGE_RING_DASH_ARRAY = `${DASH_LENGTH / BADGE_SCALE} ${DASH_GAP / BADGE_SCALE}`;
const BADGE_SKETCH_BASE_FREQUENCY = SKETCH_BASE_FREQUENCY * BADGE_SCALE;
const BADGE_SKETCH_DISPLACEMENT_SCALE = SKETCH_DISPLACEMENT_SCALE / BADGE_SCALE;

/**
 * Drawn as a plain SVG overlay in its own Leaflet pane, using layer-point
 * coordinates (map.latLngToLayerPoint) instead of react-leaflet's
 * <Polyline>. Every pane shares one ancestor (map._mapPane) that Leaflet
 * translates via CSS for a plain drag, so panning repositions this line for
 * free along with tiles/markers/everything else — no recompute needed on
 * 'move' at all, only on 'zoom'/'viewreset'/'resize', when the projection
 * itself actually changes.
 *
 * Also draws the "you are here" badge, in the same <svg> — see BADGE_*
 * above. That used to be a separate Leaflet Marker, which meant its ring
 * needed its own copy of the line's stroke/dash/filter numbers (scaled for
 * a totally different rendering context) kept in sync by hand, plus a
 * zIndexOffset hack to paint above the line and a second layerPoint
 * computation for the mask cutout below. Drawing it here instead means the
 * ring is *derived* from the line's own constants, "above the line" is
 * just paint order, and the cutout uses the exact same badgePoint that
 * positions the badge.
 *
 * The dashed look and the "draw in" animation are two separate layers on
 * purpose: an SVG <mask> containing a solid stroke whose strokeDashoffset
 * is tweened from the path's full length down to 0 reveals a *growing*
 * solid line, and the actual dashed/dotted strokes are drawn underneath
 * that mask — so the dash pattern doesn't shift or "march" as it animates,
 * it just gets progressively uncovered.
 *
 * Leaflet's discrete, CSS-transition-driven zoom animation (e.g. the +/-
 * zoom control) scales _mapPane for the duration of the transition, and
 * every pane — including this one — inherits that scale. `vector-effect:
 * non-scaling-stroke` on every stroked polyline (mask included) keeps
 * stroke width constant in screen pixels through that, so it no longer
 * balloons mid-transition — it only ever affects the path's own geometry
 * (which should track the map), not how thick the line paints.
 */
export default function RouteLine({ space, route, fadeOut }: RouteLineProps) {
  const map = useMap();
  const latLngs = useMemo(
    () => space.toLatLngs(route.coordinates),
    [space, route.coordinates],
  );
  // CONFIG.routing.youAreHereBadgePoint, not the route's own originId —
  // recomputed alongside `points` so the badge (and the cutout it drives)
  // track through zoom/pan exactly like the line does.
  const badgeLatLng = useMemo(
    () => space.toLatLng(resolveMapPoint(CONFIG.routing.youAreHereBadgePoint)),
    [space],
  );
  const [points, setPoints] = useState<[number, number][]>([]);
  const [badgePoint, setBadgePoint] = useState<[number, number] | null>(null);
  const [drawT, setDrawT] = useState(0);
  const [arrowT, setArrowT] = useState(0);
  const [badgeVisible, setBadgeVisible] = useState(false);
  // Created (and z-indexed) by RouteEffects before this ever mounts — the
  // fallback here only matters if RouteLine is ever used on its own.
  const pane =
    map.getPane(ROUTE_ACTIVE_PANE) ?? map.createPane(ROUTE_ACTIVE_PANE);

  // useLayoutEffect, not useEffect, for both effects below: a route swap
  // (picking a new destination while one's already displayed) re-renders
  // this same RouteLine instance with new props but still-stale state from
  // the previous route for one commit — plain useEffect defers running
  // until *after* the browser paints, so that stale frame (old route's
  // points, drawT/badgeVisible left at their finished values from before)
  // was genuinely getting painted and shown as a visible flash before
  // these effects caught up and reset it. useLayoutEffect runs before
  // paint, so the reset lands in the same frame as the new props.
  useLayoutEffect(() => {
    function compute() {
      setPoints(
        latLngs.map((latLng) => {
          const p = map.latLngToLayerPoint(latLng);
          return [p.x, p.y];
        }),
      );
      const bp = map.latLngToLayerPoint(badgeLatLng);
      setBadgePoint([bp.x, bp.y]);
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
  }, [map, latLngs, badgeLatLng]);

  // Plays once per route activation. Keyed on `route` itself — a fresh
  // object every routeTo() call, even re-clicking the same destination —
  // rather than on `points`, so it can't restart mid-draw on its own. It
  // still waits for RouteEffects' flyToBounds to actually settle first
  // (via 'moveend'), rather than starting immediately alongside it, so the
  // line isn't drawing in — and the badge isn't fading in — while the
  // viewport is still flying underneath them.
  useLayoutEffect(() => {
    setDrawT(0);
    setArrowT(0);
    setBadgeVisible(false);
    let timeline: gsap.core.Timeline | null = null;

    function startDraw() {
      setBadgeVisible(true);
      const drawProxy = { t: 0 };
      const arrowProxy = { t: 0 };
      timeline = gsap.timeline();
      timeline
        .to(drawProxy, {
          t: 1,
          duration: DRAW_DURATION_S,
          ease: "power2.inOut",
          onUpdate: () => setDrawT(drawProxy.t),
        })
        .to(
          arrowProxy,
          {
            t: 1,
            duration: ARROW_POP_DURATION_S,
            ease: "back.out(2.5)",
            onUpdate: () => setArrowT(arrowProxy.t),
          },
          "-=0.05",
        );
    }

    map.once("moveend", startDraw);
    return () => {
      map.off("moveend", startDraw);
      timeline?.kill();
    };
  }, [map, route]);

  if (points.length < 2) return null;

  const pointsAttr = points.map(([x, y]) => `${x},${y}`).join(" ");
  let totalLength = 0;
  for (let i = 1; i < points.length; i++)
    totalLength += distance(points[i - 1]!, points[i]!);
  const dashOffset = totalLength * (1 - drawT);

  const [endX, endY] = points[points.length - 1]!;
  const [prevX, prevY] = points[points.length - 2]!;
  const arrowAngle = (Math.atan2(endY - prevY, endX - prevX) * 180) / Math.PI;

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
      style={{
        width: size.x,
        height: size.y,
        overflow: "visible",
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${ROUTE_EXIT_FADE_MS}ms ease`,
      }}
    >
      <defs>
        {/* Both masks below get an explicit userSpaceOnUse region spanning
            the whole canvas — masks default to objectBoundingBox with a
            region computed from the *masked element's own geometry*, and a
            polyline whose points happen to be perfectly horizontal or
            vertical has a bounding box that's zero-width or zero-height in
            that axis. 120% of zero is still zero, so the mask's effective
            region collapses to nothing and hides everything it's applied
            to — not just near the badge, the entire line. Fixed absolute
            coordinates sidestep that regardless of the path's own shape. */}
        {/* Cuts a hole where the badge's own opaque circle sits, so the
            line doesn't visibly poke out from behind it — the badge
            already paints on top (it's simply drawn after, below), but its
            own artwork has transparent padding around the circle for the
            "YOU ARE HERE" arc, so overlap alone isn't quite enough right at
            the badge's own edge. */}
        <mask
          id={BADGE_CUTOUT_MASK_ID}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={size.x}
          height={size.y}
        >
          <rect x={0} y={0} width={size.x} height={size.y} fill="#fff" />
          {badgePoint && (
            <circle
              cx={badgePoint[0]}
              cy={badgePoint[1]}
              r={BADGE_RADIUS_PX}
              fill="#000"
            />
          )}
        </mask>
        <mask
          id={MASK_ID}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={size.x}
          height={size.y}
        >
          <polyline
            points={pointsAttr}
            fill="none"
            stroke="#fff"
            strokeWidth={MASK_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${totalLength} ${totalLength}`}
            strokeDashoffset={dashOffset}
          />
        </mask>
        <filter
          id={SKETCH_FILTER_ID}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${SKETCH_BASE_FREQUENCY} ${SKETCH_BASE_FREQUENCY}`}
            numOctaves={3}
            seed={1988}
            result="sketchNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="sketchNoise"
            scale={SKETCH_DISPLACEMENT_SCALE}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Same idea as the line's filter, tuned separately for the
            arrowhead's much smaller size — a straight copy of the line's
            own numbers (tuned for an 18px-wide stroke) was too subtle to
            read as sketchy at all on a ~22px shape; a lower frequency with
            more displacement gives it a visibly hand-drawn edge without
            losing the arrow shape entirely. */}
        <filter
          id={ARROW_SKETCH_FILTER_ID}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.15 0.15"
            numOctaves={3}
            seed={1988}
            result="arrowSketchNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="arrowSketchNoise"
            scale={8}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Same filter technique again, pre-compensated by BADGE_SCALE (see
            above) since this one gets shrunk along with the rest of the
            badge — a raw copy of the line's own filter would end up both
            higher-frequency and lower-amplitude than intended once that
            shrink applies. */}
        <filter
          id={BADGE_SKETCH_FILTER_ID}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${BADGE_SKETCH_BASE_FREQUENCY} ${BADGE_SKETCH_BASE_FREQUENCY}`}
            numOctaves={3}
            seed={1988}
            result="badgeSketchNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="badgeSketchNoise"
            scale={BADGE_SKETCH_DISPLACEMENT_SCALE}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g mask={`url(#${BADGE_CUTOUT_MASK_ID})`}>
        <g mask={`url(#${MASK_ID})`} filter={`url(#${SKETCH_FILTER_ID})`}>
          <polyline
            points={pointsAttr}
            fill="none"
            stroke="#152f3c"
            strokeOpacity={0.35}
            strokeWidth={SHADOW_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={DASH_ARRAY}
          />
          <polyline
            points={pointsAttr}
            fill="none"
            stroke="#ffffff"
            strokeWidth={LINE_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={DASH_ARRAY}
          />
        </g>
        <g
          transform={`translate(${endX}, ${endY}) rotate(${arrowAngle}) scale(${0.5 + 0.5 * arrowT})`}
          opacity={arrowT}
          filter={`url(#${ARROW_SKETCH_FILTER_ID})`}
        >
          <path
            d={`M${-ARROW_SIZE},${-ARROW_SIZE} L${ARROW_SIZE * 0.9},0 L${-ARROW_SIZE},${ARROW_SIZE} Z`}
            fill="#ffffff"
          />
        </g>
      </g>
      {badgePoint && (
        <g
          transform={`translate(${badgePoint[0]}, ${badgePoint[1]}) scale(${BADGE_SCALE}) translate(${-BADGE_CIRCLE_CX}, ${-BADGE_CIRCLE_CY})`}
          style={{
            opacity: badgeVisible ? 1 : 0,
            transition: "opacity 400ms ease",
          }}
        >
          <YouAreHerePinArtwork />
          <circle
            cx={BADGE_CIRCLE_CX}
            cy={BADGE_CIRCLE_CY}
            r={BADGE_CIRCLE_RADIUS}
            fill="none"
            stroke="#152f3c"
            strokeOpacity={0.35}
            strokeWidth={BADGE_RING_SHADOW_STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={BADGE_RING_DASH_ARRAY}
            filter={`url(#${BADGE_SKETCH_FILTER_ID})`}
          />
          <circle
            cx={BADGE_CIRCLE_CX}
            cy={BADGE_CIRCLE_CY}
            r={BADGE_CIRCLE_RADIUS}
            fill="none"
            stroke="#fff"
            strokeWidth={BADGE_RING_STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={BADGE_RING_DASH_ARRAY}
            filter={`url(#${BADGE_SKETCH_FILTER_ID})`}
          />
        </g>
      )}
    </svg>,
    pane,
  );
}
