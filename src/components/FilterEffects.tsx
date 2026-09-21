import { useEffect, useRef } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { CONFIG } from "../config";
import { fitTransform, tweenTransform, zoomToScale } from "../hooks/mapTransform";
import { useFilter } from "../hooks/FilterContext";
import { useDestinationPins } from "../hooks/useDestinationPins";

/**
 * Fits the viewport to whichever pins the active filter leaves visible, so
 * picking a category also brings its markers into view rather than leaving
 * them wherever the map already happened to be looking.
 */
export default function FilterEffects() {
  const controls = useControls();
  const { activeCategoryId } = useFilter();
  const { pins } = useDestinationPins();
  // Skips the initial mount (activeCategoryId starts null with nothing to
  // react to) and ignores pins arriving asynchronously on their own — only
  // an actual filter change should trigger the fly.
  const previousCategoryId = useRef(activeCategoryId);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      previousCategoryId.current = activeCategoryId;
      return;
    }
    if (activeCategoryId === previousCategoryId.current) return;
    previousCategoryId.current = activeCategoryId;

    const visible =
      activeCategoryId === null ? pins : pins.filter((pin) => pin.categoryId === activeCategoryId);
    if (visible.length === 0) return;

    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return;
    const { width, height } = wrapper.getBoundingClientRect();
    const padding = CONFIG.routing.fitPaddingPx;
    const target = fitTransform(
      { width, height },
      visible.map((pin) => pin.position),
      padding,
      zoomToScale(CONFIG.map.minZoom),
      zoomToScale(CONFIG.map.maxZoom),
    );
    tweenTransform(controls, target);
  }, [activeCategoryId, pins, controls]);

  return null;
}
