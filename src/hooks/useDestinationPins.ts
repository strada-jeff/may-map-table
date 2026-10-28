import { useEffect, useState } from "react";
import { getBuilders, getCategories, getLocations, getModelHomes } from "../data/api";
import { MODEL_HOMES_CATEGORY_ID, type DestinationPin } from "../types/pins";
import type { Point } from "../routing/types";

export type { DestinationPin };

/**
 * iconOffset is in map units, applied directly to the anchor position here
 * — not to Leaflet's iconAnchor, which is always fixed screen pixels and
 * wouldn't scale with zoom the way a road-relative nudge should.
 */
function withOffset(point: Point, offset?: { x: number; y: number }): Point {
  if (!offset) return point;
  return [point[0] + offset.x, point[1] + offset.y];
}

let lastResolved: DestinationPin[] | null = null;

/**
 * Joins pin content (locations/model homes) with its builder/category
 * lookups and places each at its own `anchor`, which RouteContext also
 * routes to.
 */
export function useDestinationPins(): { pins: DestinationPin[]; loading: boolean } {
  // Starts from the last resolved pins, so a component mounted later (a
  // route's RouteLine, which fits to its destination's marker in its first
  // layout effect) has them on its first render, not after a load.
  const [pins, setPins] = useState<DestinationPin[]>(() => lastResolved ?? []);
  const [loading, setLoading] = useState(lastResolved === null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [locations, modelHomes, builders, categories] = await Promise.all([
        getLocations(),
        getModelHomes(),
        getBuilders(),
        getCategories(),
      ]);
      if (cancelled) return;

      const abbreviationByBuilderId = new Map(
        builders.map((builder) => [builder.id, builder.abbreviation]),
      );
      const colorByCategoryId = new Map(
        categories.map((category) => [category.id, category.color]),
      );
      const resolved: DestinationPin[] = [];
      for (const location of locations) {
        resolved.push({
          ...location,
          position: withOffset(location.anchor, location.iconOffset),
          markerColor: colorByCategoryId.get(location.categoryId),
        });
      }
      for (const modelHome of modelHomes) {
        const abbreviation = abbreviationByBuilderId.get(modelHome.builderId) ?? "";
        resolved.push({
          ...modelHome,
          position: withOffset(modelHome.anchor, modelHome.iconOffset),
          markerLabel: abbreviation.toUpperCase(),
          categoryId: MODEL_HOMES_CATEGORY_ID,
        });
      }

      lastResolved = resolved;
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
