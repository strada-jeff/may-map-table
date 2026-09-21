import { useRoute } from "../hooks/RouteContext";
import RouteDimOverlay from "./RouteDimOverlay";
import RouteLine from "./RouteLine";

/**
 * Rendered as a child of the shared master <svg> (see MapView) — the two
 * pieces of the directions-active presentation that are genuinely vector
 * content (the dim overlay and the drawn route). The active destination's
 * highlighted pin is a separate DOM marker (see RouteHighlightMarker),
 * since ordinary destination markers are DOM too and it needs to sit above
 * them in normal document order, not inside this SVG.
 */
export default function RouteSvgLayer() {
  const { displayedRoute, exiting } = useRoute();

  if (!displayedRoute) return null;

  return (
    <>
      <RouteDimOverlay fadeOut={exiting} />
      <RouteLine route={displayedRoute} fadeOut={exiting} />
    </>
  );
}
