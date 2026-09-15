import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { MapSpace } from "../routing";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { useRoute } from "../hooks/RouteContext";

// model-home-balloon.svg's native size and the envelope's centre within it
// (measured via getBBox on the balloon body path) — used to place the
// builder-abbreviation label and keep the icon's own aspect ratio.
const ICON = "/icons/model-home-balloon.svg";
const NATURAL_WIDTH = 48;
const NATURAL_HEIGHT = 189;
const LABEL_TOP_PERCENT = (34 / NATURAL_HEIGHT) * 100;
const DISPLAY_HEIGHT = 110;
const DISPLAY_WIDTH = Math.round((DISPLAY_HEIGHT * NATURAL_WIDTH) / NATURAL_HEIGHT);

// iconAnchor is always fixed screen pixels in Leaflet, so it can't express
// a map-scaling nudge — pin.iconOffset is applied to the anchor's map
// position instead (see useDestinationPins). This is just bottom-center,
// unconditionally: the icon floats above its (already-offset) point.

type ModelHomeMarkerProps = {
  space: MapSpace;
  pin: Extract<DestinationPin, { kind: "model-home" }>;
};

export default function ModelHomeMarker({ space, pin }: ModelHomeMarkerProps) {
  const { routeTo } = useRoute();
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div class="relative" style="width:${DISPLAY_WIDTH}px;height:${DISPLAY_HEIGHT}px">
          <img src="${ICON}" alt="" class="absolute inset-0 size-full" />
          <span class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-vision text-[13px] font-extrabold uppercase tracking-tight text-white" style="top:${LABEL_TOP_PERCENT}%">${pin.markerLabel ?? ""}</span>
        </div>`,
        iconSize: [DISPLAY_WIDTH, DISPLAY_HEIGHT],
        iconAnchor: [DISPLAY_WIDTH / 2, DISPLAY_HEIGHT],
      }),
    [pin.markerLabel],
  );

  return (
    <Marker
      position={space.toLatLng(pin.position)}
      icon={icon}
      eventHandlers={{ click: () => routeTo(pin.id) }}
    />
  );
}
