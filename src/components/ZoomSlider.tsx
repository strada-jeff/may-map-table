import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useControls, useTransformEffect } from "react-zoom-pan-pinch";
import { CONFIG } from "../config";
import { centeredTransform, contentCenter, scaleToZoom, zoomToScale } from "../hooks/mapTransform";

const STEP = 0.05;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n / STEP) * STEP;

/**
 * A plain div driven by our own pointer handlers, not a native
 * `<input type=range>` rotated or writing-mode'd vertical — both of those
 * paint correctly but (at least in this Chromium build) silently eat mouse
 * clicks/drags on the track, since the native control's hit-testing isn't
 * reliably reoriented along with the paint. Handling pointer position
 * ourselves sidesteps that entirely. Styling lives in index.css
 * (.zoom-slider-track/-rail/-thumb).
 *
 * Renders as a sibling of <TransformComponent> (see MapView/App), not a
 * descendant of it — react-zoom-pan-pinch's gesture listeners only attach
 * to TransformComponent's own wrapper element, so unlike the old Leaflet
 * version there's no pointer-event bubbling into the pannable map to guard
 * against here.
 */
export default function ZoomSlider({ rotated }: { rotated: boolean }) {
  const controls = useControls();
  const [zoom, setZoom] = useState(() => scaleToZoom(controls.instance.state.scale));
  const draggingRef = useRef(false);
  const { minZoom, maxZoom } = CONFIG.map;

  useTransformEffect(({ state }) => setZoom(scaleToZoom(state.scale)));

  function zoomFromPointer(e: ReactPointerEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    // top = maxZoom (zoomed in), bottom = minZoom (zoomed out).
    const fraction = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    return round(maxZoom - fraction * (maxZoom - minZoom));
  }

  // Zooms around whatever content point currently sits at the wrapper's
  // screen center, so the view doesn't recenter on some other point while
  // dragging — the same "zoom in place" feel the old center-anchored
  // Leaflet call had. setTransform is public API, safe to call on every
  // pointermove; there's no tile layer to tear down and re-fetch anymore,
  // so the old "wait for tiles to finish loading before the real settle"
  // dance (see git history) is no longer needed at all.
  function moveZoomTo(targetZoom: number) {
    const center = contentCenter(controls);
    if (!center) return;
    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return;
    const { width, height } = wrapper.getBoundingClientRect();
    const target = centeredTransform({ width, height }, center, zoomToScale(targetZoom));
    controls.setTransform(target.x, target.y, target.scale, 0);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    moveZoomTo(zoomFromPointer(e));
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1 || !draggingRef.current) return;
    moveZoomTo(zoomFromPointer(e));
  }

  function endDrag() {
    draggingRef.current = false;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowUp" || e.key === "ArrowRight")
      moveZoomTo(clamp(zoom + STEP, minZoom, maxZoom));
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft")
      moveZoomTo(clamp(zoom - STEP, minZoom, maxZoom));
  }

  // `top: X%` is authored assuming this element renders in normal, upright
  // layout — the value that makes maxZoom sit at the visual top of the
  // track. App.tsx's rotate(180deg) flips how that layout position ends up
  // painted (top-of-layout renders at the visual bottom, and vice versa)
  // without changing this element's own DOM/CSS at all, so the thumb needs
  // the complementary offset here to land back at the correct visual end.
  const unrotatedThumbTopPercent =
    (1 - (zoom - minZoom) / (maxZoom - minZoom)) * 100;
  const thumbTopPercent = rotated
    ? 100 - unrotatedThumbTopPercent
    : unrotatedThumbTopPercent;

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Map zoom"
      aria-orientation="vertical"
      aria-valuemin={minZoom}
      aria-valuemax={maxZoom}
      aria-valuenow={zoom}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      className="zoom-slider-track"
    >
      <div className="zoom-slider-rail" />
      <div
        className="zoom-slider-thumb"
        style={{ top: `${thumbTopPercent}%` }}
      />
    </div>
  );
}
