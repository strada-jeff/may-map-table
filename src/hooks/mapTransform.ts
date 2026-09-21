import gsap from "gsap";
import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import type { Point } from "../routing/types";

export type Transform = { x: number; y: number; scale: number };

/**
 * Every programmatic camera move (idle zoom-out, Explore zoom-in, route fit,
 * panel-open offset) goes through this, driving react-zoom-pan-pinch's
 * setTransform via a GSAP tween instead of the library's own fixed easing
 * set — one motion language, shared with RouteLine's draw-in timeline,
 * across both user gestures and programmatic movement.
 */
export function tweenTransform(
  controls: Pick<ReactZoomPanPinchContentRef, "setTransform" | "instance">,
  target: Transform,
  opts: { duration?: number; ease?: string } = {},
): gsap.core.Tween {
  const { scale, positionX, positionY } = controls.instance.state;
  const proxy = { x: positionX, y: positionY, scale };
  return gsap.to(proxy, {
    x: target.x,
    y: target.y,
    scale: target.scale,
    duration: opts.duration ?? 0.8,
    ease: opts.ease ?? "power2.inOut",
    onUpdate: () => controls.setTransform(proxy.x, proxy.y, proxy.scale, 0),
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

/** Transform that fits `points` inside the wrapper with `paddingPx` of
 * screen-space breathing room, clamped to [minScale, maxScale]. */
export function fitTransform(
  wrapperSize: { width: number; height: number },
  points: readonly Point[],
  paddingPx: number,
  minScale: number,
  maxScale: number,
): Transform {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const boxWidth = Math.max(1, maxX - minX);
  const boxHeight = Math.max(1, maxY - minY);
  const availWidth = Math.max(1, wrapperSize.width - 2 * paddingPx);
  const availHeight = Math.max(1, wrapperSize.height - 2 * paddingPx);
  const scale = Math.min(
    maxScale,
    Math.max(minScale, Math.min(availWidth / boxWidth, availHeight / boxHeight)),
  );
  return centeredTransform(wrapperSize, [(minX + maxX) / 2, (minY + maxY) / 2], scale);
}

/** CONFIG.map's zoom values are Leaflet-era log2 zoom levels (0 = 1x, 1 =
 * 2x, ...); react-zoom-pan-pinch's scale is linear. Converted once here so
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
  controls: Pick<ReactZoomPanPinchContentRef, "instance" | "clientToContent">,
): Point | null {
  const wrapper = controls.instance.wrapperComponent;
  if (!wrapper) return null;
  const rect = wrapper.getBoundingClientRect();
  const center = controls.clientToContent(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return [center.x, center.y];
}
