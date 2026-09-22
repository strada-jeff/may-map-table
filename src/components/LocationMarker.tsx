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
// Native artwork height — Figma's 4K comps draw every flag at 215px.
const DISPLAY_HEIGHT = 215;
// The active route's destination. Figma's directions overlay shows it at
// the same size as every other flag (it reads via the dim overlay and its
// label instead); kept separate so it can be bumped again.
const ACTIVE_DISPLAY_HEIGHT = 215;

// Figma's directions overlay: 42px, set right of the pole and under the
// fabric (31px past the pole, 150px down the 215px flag).
const ADDRESS_LABEL_CLASS =
  "location-marker-label pointer-events-none absolute top-[150px] whitespace-nowrap font-vision text-[42px] font-extrabold leading-[52px] text-white";
const ADDRESS_LABEL_POLE_GAP_PX = 31;

// Fallback if a location's category has no color set, so a data gap shows
// up as an odd-colored flag rather than a crash.
const FALLBACK_COLOR = "#82b1dd";

type LocationMarkerProps = {
  pin: Extract<DestinationPin, { kind: "location" }>;
  /** Whether this pin currently matches the active filter. Ignored while `active`. */
  visible: boolean;
  /**
   * True while this pin is the active route's destination. Labeled with
   * its address, and elevated (z-30) above the route dim
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
            The active state's address label is absolutely placed over the
            flag's lower half, so it never affects the anchor math above. */}
        <div
          className="location-marker-anchor relative"
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
          {active && (
            <span className={ADDRESS_LABEL_CLASS} style={{ left: anchorLeft + ADDRESS_LABEL_POLE_GAP_PX }}>
              {pin.address}
            </span>
          )}
        </div>
      </KeepScale>
    </div>
  );
}
