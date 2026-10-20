import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useMapControls, useMapTransformEffect } from "../hooks/MapControlsContext";
import { CONFIG } from "../config";
import { centeredTransform, contentCenter, scaleToZoom, zoomToScale } from "../hooks/mapTransform";

const STEP = 0.05;
// The thumb's travel stops a radius short of each end, so it stays on the
// rail (and covers the + / − when fully zoomed in or out).
const THUMB_RADIUS = 31;

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
 * Renders as a sibling of MapView's wrapper, not a descendant of it —
 * useMapGestures' listeners only attach to that wrapper element, so unlike
 * the old Leaflet version there's no pointer-event bubbling into the
 * pannable map to guard against here.
 */
export default function ZoomSlider({ rotated }: { rotated: boolean }) {
  const controls = useMapControls();
  const [zoom, setZoom] = useState(() => scaleToZoom(controls.state.scale));
  const draggingRef = useRef(false);
  const { minZoom, maxZoom } = CONFIG.map;

  useMapTransformEffect(({ scale }) => setZoom(scaleToZoom(scale)));

  function zoomFromPointer(e: ReactPointerEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    // Fraction down the track as painted on screen. The rect and clientY
    // are both real screen space (see useRotatedInputCorrection), so when
    // the app is rotated the track's own top — the + end — is the
    // screen's bottom, and the fraction flips to match.
    const screenFraction = clamp(
      (e.clientY - rect.top - THUMB_RADIUS) / (rect.height - 2 * THUMB_RADIUS),
      0,
      1,
    );
    const fraction = rotated ? 1 - screenFraction : screenFraction;
    // top (+) = maxZoom (zoomed in), bottom (−) = minZoom (zoomed out).
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
    const wrapper = controls.wrapper;
    if (!wrapper) return;
    const { width, height } = wrapper.getBoundingClientRect();
    const target = centeredTransform({ width, height }, center, zoomToScale(targetZoom));
    controls.setTransform(target);
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

  // Laid out in the track's own (unrotated) frame: maxZoom at the + end.
  // When the app is rotated the whole slider turns with it, so the + stays
  // at the top for whoever the app is facing.
  const thumbFraction = 1 - (zoom - minZoom) / (maxZoom - minZoom);

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
      <span aria-hidden="true" className="zoom-slider-sign zoom-slider-sign-plus" />
      <span aria-hidden="true" className="zoom-slider-sign zoom-slider-sign-minus" />
      <div
        className="zoom-slider-thumb"
        style={{
          top: `calc(${THUMB_RADIUS}px + (100% - ${2 * THUMB_RADIUS}px) * ${thumbFraction})`,
        }}
      />
    </div>
  );
}
