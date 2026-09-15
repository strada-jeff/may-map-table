import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { CONFIG } from "../config";
import type { MapSpace } from "../routing";
import { useRoute } from "../routing/RouteContext";
import RouteLine from "./RouteLine";

/**
 * Lives inside <MapContainer> so it can reach Leaflet's map instance.
 * routeTo() itself works from anywhere (it only touches context state);
 * this is the one place that turns that state into a drawn line + a
 * fitted viewport.
 */
export default function RouteEffects({ space }: { space: MapSpace }) {
  const map = useMap();
  const { activeRoute } = useRoute();

  useEffect(() => {
    if (!activeRoute) return;
    const bounds = L.latLngBounds(space.toLatLngs(activeRoute.coordinates));
    const padding = CONFIG.routing.fitPaddingPx;
    map.fitBounds(bounds, { padding: [padding, padding], animate: true });
  }, [activeRoute, map, space]);

  if (!activeRoute) return null;
  return <RouteLine space={space} coordinates={activeRoute.coordinates} />;
}
