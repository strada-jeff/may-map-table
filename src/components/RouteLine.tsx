import { useLayoutEffect, useMemo, useState } from "react";
import { useControls } from "react-zoom-pan-pinch";
import gsap from "gsap";
import { CONFIG } from "../config";
import { distance, resolveMapPoint } from "../routing";
import {
  fitTransform,
  tweenTransform,
  zoomToScale,
} from "../hooks/mapTransform";
import type { ActiveRoute } from "../types/routing";
import { ROUTE_EXIT_FADE_MS } from "./routePanes";
import YouAreHerePinArtwork, {
  CIRCLE_CX as BADGE_CIRCLE_CX,
  CIRCLE_CY as BADGE_CIRCLE_CY,
  CIRCLE_RADIUS as BADGE_CIRCLE_RADIUS,
} from "./YouAreHerePinIcon";

type RouteLineProps = {
  route: ActiveRoute;
  /** True while RouteContext is fading this out ahead of a route change. */
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
const DASH_LENGTH = 8;
const DASH_GAP = 6;
const DASH_ARRAY = `${DASH_LENGTH} ${DASH_GAP}`;
// Figma's own filter on the comp's path (fractal-noise feTurbulence run
// through feDisplacementMap), tuned for the line's actual stroke width.
const SKETCH_BASE_FREQUENCY = 0.6;
const SKETCH_DISPLACEMENT_SCALE = 4;
// 25% narrower than the originals (18/12/26) — kept proportional so the
// mask's reveal corridor still comfortably covers the widest visible
// stroke plus its rounded caps.
const SHADOW_STROKE_WIDTH = 3.5;
const LINE_STROKE_WIDTH = 3;
const MASK_STROKE_WIDTH = 3.5;
// Local-space triangle, tip at (+size, 0) — rotated to the final segment's
// angle at render time, so 0deg here means "pointing along +x".
const ARROW_SIZE = 4;

// The "you are here" badge's on-screen circle radius. Drawing it here
// (rather than as a separate marker) means its ring can reuse the line's
// own DASH_LENGTH/DASH_GAP/SHADOW_STROKE_WIDTH/LINE_STROKE_WIDTH/sketch-
// filter constants directly — one real definition instead of two files
// trying to independently arrive at the same numbers.
const BADGE_RADIUS_PX = 24;
const BADGE_SCALE = BADGE_RADIUS_PX / BADGE_CIRCLE_RADIUS;
const BADGE_RING_STROKE_WIDTH = LINE_STROKE_WIDTH / BADGE_SCALE;
const BADGE_RING_SHADOW_STROKE_WIDTH = SHADOW_STROKE_WIDTH / BADGE_SCALE;
const BADGE_RING_DASH_ARRAY = `${DASH_LENGTH / BADGE_SCALE} ${DASH_GAP / BADGE_SCALE}`;
const BADGE_SKETCH_BASE_FREQUENCY = SKETCH_BASE_FREQUENCY * BADGE_SCALE;
const BADGE_SKETCH_DISPLACEMENT_SCALE = SKETCH_DISPLACEMENT_SCALE / BADGE_SCALE;

// Generous margin beyond the artwork's own bounds so the mask's covering
// rect can never clip a stroke sitting right at the edge.
const MASK_MARGIN = 512;
const MASK_X = -MASK_MARGIN;
const MASK_Y = -MASK_MARGIN;
const MASK_WIDTH = CONFIG.map.width + 2 * MASK_MARGIN;
const MASK_HEIGHT = CONFIG.map.height + 2 * MASK_MARGIN;

/**
 * Drawn as plain children of the shared master <svg> (see MapView), in the
 * same artwork-pixel coordinate space as the artwork and destination
 * anchors — panning/zooming the whole scene repositions this for free via
 * the shared transform, no per-frame recompute needed at all (contrast the
 * old Leaflet version, which had to re-project onto layer points on every
 * 'zoom'/'viewreset'/'resize').
 *
 * `vectorEffect="non-scaling-stroke"` still matters here even without
 * Leaflet: it keeps the stroke a constant screen width as the shared
 * transform's CSS scale changes, rather than the stroke growing/shrinking
 * along with the artwork the way an ordinary SVG stroke would.
 *
 * Also draws the "you are here" badge, in the same coordinate space — see
 * BADGE_* above.
 *
 * The dashed look and the "draw in" animation are two separate layers on
 * purpose: an SVG <mask> containing a solid stroke whose strokeDashoffset
 * is tweened from the path's full length down to 0 reveals a *growing*
 * solid line, and the actual dashed/dotted strokes are drawn underneath
 * that mask — so the dash pattern doesn't shift or "march" as it animates,
 * it just gets progressively uncovered.
 */
export default function RouteLine({ route, fadeOut }: RouteLineProps) {
  const controls = useControls();
  const points = useMemo<[number, number][]>(
    () => route.coordinates.map(([x, y]) => [x, y]),
    [route.coordinates],
  );
  const badgePoint = useMemo<[number, number]>(
    () =>
      resolveMapPoint(CONFIG.routing.youAreHereBadgePoint) as [number, number],
    [],
  );
  const [drawT, setDrawT] = useState(0);
  const [arrowT, setArrowT] = useState(0);
  const [badgeVisible, setBadgeVisible] = useState(false);

  // Fits the route's bounds into view, then starts the draw-in animation
  // once that settle finishes — mirrors the old flyToBounds-then-moveend
  // sequencing, just driven by our own GSAP tween instead of Leaflet's.
  useLayoutEffect(() => {
    setDrawT(0);
    setArrowT(0);
    setBadgeVisible(false);

    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return;
    const { width, height } = wrapper.getBoundingClientRect();
    const padding = CONFIG.routing.fitPaddingPx;
    const target = fitTransform(
      { width: width - 2 * padding, height: height - 2 * padding },
      points,
      0,
      zoomToScale(CONFIG.map.minZoom),
      zoomToScale(CONFIG.map.maxZoom),
    );
    const fitTween = tweenTransform(controls, target);

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
    fitTween.eventCallback("onComplete", startDraw);

    return () => {
      fitTween.kill();
      timeline?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, points]);

  if (points.length < 2) return null;

  const pointsAttr = points.map(([x, y]) => `${x},${y}`).join(" ");
  let totalLength = 0;
  for (let i = 1; i < points.length; i++)
    totalLength += distance(points[i - 1]!, points[i]!);
  const dashOffset = totalLength * (1 - drawT);

  const [endX, endY] = points[points.length - 1]!;
  const [prevX, prevY] = points[points.length - 2]!;
  const arrowAngle = (Math.atan2(endY - prevY, endX - prevX) * 180) / Math.PI;

  return (
    <g
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${ROUTE_EXIT_FADE_MS}ms ease`,
      }}
    >
      <defs>
        {/* Both masks below get an explicit userSpaceOnUse region spanning
            a generous area around the artwork — masks default to
            objectBoundingBox with a region computed from the *masked
            element's own geometry*, and a polyline whose points happen to
            be perfectly horizontal or vertical has a bounding box that's
            zero-width or zero-height in that axis. Fixed absolute
            coordinates sidestep that regardless of the path's own shape. */}
        <mask
          id={BADGE_CUTOUT_MASK_ID}
          maskUnits="userSpaceOnUse"
          x={MASK_X}
          y={MASK_Y}
          width={MASK_WIDTH}
          height={MASK_HEIGHT}
        >
          <rect
            x={MASK_X}
            y={MASK_Y}
            width={MASK_WIDTH}
            height={MASK_HEIGHT}
            fill="#fff"
          />
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
          x={MASK_X}
          y={MASK_Y}
          width={MASK_WIDTH}
          height={MASK_HEIGHT}
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
            arrowhead's much smaller size. */}
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
            badge. */}
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
    </g>
  );
}
