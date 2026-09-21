import { useRoute } from "../hooks/RouteContext";
import { useDestinationPins } from "../hooks/useDestinationPins";
import ActiveDestinationHighlight from "./ActiveDestinationHighlight";

/** DOM sibling of RouteSvgLayer — see there for why this is split out. */
export default function RouteHighlightMarker() {
  const { displayedRoute, exiting } = useRoute();
  const { pins } = useDestinationPins();

  if (!displayedRoute) return null;

  const destinationPin = pins.find((pin) => pin.id === displayedRoute.destinationId);
  if (!destinationPin) return null;

  // Keyed by pin id so switching destinations mounts a fresh marker instead
  // of updating this one's icon/position in place — a swap only ever
  // happens once `exiting` is already back to false, so an in-place update
  // would otherwise jump straight to the new pin's icon before its own
  // fade-in had a chance to run.
  return <ActiveDestinationHighlight key={destinationPin.id} pin={destinationPin} fadeOut={exiting} />;
}
