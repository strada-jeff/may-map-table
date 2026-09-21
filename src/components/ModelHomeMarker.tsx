import { KeepScale } from "react-zoom-pan-pinch";
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

// Anchor is bottom-center, unconditionally: the icon floats above its
// (already pin.iconOffset-nudged, see useDestinationPins) point.

type ModelHomeMarkerProps = {
  pin: Extract<DestinationPin, { kind: "model-home" }>;
  /** Whether this pin currently matches the active filter. */
  visible: boolean;
};

export default function ModelHomeMarker({ pin, visible }: ModelHomeMarkerProps) {
  const onClick = usePinClick(pin.id);
  const [x, y] = pin.position;

  return (
    <div className="absolute z-20" style={{ left: x, top: y }}>
      <KeepScale>
        {/* Pure anchor placement — see LocationMarker for why this stays
            separate from .destination-marker's own CSS-driven transform. */}
        <div
          style={{
            width: DISPLAY_WIDTH,
            height: DISPLAY_HEIGHT,
            transform: `translate(-50%, -100%)`,
          }}
        >
          <div
            className={`destination-marker relative size-full ${visible ? "" : "marker-hidden"}`}
            onClick={onClick}
          >
            <div className="destination-marker-inner relative size-full">
              <img src={ICON} alt="" className="absolute inset-0 size-full" />
              <span
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-vision text-[13px] font-extrabold uppercase tracking-tight text-white"
                style={{ top: `${LABEL_TOP_PERCENT}%` }}
              >
                {pin.markerLabel ?? ""}
              </span>
            </div>
          </div>
        </div>
      </KeepScale>
    </div>
  );
}
