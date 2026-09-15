import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { MapSpace } from "../routing";
import {
  useDestinationPins,
  type DestinationPin,
} from "../hooks/useDestinationPins";
import { useRoute } from "../hooks/RouteContext";

// model-home-balloon.svg's native size and the envelope's centre within it
// (measured via getBBox on the balloon body path) — used to place the
// builder-abbreviation label and keep the icon's own aspect ratio.
const BALLOON_NATURAL_WIDTH = 48;
const BALLOON_NATURAL_HEIGHT = 189;
const BALLOON_LABEL_TOP_PERCENT = (34 / BALLOON_NATURAL_HEIGHT) * 100;
const BALLOON_DISPLAY_HEIGHT = 110;
const BALLOON_DISPLAY_WIDTH = Math.round(
  (BALLOON_DISPLAY_HEIGHT * BALLOON_NATURAL_WIDTH) / BALLOON_NATURAL_HEIGHT,
);

const BADGE_SIZE = 36;

// iconAnchor is always fixed screen pixels in Leaflet, so it can't express
// a map-scaling nudge — pin.iconOffset is applied to the anchor's map
// position instead (see useDestinationPins). This is just bottom-center,
// unconditionally: the icon floats above its (already-offset) point.

function markerIconFor(pin: DestinationPin): L.DivIcon {
  if (pin.kind === "model-home") {
    return L.divIcon({
      className: "",
      html: `<div class="relative" style="width:${BALLOON_DISPLAY_WIDTH}px;height:${BALLOON_DISPLAY_HEIGHT}px">
        <img src="${pin.markerIcon}" alt="" class="absolute inset-0 size-full" />
        <span class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-vision text-[13px] font-extrabold uppercase tracking-tight text-white" style="top:${BALLOON_LABEL_TOP_PERCENT}%">${pin.markerLabel ?? ""}</span>
      </div>`,
      iconSize: [BALLOON_DISPLAY_WIDTH, BALLOON_DISPLAY_HEIGHT],
      iconAnchor: [BALLOON_DISPLAY_WIDTH / 2, BALLOON_DISPLAY_HEIGHT],
    });
  }

  return L.divIcon({
    className: "",
    html: `<div class="flex size-9 items-center justify-center rounded-full border-2 border-mayfair-blue bg-white shadow-[0_2px_6px_0_rgba(0,0,0,0.3)]"><img src="${pin.markerIcon}" alt="" class="size-5" /></div>`,
    iconSize: [BADGE_SIZE, BADGE_SIZE],
    iconAnchor: [BADGE_SIZE / 2, BADGE_SIZE],
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
