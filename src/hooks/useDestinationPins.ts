import { useEffect, useState } from "react";
import { getBuilders, getCategories, getLocations, getModelHomes } from "../data/api";
import { MODEL_HOMES_CATEGORY_ID, type DestinationPin } from "../types/pins";
import { anchors } from "../routing/generated";
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
      const positionById = new Map(anchors.destinations.map((a) => [a.id, a.point]));

      const resolved: DestinationPin[] = [];
      for (const location of locations) {
        const anchorPoint = positionById.get(location.id);
        if (!anchorPoint) continue;
        resolved.push({
          ...location,
          position: withOffset(anchorPoint, location.iconOffset),
          markerColor: colorByCategoryId.get(location.categoryId),
        });
      }
      for (const modelHome of modelHomes) {
        const anchorPoint = positionById.get(modelHome.id);
        if (!anchorPoint) continue;
        const abbreviation = abbreviationByBuilderId.get(modelHome.builderId) ?? "";
        resolved.push({
          ...modelHome,
          position: withOffset(anchorPoint, modelHome.iconOffset),
          markerLabel: abbreviation.toUpperCase(),
          categoryId: MODEL_HOMES_CATEGORY_ID,
        });
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
