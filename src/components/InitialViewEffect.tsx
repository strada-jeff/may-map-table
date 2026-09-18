import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import { CONFIG } from "../config";
import { resolveMapPoint, type MapSpace } from "../routing";
import { useWelcome } from "../hooks/WelcomeContext";
import { useRoute } from "../hooks/RouteContext";

/**
 * Lives inside <MapContainer> so it can reach Leaflet's map instance.
 * MapView's own initial center/zoom already render the idle (zoomed-out)
 * view on first mount — this only handles the transitions after that:
 * flying back out on returning to idle, and flying in on Explore.
 */
export default function InitialViewEffect({ space }: { space: MapSpace }) {
  const map = useMap();
  const { isIdle, exploreCount } = useWelcome();
  const { clearRoute } = useRoute();
  const isFirstIdleRun = useRef(true);

  const center = useMemo(
    () => space.toLatLng(resolveMapPoint(CONFIG.map.initialCenter)),
    [space],
  );
  const idleZoom = CONFIG.map.initialZoom - CONFIG.map.idleZoomOffset;

  useEffect(() => {
    if (isFirstIdleRun.current) {
      isFirstIdleRun.current = false;
      return;
    }
    if (!isIdle) return;
    // Standing idle back into the welcome screen should leave no trace of
    // whatever the previous visitor was doing — clear any in-progress route
    // along with flying back out to the idle view.
    clearRoute();
    map.flyTo(center, idleZoom);
  }, [isIdle, center, idleZoom, map, clearRoute]);

  useEffect(() => {
    if (exploreCount === 0) return;
    map.flyTo(center, CONFIG.map.initialZoom);
  }, [exploreCount, center, map]);

  return null;
}
