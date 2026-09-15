import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { CONFIG } from "../config";
import type { MapSpace } from "../routing";
import { useFilter } from "../hooks/FilterContext";
import { useDestinationPins } from "../hooks/useDestinationPins";

/**
 * Lives inside <MapContainer> so it can reach Leaflet's map instance. Fits
 * the viewport to whichever pins the active filter leaves visible, so
 * picking a category also brings its markers into view rather than leaving
 * them wherever the map already happened to be looking.
 */
export default function FilterEffects({ space }: { space: MapSpace }) {
  const map = useMap();
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

    const bounds = L.latLngBounds(visible.map((pin) => space.toLatLng(pin.position)));
    const padding = CONFIG.routing.fitPaddingPx;
    map.flyToBounds(bounds, { padding: [padding, padding] });
  }, [activeCategoryId, pins, map, space]);

  return null;
}
