import { KeepScale } from "react-zoom-pan-pinch";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { usePinClick } from "../hooks/usePinClick";
import DestinationFlagIcon from "./DestinationFlagIcon";
import { ROUTE_EXIT_FADE_MS } from "./routePanes";

// destination-flag.svg's native size and its pole-base anchor point
// (measured from the base-shadow ellipse path) — the flag "plants" there,
// not at its bottom-center, since the fabric waves off to the right of the
// pole.
const NATURAL_WIDTH = 172;
const NATURAL_HEIGHT = 215;
const ANCHOR_X = 14;
const ANCHOR_Y = 213;
const DISPLAY_HEIGHT = 70;
// Sized up when this pin is the active route's destination, so it reads
// clearly above the route dim overlay/line (see DestinationMarkers,
// RouteDimOverlay) instead of blending in at the normal pin size.
const ACTIVE_DISPLAY_HEIGHT = 84;

const NAME_LABEL_CLASS =
  "mb-2 whitespace-nowrap font-vision text-[26px] font-extrabold uppercase tracking-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]";

// Fallback if a location's category has no color set, so a data gap shows
// up as an odd-colored flag rather than a crash.
const FALLBACK_COLOR = "#82b1dd";

type LocationMarkerProps = {
  pin: Extract<DestinationPin, { kind: "location" }>;
  /** Whether this pin currently matches the active filter. Ignored while `active`. */
  visible: boolean;
  /**
   * True while this pin is the active route's destination. Sized up,
   * labeled with its name, and elevated (z-30) above the route dim
   * overlay/line instead of getting dimmed like every other pin — see
   * MapView's comment on why plain z-index is enough now, no second
   * disposable marker needed.
   */
  active: boolean;
  /** True while RouteContext is fading the active state out ahead of a route change/clear. */
  fadeOut: boolean;
};

export default function LocationMarker({ pin, visible, active, fadeOut }: LocationMarkerProps) {
  const onClick = usePinClick(pin.id);
  const [x, y] = pin.position;
  const displayHeight = active ? ACTIVE_DISPLAY_HEIGHT : DISPLAY_HEIGHT;
  const displayWidth = Math.round((displayHeight * NATURAL_WIDTH) / NATURAL_HEIGHT);
  const anchorLeft = Math.round((displayWidth * ANCHOR_X) / NATURAL_WIDTH);
  const anchorTop = Math.round((displayHeight * ANCHOR_Y) / NATURAL_HEIGHT);

  return (
    <div
      className={`absolute ${active ? "z-30" : ""}`}
      style={{
        left: x,
        top: y,
        opacity: active && fadeOut ? 0 : 1,
        transition: active ? `opacity ${ROUTE_EXIT_FADE_MS}ms ease` : undefined,
      }}
    >
      {/* transformOrigin "0 0" is required: KeepScale's own counter-scale
          otherwise pivots around its box's center, dragging the anchor
          below away from (x, y) as the map's zoom scale changes instead of
          keeping it pinned in place. */}
      <KeepScale style={{ transformOrigin: "0 0" }}>
        {/* Pure anchor placement — kept separate from .destination-marker
            below so its own inline transform doesn't fight that class's
            CSS-driven show/hide transform on .destination-marker-inner.
            The active state's name label rides along as a flex sibling —
            it doesn't add to the icon's own width, so the anchor math
            above still lands the pole-base at (x, y) either way. */}
        <div
          className={active ? "flex items-end gap-3" : undefined}
          style={{
            height: displayHeight,
            transform: `translate(${-anchorLeft}px, ${-anchorTop}px)`,
          }}
        >
          <div style={{ width: displayWidth, height: displayHeight }}>
            <div
              className={`destination-marker size-full ${visible || active ? "" : "marker-hidden"}`}
              onClick={onClick}
            >
              <div className="destination-marker-inner size-full">
                <DestinationFlagIcon color={pin.markerColor ?? FALLBACK_COLOR} className="size-full" />
              </div>
            </div>
          </div>
          {active && <span className={NAME_LABEL_CLASS}>{pin.title}</span>}
        </div>
      </KeepScale>
    </div>
  );
}
