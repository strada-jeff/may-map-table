import { KeepScale } from "react-zoom-pan-pinch";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { usePinClick } from "../hooks/usePinClick";
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
const ANCHOR_LEFT_PX = Math.round((DISPLAY_WIDTH * ANCHOR_X) / NATURAL_WIDTH);
const ANCHOR_TOP_PX = Math.round((DISPLAY_HEIGHT * ANCHOR_Y) / NATURAL_HEIGHT);

// Fallback if a location's category has no color set, so a data gap shows
// up as an odd-colored flag rather than a crash.
const FALLBACK_COLOR = "#82b1dd";

type LocationMarkerProps = {
  pin: Extract<DestinationPin, { kind: "location" }>;
  /** Whether this pin currently matches the active filter. */
  visible: boolean;
};

export default function LocationMarker({ pin, visible }: LocationMarkerProps) {
  const onClick = usePinClick(pin.id);
  const [x, y] = pin.position;

  return (
    <div className="absolute z-20" style={{ left: x, top: y }}>
      {/* transformOrigin "0 0" is required: KeepScale's own counter-scale
          otherwise pivots around its box's center, dragging the anchor
          below away from (x, y) as the map's zoom scale changes instead of
          keeping it pinned in place. */}
      <KeepScale style={{ transformOrigin: "0 0" }}>
        {/* Pure anchor placement — kept separate from .destination-marker
            below so its own inline transform doesn't fight that class's
            CSS-driven show/hide transform on .destination-marker-inner. */}
        <div
          style={{
            width: DISPLAY_WIDTH,
            height: DISPLAY_HEIGHT,
            transform: `translate(${-ANCHOR_LEFT_PX}px, ${-ANCHOR_TOP_PX}px)`,
          }}
        >
          <div
            className={`destination-marker size-full ${visible ? "" : "marker-hidden"}`}
            onClick={onClick}
          >
            <div className="destination-marker-inner size-full">
              <DestinationFlagIcon color={pin.markerColor ?? FALLBACK_COLOR} className="size-full" />
            </div>
          </div>
        </div>
      </KeepScale>
    </div>
  );
}
