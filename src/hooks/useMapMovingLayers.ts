import { useRef, type RefObject } from "react";
import { CONFIG } from "../config";
import { useMapControls, useMapTransformEffect } from "./MapControlsContext";
import { useMapMotion } from "./useMapMotion";

const MOVING_CLASS = "map-moving";

/**
 * Puts `.map-moving` on the map wrapper while the map moves, which gives the
 * scene and pins their own compositor layers (see index.css) so gesture
 * frames move already-painted layers instead of repainting.
 *
 * A layer stays painted at the scale it had when promoted, so zooming in
 * blurs it. Each time the map has grown by CONFIG.map.resharpenZoomRatio
 * since the last paint, the class comes off for one frame — the browser
 * repaints at the current scale (and with whatever sharper tiles
 * ArtworkTiles has loaded) — and goes back on. Zooming out never needs it:
 * a layer painted bigger than shown just shrinks, staying sharp.
 */
export function useMapMovingLayers(wrapperRef: RefObject<HTMLDivElement | null>) {
  const controls = useMapControls();
  const moving = useRef(false);
  const paintedScale = useRef(1);
  const resharpening = useRef(false);

  useMapMotion((isMoving) => {
    moving.current = isMoving;
    if (isMoving) paintedScale.current = controls.state.scale;
    if (!resharpening.current) wrapperRef.current?.classList.toggle(MOVING_CLASS, isMoving);
  });

  useMapTransformEffect(({ scale }) => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !moving.current || resharpening.current) return;
    if (scale / paintedScale.current < CONFIG.map.resharpenZoomRatio) return;

    paintedScale.current = scale;
    resharpening.current = true;
    wrapper.classList.remove(MOVING_CLASS);
    // Two frames: the first rAF runs before the very next paint, so adding
    // the class back there would undo the removal before it's ever seen.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        resharpening.current = false;
        wrapper.classList.toggle(MOVING_CLASS, moving.current);
      }),
    );
  });
}
