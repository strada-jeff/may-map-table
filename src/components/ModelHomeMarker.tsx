import KeepScale from "./KeepScale";
import LottieBalloon, { BALLOON_BODY_HEIGHT, BALLOON_BODY_WIDTH } from "./LottieBalloon";
import type { DestinationPin } from "../hooks/useDestinationPins";
import { usePinClick } from "../hooks/usePinClick";
import { ROUTE_EXIT_FADE_MS } from "./routePanes";
import { postalAddress } from "./postalAddress";

// The animated balloon's body box (see LottieBalloon — its radiating lines
// overflow it), anchored at the string's foot.
const NATURAL_WIDTH = BALLOON_BODY_WIDTH;
const NATURAL_HEIGHT = BALLOON_BODY_HEIGHT;
// Native artwork height — Figma's balloon_coventry draws it 1:1 at 4K.
const DISPLAY_HEIGHT = BALLOON_BODY_HEIGHT;
// Scaled with the balloon from the old 13px-at-110px (Figma has no
// map-balloon label spec; the help legend's is ~the same ratio).
const LABEL_FONT_PX = 23;
// Paired with the model home's address when this pin is the active
// route's destination, so it reads clearly above the route dim
// overlay/line (see DestinationMarkers, RouteDimOverlay).
// Same size as every other balloon, matching Figma's directions overlay
// (the destination flag isn't sized up there either).
const ACTIVE_DISPLAY_HEIGHT = BALLOON_BODY_HEIGHT;
const ACTIVE_LABEL_FONT_PX = 23;

// Same type as LocationMarker's label (Figma's directions overlay).
const ADDRESS_LABEL_CLASS =
  "model-home-marker-label mb-2 whitespace-pre font-vision text-[42px] font-extrabold leading-[52px] text-white";

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

export default function ModelHomeMarker({ pin, visible, active, fadeOut }: ModelHomeMarkerProps) {
  const tap = usePinClick(pin.id);
  const [x, y] = pin.position;
  const displayHeight = active ? ACTIVE_DISPLAY_HEIGHT : DISPLAY_HEIGHT;
  const displayWidth = Math.round((displayHeight * NATURAL_WIDTH) / NATURAL_HEIGHT);
  const labelFontPx = active ? ACTIVE_LABEL_FONT_PX : LABEL_FONT_PX;

  return (
    <div
      className={`pointer-events-none absolute ${active ? "z-30" : ""}`}
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
              data-pin-id={pin.id}
              {...tap}
            >
              <div className="destination-marker-inner relative size-full">
                <LottieBalloon label={pin.markerLabel ?? ""} fontPx={labelFontPx} />
              </div>
            </div>
          </div>
          {active && <span className={ADDRESS_LABEL_CLASS}>{postalAddress(pin.address)}</span>}
        </div>
      </KeepScale>
    </div>
  );
}
