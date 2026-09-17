import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMap, useMapEvent } from "react-leaflet";
import L from "leaflet";
import { CONFIG } from "../config";

const STEP = 0.05;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n / STEP) * STEP;

/**
 * Lives inside <MapContainer> so it can reach Leaflet's map instance. This
 * is a plain div driven by our own pointer handlers, not a native
 * `<input type=range>` rotated or writing-mode'd vertical — both of those
 * paint correctly but (at least in this Chromium build) silently eat mouse
 * clicks/drags on the track, since the native control's hit-testing isn't
 * reliably reoriented along with the paint. Handling pointer position
 * ourselves sidesteps that entirely. Styling lives in index.css
 * (.zoom-slider-track/-rail/-thumb).
 */
export default function ZoomSlider() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const { minZoom, maxZoom } = CONFIG.map;

  useMapEvent("zoom", () => setZoom(map.getZoom()));

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Without this, a pointerdown/move on the track still bubbles up
    // through the DOM to the Leaflet container underneath (it's a
    // descendant, rendered inside <MapContainer>) and gets read as a map
    // drag — the map pans toward the cursor at the same time we're
    // changing zoom, which looks like the zoom recentring on the mouse.
    // Same trick Leaflet's own built-in controls use to sit on the map
    // without dragging it.
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  function zoomFromPointer(e: ReactPointerEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    // top = maxZoom (zoomed in), bottom = minZoom (zoomed out).
    const fraction = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    return round(maxZoom - fraction * (maxZoom - minZoom));
  }

  // Dragging jumps zoom to an absolute position under the pointer, so a
  // single fast drag can sweep across this map's whole zoom range (only 4
  // integer levels, -1..2) in a couple hundred ms. map.setZoom() runs
  // through the public setView() path, which treats *every* call as its
  // own complete gesture — movestart/zoomstart/zoom/moveend/zoomend all
  // fire each time — so each pointermove made Leaflet's tile GridLayer
  // tear down and re-prune its tiles from scratch, and the network/decode
  // time for the next level's tiles couldn't keep up, which read as
  // flashing. Leaflet's own TouchZoom handler (pinch-zoom) has the same
  // "continuous absolute zoom" shape and avoids this by driving the map
  // through the private _move() with a {pinch: true} flag: GridLayer
  // special-cases that flag to skip its teardown/reload except when the
  // rounded tile zoom actually changes, then does one real, unsuppressed
  // settle via _resetView() once the gesture ends. Mirroring that here
  // (same private-API reliance smoothWheelZoom.ts already leans on)
  // keeps each of the (at most 3) real level crossings but drops the
  // redundant reset on every other pointermove in between.
  function moveZoomTo(targetZoom: number) {
    (map as any)._move(map.getCenter(), targetZoom, {
      pinch: true,
      round: false,
    });
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    map._stop();
    draggingRef.current = true;
    (map as any)._moveStart(true, false);
    moveZoomTo(zoomFromPointer(e));
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1 || !draggingRef.current) return;
    moveZoomTo(zoomFromPointer(e));
  }

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    (map as any)._resetView(map.getCenter(), (map as any)._limitZoom(map.getZoom()));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowUp" || e.key === "ArrowRight")
      map.setZoom(clamp(zoom + STEP, minZoom, maxZoom));
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft")
      map.setZoom(clamp(zoom - STEP, minZoom, maxZoom));
  }

  const thumbTopPercent = (1 - (zoom - minZoom) / (maxZoom - minZoom)) * 100;

  return (
    <div
      ref={trackRef}
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
