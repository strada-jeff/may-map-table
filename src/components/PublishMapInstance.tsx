import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useMapInstance } from "../hooks/MapInstanceContext";

/**
 * Lives inside <MapContainer> so it can reach Leaflet's map instance, and
 * hands it to MapInstanceContext so components outside the map's own
 * component tree (CompassControl's minimap) can read its live bounds/zoom.
 */
export default function PublishMapInstance() {
  const map = useMap();
  const { setMap } = useMapInstance();

  useEffect(() => {
    setMap(map);
    return () => setMap(null);
  }, [map, setMap]);

  return null;
}
