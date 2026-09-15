import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { MapSpace, type Point } from "../routing";

type RouteLineProps = {
  space: MapSpace;
  coordinates: readonly Point[];
};

/**
 * Drawn as a plain SVG overlay tracking the map's real container-pixel
 * coordinates on every 'move' tick, instead of react-leaflet's <Polyline>.
 * Leaflet's built-in vector renderer only reprojects path geometry at
 * zoomend — during any animated zoom (including flyTo) it approximates
 * intermediate frames by CSS-scaling the whole rendered SVG layer, which
 * visibly distorts a thick stroke (vector-effect: non-scaling-stroke does
 * not reliably counter this in practice). Recomputing points ourselves
 * every frame keeps the stroke pixel-exact throughout the animation.
 */
export default function RouteLine({ space, coordinates }: RouteLineProps) {
  const map = useMap();
  const latLngs = useMemo(() => space.toLatLngs(coordinates), [space, coordinates]);
  const [points, setPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    function update() {
      setPoints(
        latLngs.map((latLng) => {
          const p = map.latLngToContainerPoint(latLng);
          return [p.x, p.y];
        }),
      );
    }
    update();
    map.on("move zoom viewreset resize", update);
    return () => {
      map.off("move zoom viewreset resize", update);
    };
  }, [map, latLngs]);

  if (points.length < 2) return null;

  const pointsAttr = points.map(([x, y]) => `${x},${y}`).join(" ");

  return createPortal(
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 400 }}>
      <polyline points={pointsAttr} fill="none" stroke="#254a5d" strokeWidth={10} strokeOpacity={0.9} />
      <polyline points={pointsAttr} fill="none" stroke="#f2a03d" strokeWidth={5} strokeOpacity={1} />
    </svg>,
    map.getContainer(),
  );
}
