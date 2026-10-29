import type { DestinationPin } from "../hooks/useDestinationPins";
import PinMarker from "./PinMarker";
import { BALLOON_ANCHOR, BalloonMarkerIcon } from "./MarkerIcons";

type ModelHomeMarkerProps = {
  pin: Extract<DestinationPin, { kind: "model-home" }>;
  visible: boolean;
  active: boolean;
  fadeOut: boolean;
};

/** A model home's balloon, lettered with its builder's abbreviation. See PinMarker. */
export default function ModelHomeMarker({ pin, visible, active, fadeOut }: ModelHomeMarkerProps) {
  return (
    <PinMarker
      pinId={pin.id}
      position={pin.position}
      anchor={BALLOON_ANCHOR}
      icon={<BalloonMarkerIcon label={pin.markerLabel ?? ""} />}
      name={pin.name}
      address={pin.address}
      visible={visible}
      active={active}
      fadeOut={fadeOut}
    />
  );
}
