import { useRoute } from "../hooks/RouteContext";
import { usePreloadRouteArtwork } from "../hooks/useRouteArtwork";
import RouteArtwork from "./RouteArtwork";
import RouteDimOverlay from "./RouteDimOverlay";
import RouteLine from "./RouteLine";

/**
 * Rendered as a child of the shared master <svg> (see MapView) — the two
 * pieces of the directions-active presentation that are genuinely vector
 * content (the dim overlay and the drawn route), with the destination's
 * artwork piece between them (RouteArtwork). The active destination's
 * pin stays a normal DOM marker (LocationMarker/ModelHomeMarker's `active`
 * prop) — it elevates itself above this SVG with its own z-index rather
 * than rendering as a second, disposable marker.
 */
export default function RouteSvgLayer() {
  const { displayedRoute, exiting } = useRoute();
  usePreloadRouteArtwork();

  if (!displayedRoute) return null;

  return (
    <>
      <RouteDimOverlay fadeOut={exiting} />
      <RouteArtwork />
      <RouteLine route={displayedRoute} fadeOut={exiting} />
    </>
  );
}
