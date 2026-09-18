import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { CONFIG } from "../config";
import type { MapSpace } from "../routing";
import { useRoute } from "../hooks/RouteContext";
import { useDestinationPins } from "../hooks/useDestinationPins";
import type { ActiveRoute } from "../types/routing";
import RouteLine from "./RouteLine";
import RouteDimOverlay from "./RouteDimOverlay";
import ActiveDestinationHighlight from "./ActiveDestinationHighlight";
import { ROUTE_ACTIVE_PANE, ROUTE_DIM_PANE, ROUTE_EXIT_FADE_MS } from "./routePanes";

/**
 * Lives inside <MapContainer> so it can reach Leaflet's map instance.
 * routeTo() itself works from anywhere (it only touches context state);
 * this is the one place that turns that state into a drawn line + a
 * fitted viewport, plus the rest of the directions-active presentation
 * (dim overlay, highlighted destination pin — the "you are here" badge is
 * drawn by RouteLine itself now, in the same <svg> as the line/ring it
 * needs to match).
 *
 * `displayedRoute` intentionally lags behind context's `activeRoute`: when
 * the user picks a new destination (or clears one) while a route is
 * already on screen, the old presentation fades out in place first —
 * `displayedRoute` only swaps to the new value, and the map only starts
 * flying, once that fade finishes. Going from nothing to a route skips the
 * fade (nothing to fade out) and shows/flies immediately.
 *
 * The two custom panes are created here — before any child below renders —
 * so RouteDimOverlay/RouteLine/ActiveDestinationHighlight can all just
 * reference them by name via the `pane` prop without racing to
 * create/z-index them themselves.
 */
export default function RouteEffects({ space }: { space: MapSpace }) {
  const map = useMap();
  const { activeRoute } = useRoute();
  const { pins } = useDestinationPins();

  const dimPane = map.getPane(ROUTE_DIM_PANE) ?? map.createPane(ROUTE_DIM_PANE);
  dimPane.style.zIndex = "610";
  dimPane.style.pointerEvents = "none";
  const activePane = map.getPane(ROUTE_ACTIVE_PANE) ?? map.createPane(ROUTE_ACTIVE_PANE);
  activePane.style.zIndex = "620";
  activePane.style.pointerEvents = "none";

  const [displayedRoute, setDisplayedRoute] = useState<ActiveRoute | null>(activeRoute);
  const [exiting, setExiting] = useState(false);
  const displayedRouteRef = useRef(displayedRoute);
  useEffect(() => {
    displayedRouteRef.current = displayedRoute;
  }, [displayedRoute]);

  useEffect(() => {
    if (activeRoute === displayedRouteRef.current) return;

    if (!displayedRouteRef.current) {
      // Nothing on screen yet — nothing to fade out, so show immediately.
      setDisplayedRoute(activeRoute);
      setExiting(false);
      return;
    }

    setExiting(true);
    const timeout = setTimeout(() => {
      setDisplayedRoute(activeRoute);
      setExiting(false);
    }, ROUTE_EXIT_FADE_MS);
    return () => clearTimeout(timeout);
  }, [activeRoute]);

  useEffect(() => {
    if (!displayedRoute) return;
    const bounds = L.latLngBounds(space.toLatLngs(displayedRoute.coordinates));
    const padding = CONFIG.routing.fitPaddingPx;
    // flyToBounds drives real per-frame _move() calls at a true fractional
    // zoom, unlike fitBounds's animated mode, which CSS-scales the whole
    // pane as one flat image between the start/end view — that's what made
    // the route line (and everything else) visibly balloon mid-transition.
    // Keyed on `displayedRoute`, not `activeRoute`, so switching to a new
    // destination doesn't start flying until the old route has finished
    // fading out above.
    map.flyToBounds(bounds, { padding: [padding, padding] });
  }, [displayedRoute, map, space]);

  if (!displayedRoute) return null;

  const destinationPin = pins.find((pin) => pin.id === displayedRoute.destinationId);

  return (
    <>
      <RouteDimOverlay space={space} fadeOut={exiting} />
      <RouteLine space={space} route={displayedRoute} fadeOut={exiting} />
      {destinationPin && (
        // Keyed by pin id so switching destinations mounts a fresh marker
        // instead of updating this one's icon/position in place — a swap
        // only ever happens once `exiting` is already back to false (see
        // above), so an in-place update would otherwise jump straight to
        // the new pin's icon before its own fade-in had a chance to run.
        <ActiveDestinationHighlight key={destinationPin.id} space={space} pin={destinationPin} fadeOut={exiting} />
      )}
    </>
  );
}
