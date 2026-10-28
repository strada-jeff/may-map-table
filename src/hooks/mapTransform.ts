import gsap from "gsap";
import { CONFIG } from "../config";
import type { Point } from "../routing/types";
import type { MapControls } from "./MapControlsContext";

export type Transform = { x: number; y: number; scale: number };

/**
 * Every programmatic camera move (idle zoom-out, Explore zoom-in, route fit,
 * panel-open offset) goes through this, driving MapControls' setTransform
 * via a GSAP tween — one motion language, shared with RouteLine's draw-in
 * timeline.
 */
export function tweenTransform(
  controls: Pick<MapControls, "setTransform" | "state">,
  target: Transform,
  opts: { duration?: number; ease?: string } = {},
): gsap.core.Tween {
  const proxy = { ...controls.state };
  return gsap.to(proxy, {
    x: target.x,
    y: target.y,
    scale: target.scale,
    duration: opts.duration ?? 0.8,
    ease: opts.ease ?? "power2.inOut",
    onUpdate: () => controls.setTransform(proxy),
  });
}

/** Transform that puts `point` at the wrapper's center (plus an optional
 * screen-pixel offset, e.g. shifting left for the details panel), at `scale`. */
export function centeredTransform(
  wrapperSize: { width: number; height: number },
  point: Point,
  scale: number,
  screenOffset: { x: number; y: number } = { x: 0, y: 0 },
): Transform {
  const sx = wrapperSize.width / 2 + screenOffset.x;
  const sy = wrapperSize.height / 2 + screenOffset.y;
  return { x: sx - point[0] * scale, y: sy - point[1] * scale, scale };
}

/**
 * Pins' on-screen size relative to full: 1 from CONFIG.map.pinFullSizeZoom
 * in, easing linearly down to pinMinScale at pinMinSizeZoom and held there
 * further out, so the zoomed-out overview isn't crowded with full-size flags.
 */
export function pinSize(scale: number): number {
  const { pinFullSizeZoom, pinMinSizeZoom, pinMinScale } = CONFIG.map;
  const zoom = scaleToZoom(scale);
  if (zoom >= pinFullSizeZoom) return 1;
  const t = Math.max(0, (zoom - pinMinSizeZoom) / (pinFullSizeZoom - pinMinSizeZoom));
  return pinMinScale + (1 - pinMinScale) * t;
}

/**
 * A marker drawn at a fixed screen size (see KeepScale) around a map
 * point: its full-size box in screen px relative to that point, as
 * [left, top, right, bottom] — e.g. a flag rising above its pole's foot.
 */
export type MarkerBox = { point: Point; box: readonly [number, number, number, number] };

/** Transform that fits `points` inside the wrapper with `paddingPx` of
 * screen-space breathing room, clamped to [minScale, maxScale].
 * `leftInsetPx` leaves that much of the wrapper's left edge out of the fit
 * (e.g. under the details panel), fitting into what's right of it.
 * `markers` are fitted whole, not just their points: a marker's extent in
 * map units depends on the scale being chosen, so the fit is redone with
 * their boxes at the previous pass's scale until it settles. */
export function fitTransform(
  wrapperSize: { width: number; height: number },
  points: readonly Point[],
  paddingPx: number,
  minScale: number,
  maxScale: number,
  leftInsetPx = 0,
  markers: readonly MarkerBox[] = [],
): Transform {
  const fit = (pts: readonly Point[]) => fitPoints(wrapperSize, pts, paddingPx, minScale, maxScale, leftInsetPx);
  let t = fit([...points, ...markers.map((m) => m.point)]);
  for (let pass = 0; pass < 4 && markers.length > 0; pass++) {
    const k = pinSize(t.scale) / t.scale;
    const corners = markers.flatMap(({ point: [x, y], box: [l, top, r, b] }): Point[] => [
      [x + l * k, y + top * k],
      [x + r * k, y + b * k],
    ]);
    t = fit([...points, ...corners]);
  }
  return t;
}

function fitPoints(
  wrapperSize: { width: number; height: number },
  points: readonly Point[],
  paddingPx: number,
  minScale: number,
  maxScale: number,
  leftInsetPx: number,
): Transform {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const boxWidth = Math.max(1, maxX - minX);
  const boxHeight = Math.max(1, maxY - minY);
  const availWidth = Math.max(1, wrapperSize.width - leftInsetPx - 2 * paddingPx);
  const availHeight = Math.max(1, wrapperSize.height - 2 * paddingPx);
  const scale = Math.min(
    maxScale,
    Math.max(minScale, Math.min(availWidth / boxWidth, availHeight / boxHeight)),
  );
  return centeredTransform(wrapperSize, [(minX + maxX) / 2, (minY + maxY) / 2], scale, {
    x: leftInsetPx / 2,
    y: 0,
  });
}

/** CONFIG.map's zoom values are Leaflet-era log2 zoom levels (0 = 1x, 1 =
 * 2x, ...); the transform's scale is linear. Converted once here so
 * every call site can keep using the same familiar zoom numbers. */
export function zoomToScale(zoom: number): number {
  return 2 ** zoom;
}

/** Inverse of zoomToScale, for UI (ZoomSlider) that displays/edits zoom. */
export function scaleToZoom(scale: number): number {
  return Math.log2(scale);
}

/** The point currently sitting at the wrapper's own screen-space center, in
 * content (artwork-pixel) coordinates. */
export function contentCenter(
  controls: Pick<MapControls, "wrapper" | "clientToContent">,
): Point | null {
  const wrapper = controls.wrapper;
  if (!wrapper) return null;
  const rect = wrapper.getBoundingClientRect();
  const center = controls.clientToContent(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return [center.x, center.y];
}

/** Clamps a scale to CONFIG.map's zoom range. */
export function clampScale(scale: number): number {
  return Math.min(zoomToScale(CONFIG.map.maxZoom), Math.max(zoomToScale(CONFIG.map.minZoom), scale));
}

/** Clamps scale to the zoom range and position so the artwork always
 * covers the wrapper — no background showing past its edges. User input
 * only; programmatic moves (e.g. the details panel offset) may go past.
 * Given `from`, the transform being moved from, whatever gap that already
 * shows past an edge is allowed to remain (never grow), so touching a map
 * a programmatic move left past an edge doesn't snap it back — moving
 * toward the edge just closes the gap. */
export function clampTransform(
  t: Transform,
  wrapperSize: { width: number; height: number },
  from?: Transform,
): Transform {
  const scale = clampScale(t.scale);
  const minX = wrapperSize.width - CONFIG.map.width * scale;
  const minY = wrapperSize.height - CONFIG.map.height * scale;
  const gap = from ? edgeGaps(from, wrapperSize) : { left: 0, top: 0, right: 0, bottom: 0 };
  return {
    scale,
    x: Math.min(gap.left, Math.max(minX - gap.right, t.x)),
    y: Math.min(gap.top, Math.max(minY - gap.bottom, t.y)),
  };
}

/** Screen px of background `t` shows past each edge of the artwork (0 where it's covered). */
function edgeGaps(t: Transform, wrapperSize: { width: number; height: number }) {
  return {
    left: Math.max(0, t.x),
    top: Math.max(0, t.y),
    right: Math.max(0, wrapperSize.width - (t.x + CONFIG.map.width * t.scale)),
    bottom: Math.max(0, wrapperSize.height - (t.y + CONFIG.map.height * t.scale)),
  };
}
