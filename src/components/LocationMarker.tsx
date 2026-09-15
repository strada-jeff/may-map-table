import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { MapSpace } from "../routing";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { useRoute } from "../hooks/RouteContext";
import DestinationFlagIcon from "./DestinationFlagIcon";

// destination-flag.svg's native size and its pole-base anchor point
// (measured from the base-shadow ellipse path) — the flag "plants" there,
// not at its bottom-center, since the fabric waves off to the right of the
// pole.
const NATURAL_WIDTH = 172;
const NATURAL_HEIGHT = 215;
const ANCHOR_X = 14;
const ANCHOR_Y = 213;
const DISPLAY_HEIGHT = 70;
const DISPLAY_WIDTH = Math.round((DISPLAY_HEIGHT * NATURAL_WIDTH) / NATURAL_HEIGHT);

// Fallback if a location's category has no color set, so a data gap shows
// up as an odd-colored flag rather than a crash.
const FALLBACK_COLOR = "#82b1dd";

type LocationMarkerProps = {
  space: MapSpace;
  pin: Extract<DestinationPin, { kind: "location" }>;
  /** Whether this pin currently matches the active filter. */
  visible: boolean;
};

export default function LocationMarker({ space, pin, visible }: LocationMarkerProps) {
  const { routeTo } = useRoute();
  const markerRef = useRef<L.Marker | null>(null);
  // Captured once so the icon's initial class matches the filter state it
  // mounts under — later changes are applied straight to the marker's DOM
  // element (see effect below) so the CSS transition has something to animate from.
  const [initialVisible] = useState(visible);
  const icon = useMemo(
    () =>
      L.divIcon({
        className: initialVisible ? "destination-marker" : "destination-marker marker-hidden",
        html: renderToStaticMarkup(
          <div className="destination-marker-inner size-full">
            <DestinationFlagIcon color={pin.markerColor ?? FALLBACK_COLOR} className="size-full" />
          </div>,
        ),
        iconSize: [DISPLAY_WIDTH, DISPLAY_HEIGHT],
        iconAnchor: [
          Math.round((DISPLAY_WIDTH * ANCHOR_X) / NATURAL_WIDTH),
          Math.round((DISPLAY_HEIGHT * ANCHOR_Y) / NATURAL_HEIGHT),
        ],
      }),
    [pin.markerColor, initialVisible],
  );

  useEffect(() => {
    markerRef.current?.getElement()?.classList.toggle("marker-hidden", !visible);
  }, [visible]);

  return (
    <Marker
      ref={markerRef}
      position={space.toLatLng(pin.position)}
      icon={icon}
      eventHandlers={{ click: () => routeTo(pin.id) }}
    />
  );
}
