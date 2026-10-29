import type { DestinationPin } from "../hooks/useDestinationPins";
import PinMarker from "./PinMarker";
import { FLAG_ANCHOR, FlagMarkerIcon } from "./MarkerIcons";

// Fallback if a location's category has no color set, so a data gap shows
// up as an odd-colored flag rather than a crash.
const FALLBACK_COLOR = "#82b1dd";

type LocationMarkerProps = {
  pin: Extract<DestinationPin, { kind: "location" }>;
  visible: boolean;
  active: boolean;
  fadeOut: boolean;
};

/** A location's flag, in its category's color. See PinMarker. */
export default function LocationMarker({ pin, visible, active, fadeOut }: LocationMarkerProps) {
  return (
    <PinMarker
      pinId={pin.id}
      position={pin.position}
      anchor={FLAG_ANCHOR}
      icon={<FlagMarkerIcon color={pin.markerColor ?? FALLBACK_COLOR} />}
      name={pin.title}
      address={pin.address}
      visible={visible}
      active={active}
      fadeOut={fadeOut}
    />
  );
}
