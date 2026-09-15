import { useEffect, useState } from "react";
import { getCategories, getLocations, getModelHomes } from "../data/api";
import type { Location, ModelHome } from "../types/pins";
import { anchors } from "./generated";
import type { Point } from "./types";

export type DestinationPin = (Location | ModelHome) & {
  position: Point;
  /** Every pin gets one, even model homes which have no per-pin icon field. */
  markerIcon: string;
};

/**
 * Joins pin content (locations/model homes) with anchor position
 * (network.svg's #destinations, via the routing build). A pin without a
 * matching anchor yet — e.g. a model home before it gets an SVG anchor —
 * is silently skipped rather than rendered without a position.
 */
export function useDestinationPins(): { pins: DestinationPin[]; loading: boolean } {
  const [pins, setPins] = useState<DestinationPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [locations, modelHomes, categories] = await Promise.all([
        getLocations(),
        getModelHomes(),
        getCategories(),
      ]);
      if (cancelled) return;

      const modelHomeIcon =
        categories.find((category) => category.id === "model-homes")?.icon ?? "";
      const positionById = new Map(anchors.destinations.map((a) => [a.id, a.point]));

      const resolved: DestinationPin[] = [];
      for (const location of locations) {
        const position = positionById.get(location.id);
        if (position) resolved.push({ ...location, position, markerIcon: location.icon });
      }
      for (const modelHome of modelHomes) {
        const position = positionById.get(modelHome.id);
        if (position) resolved.push({ ...modelHome, position, markerIcon: modelHomeIcon });
      }

      setPins(resolved);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { pins, loading };
}
