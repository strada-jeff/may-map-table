import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { MapSpace } from "../routing";
import { useDestinationPins, type DestinationPin } from "../hooks/useDestinationPins";
import { useRoute } from "../hooks/RouteContext";

function markerIconFor(pin: DestinationPin): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="flex size-9 items-center justify-center rounded-full border-2 border-mayfair-blue bg-white shadow-[0_2px_6px_0_rgba(0,0,0,0.3)]"><img src="${pin.markerIcon}" alt="" class="size-5" /></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

type DestinationMarkerProps = {
  space: MapSpace;
  pin: DestinationPin;
};

function DestinationMarker({ space, pin }: DestinationMarkerProps) {
  const { routeTo } = useRoute();
  const icon = useMemo(() => markerIconFor(pin), [pin]);

  return (
    <Marker
      position={space.toLatLng(pin.position)}
      icon={icon}
      eventHandlers={{ click: () => routeTo(pin.id) }}
    />
  );
}

export default function DestinationMarkers({ space }: { space: MapSpace }) {
  const { pins } = useDestinationPins();

  return (
    <>
      {pins.map((pin) => (
        <DestinationMarker key={pin.id} space={space} pin={pin} />
      ))}
    </>
  );
}
