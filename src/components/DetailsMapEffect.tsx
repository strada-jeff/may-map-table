import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { CONFIG } from "../config";
import type { MapSpace } from "../routing";
import { useDetails } from "../hooks/DetailsContext";
import { useDestinationPins } from "../hooks/useDestinationPins";

/**
 * Lives inside <MapContainer> so it can reach Leaflet's map instance. The
 * details panel is anchored to the left (see DetailsView), so centering the
 * active pin on the map's true center would put it halfway under the panel.
 * This shifts the target center left by half the panel's width so the pin
 * lands in the middle of the space that's actually still visible, at
 * CONFIG.map.pinDetailZoomLevel.
 */
export default function DetailsMapEffect({ space }: { space: MapSpace }) {
  const map = useMap();
  const { activePinId } = useDetails();
  const { pins } = useDestinationPins();

  useEffect(() => {
    const pin = pins.find((p) => p.id === activePinId);
    if (!pin) return;

    const zoom = CONFIG.map.pinDetailZoomLevel;
    const pinPoint = map.project(space.toLatLng(pin.position), zoom);
    const centerPoint = pinPoint.subtract([CONFIG.details.panelWidthPx / 2, 0]);
    map.flyTo(map.unproject(centerPoint, zoom), zoom);
  }, [activePinId, pins, map, space]);

  return null;
}
