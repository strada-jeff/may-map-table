import type { MapSpace } from "../routing";
import { useDestinationPins } from "../hooks/useDestinationPins";
import ModelHomeMarker from "./ModelHomeMarker";
import LocationMarker from "./LocationMarker";

export default function DestinationMarkers({ space }: { space: MapSpace }) {
  const { pins } = useDestinationPins();

  return (
    <>
      {pins.map((pin) =>
        pin.kind === "model-home" ? (
          <ModelHomeMarker key={pin.id} space={space} pin={pin} />
        ) : (
          <LocationMarker key={pin.id} space={space} pin={pin} />
        ),
      )}
    </>
  );
}
