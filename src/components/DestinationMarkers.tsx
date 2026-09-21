import { useDestinationPins } from "../hooks/useDestinationPins";
import { useFilter } from "../hooks/FilterContext";
import { useRoute } from "../hooks/RouteContext";
import ModelHomeMarker from "./ModelHomeMarker";
import LocationMarker from "./LocationMarker";

export default function DestinationMarkers() {
  const { pins } = useDestinationPins();
  const { activeCategoryId } = useFilter();
  const { displayedRoute, exiting } = useRoute();

  return (
    <>
      {pins.map((pin) => {
        const visible = activeCategoryId === null || pin.categoryId === activeCategoryId;
        const active = displayedRoute?.destinationId === pin.id;
        return pin.kind === "model-home" ? (
          <ModelHomeMarker
            key={pin.id}
            pin={pin}
            visible={visible}
            active={active}
            fadeOut={active && exiting}
          />
        ) : (
          <LocationMarker
            key={pin.id}
            pin={pin}
            visible={visible}
            active={active}
            fadeOut={active && exiting}
          />
        );
      })}
    </>
  );
}
