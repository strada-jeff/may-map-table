import { Polyline } from "react-leaflet";
import { MapSpace, type Point } from "../routing";

type RouteLineProps = {
  space: MapSpace;
  coordinates: readonly Point[];
};

/** One route: a wide casing beneath a coloured line, matching a typical wayfinding style. */
export default function RouteLine({ space, coordinates }: RouteLineProps) {
  if (coordinates.length < 2) return null;
  const positions = space.toLatLngs(coordinates);

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{ color: "#254a5d", weight: 10, opacity: 0.9, interactive: false }}
      />
      <Polyline
        positions={positions}
        pathOptions={{ color: "#f2a03d", weight: 5, opacity: 1, interactive: false }}
      />
    </>
  );
}
