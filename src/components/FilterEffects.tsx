import { useEffect, useRef } from "react";
import { useMapControls } from "../hooks/MapControlsContext";
import { CONFIG } from "../config";
import { fitTransform, tweenTransform, zoomToScale } from "../hooks/mapTransform";
import { useFilter } from "../hooks/FilterContext";
import { useDestinationPins } from "../hooks/useDestinationPins";
import { useDrawer } from "../hooks/DrawerContext";
import { markerBox } from "./markerBoxes";

/**
 * Fits the viewport to whichever pins the active filter leaves visible, so
 * picking a category also brings its markers into view rather than leaving
 * them wherever the map already happened to be looking. Fits whole flags
 * and balloons, not just their feet, into the map space right of the
 * drawer when it's open (filters are picked from it).
 */
export default function FilterEffects() {
  const controls = useMapControls();
  const { activeCategoryId } = useFilter();
  const { pins } = useDestinationPins();
  const { open: drawerOpen } = useDrawer();
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

    const wrapper = controls.wrapper;
    if (!wrapper) return;
    const { width, height } = wrapper.getBoundingClientRect();
    const padding = CONFIG.routing.fitPaddingPx;
    const target = fitTransform(
      { width, height },
      [],
      padding,
      zoomToScale(CONFIG.map.minZoom),
      zoomToScale(CONFIG.map.maxZoom),
      drawerOpen ? CONFIG.drawer.panelWidthPx : 0,
      visible.map((pin) => markerBox(pin)),
    );
    tweenTransform(controls, target);
    // Not drawerOpen: opening/closing the drawer alone shouldn't refit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId, pins, controls]);

  return null;
}
