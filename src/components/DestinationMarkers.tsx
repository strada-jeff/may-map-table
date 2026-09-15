import type { MapSpace } from "../routing";
import { useDestinationPins } from "../hooks/useDestinationPins";
import { useFilter } from "../hooks/FilterContext";
import ModelHomeMarker from "./ModelHomeMarker";
import LocationMarker from "./LocationMarker";

export default function DestinationMarkers({ space }: { space: MapSpace }) {
  const { pins } = useDestinationPins();
  const { activeCategoryId } = useFilter();

  const visiblePins = activeCategoryId
    ? pins.filter((pin) => pin.categoryId === activeCategoryId)
    : pins;

  return (
    <>
      {visiblePins.map((pin) =>
        pin.kind === "model-home" ? (
          <ModelHomeMarker key={pin.id} space={space} pin={pin} />
        ) : (
          <LocationMarker key={pin.id} space={space} pin={pin} />
        ),
      )}
    </>
  );
}
