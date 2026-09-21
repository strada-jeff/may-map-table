import { useDestinationPins } from "../hooks/useDestinationPins";
import { useFilter } from "../hooks/FilterContext";
import ModelHomeMarker from "./ModelHomeMarker";
import LocationMarker from "./LocationMarker";

export default function DestinationMarkers() {
  const { pins } = useDestinationPins();
  const { activeCategoryId } = useFilter();

  return (
    <>
      {pins.map((pin) => {
        const visible = activeCategoryId === null || pin.categoryId === activeCategoryId;
        return pin.kind === "model-home" ? (
          <ModelHomeMarker key={pin.id} pin={pin} visible={visible} />
        ) : (
          <LocationMarker key={pin.id} pin={pin} visible={visible} />
        );
      })}
    </>
  );
}
