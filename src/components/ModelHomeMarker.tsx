import { KeepScale } from "react-zoom-pan-pinch";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { usePinClick } from "../hooks/usePinClick";
import { ROUTE_EXIT_FADE_MS } from "./routePanes";

// model-home-balloon.svg's native size and the envelope's centre within it
// (measured via getBBox on the balloon body path) — used to place the
// builder-abbreviation label and keep the icon's own aspect ratio.
const ICON = "/icons/model-home-balloon.svg";
const NATURAL_WIDTH = 48;
const NATURAL_HEIGHT = 189;
const LABEL_TOP_PERCENT = (34 / NATURAL_HEIGHT) * 100;
const DISPLAY_HEIGHT = 110;
const LABEL_FONT_PX = 13;
// Sized up + paired with the model home's name when this pin is the active
// route's destination, so it reads clearly above the route dim
// overlay/line (see DestinationMarkers, RouteDimOverlay) instead of
// blending in at the normal pin size.
const ACTIVE_DISPLAY_HEIGHT = 132;
const ACTIVE_LABEL_FONT_PX = 16;

const NAME_LABEL_CLASS =
  "mb-2 whitespace-nowrap font-vision text-[26px] font-extrabold uppercase tracking-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]";

// Anchor is bottom-center, unconditionally: the icon floats above its
// (already pin.iconOffset-nudged, see useDestinationPins) point. Computed
// as an explicit pixel offset off the icon's own width/height — not a
// percentage translate on the whole flex row — so the active state's name
// label, appended as a flex sibling, can't shift where the icon itself
// anchors.

type ModelHomeMarkerProps = {
  pin: Extract<DestinationPin, { kind: "model-home" }>;
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

export default function ModelHomeMarker({ pin, visible, active, fadeOut }: ModelHomeMarkerProps) {
  const onClick = usePinClick(pin.id);
  const [x, y] = pin.position;
  const displayHeight = active ? ACTIVE_DISPLAY_HEIGHT : DISPLAY_HEIGHT;
  const displayWidth = Math.round((displayHeight * NATURAL_WIDTH) / NATURAL_HEIGHT);
  const labelFontPx = active ? ACTIVE_LABEL_FONT_PX : LABEL_FONT_PX;

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
      {/* transformOrigin "0 0" — see LocationMarker for why KeepScale needs
          this to keep the anchor pinned to (x, y) across zoom levels. */}
      <KeepScale style={{ transformOrigin: "0 0" }}>
        {/* Pure anchor placement — see LocationMarker for why this stays
            separate from .destination-marker's own CSS-driven transform. */}
        <div
          className={active ? "flex items-end gap-3" : undefined}
          style={{
            height: displayHeight,
            transform: `translate(${-displayWidth / 2}px, ${-displayHeight}px)`,
          }}
        >
          <div style={{ width: displayWidth, height: displayHeight }}>
            <div
              className={`destination-marker relative size-full ${visible || active ? "" : "marker-hidden"}`}
              onClick={onClick}
            >
              <div className="destination-marker-inner relative size-full">
                <img src={ICON} alt="" className="absolute inset-0 size-full" />
                <span
                  className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-vision font-extrabold uppercase tracking-tight text-white"
                  style={{ top: `${LABEL_TOP_PERCENT}%`, fontSize: labelFontPx }}
                >
                  {pin.markerLabel ?? ""}
                </span>
              </div>
            </div>
          </div>
          {active && <span className={NAME_LABEL_CLASS}>{pin.name}</span>}
        </div>
      </KeepScale>
    </div>
  );
}
