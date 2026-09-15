import { useEffect, useMemo, useRef, useState } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { MapSpace } from "../routing";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { usePinClick } from "../hooks/usePinClick";

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
  /** Whether this pin currently matches the active filter. */
  visible: boolean;
};

export default function ModelHomeMarker({ space, pin, visible }: ModelHomeMarkerProps) {
  const onClick = usePinClick(pin.id);
  const markerRef = useRef<L.Marker | null>(null);
  // Captured once so the icon's initial class matches the filter state it
  // mounts under — later changes are applied straight to the marker's DOM
  // element (see effect below) so the CSS transition has something to animate from.
  const [initialVisible] = useState(visible);
  const icon = useMemo(
    () =>
      L.divIcon({
        className: initialVisible ? "destination-marker" : "destination-marker marker-hidden",
        html: `<div class="destination-marker-inner relative" style="width:${DISPLAY_WIDTH}px;height:${DISPLAY_HEIGHT}px">
          <img src="${ICON}" alt="" class="absolute inset-0 size-full" />
          <span class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-vision text-[13px] font-extrabold uppercase tracking-tight text-white" style="top:${LABEL_TOP_PERCENT}%">${pin.markerLabel ?? ""}</span>
        </div>`,
        iconSize: [DISPLAY_WIDTH, DISPLAY_HEIGHT],
        iconAnchor: [DISPLAY_WIDTH / 2, DISPLAY_HEIGHT],
      }),
    [pin.markerLabel, initialVisible],
  );

  useEffect(() => {
    markerRef.current?.getElement()?.classList.toggle("marker-hidden", !visible);
  }, [visible]);

  return (
    <Marker
      ref={markerRef}
      position={space.toLatLng(pin.position)}
      icon={icon}
      eventHandlers={{ click: onClick }}
    />
  );
}
