import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import KeepScale from "./KeepScale";
import RoundCloseButton from "./RoundCloseButton";
import { MARKER_SIZE } from "./MarkerIcons";
import { usePinClick } from "../hooks/usePinClick";
import { useRoute } from "../hooks/RouteContext";
import { ROUTE_EXIT_FADE_MS } from "./routePanes";
import { streetAddress } from "./postalAddress";
import { LABEL_GAP_PX, type LabelSide } from "./directionsLabel";

// The active destination's directions label (Figma 2496:6373): its name,
// street and a close button, 402px wide with Figma's gaps between them.
// Figma hangs it below the circle; RouteLine moves it to whichever side
// covers the least of the route and the place's art (directionsLabel).
const LABEL_WIDTH = 402;
const ADDRESS_GAP_PX = 28;

// Placed off the marker box's edges, so drawing it never needs its size
// (the same rectangles as directionsLabel's labelRect, which frames it):
// centered on the circle's axis, a gap clear of the box. On a side, every
// line aligns toward the marker (left-aligned on the right, right-aligned
// on the left); centered above and below.
const OFF_BOX = MARKER_SIZE + LABEL_GAP_PX;
const ACROSS = MARKER_SIZE / 2 - LABEL_WIDTH / 2;
const LABEL_PLACEMENT: Record<LabelSide, { className: string; style: CSSProperties }> = {
  below: { className: "items-center text-center", style: { left: ACROSS, top: OFF_BOX } },
  above: { className: "items-center text-center", style: { left: ACROSS, bottom: OFF_BOX } },
  right: { className: "items-start text-left -translate-y-1/2", style: { left: OFF_BOX, top: MARKER_SIZE / 2 } },
  left: { className: "items-end text-right -translate-y-1/2", style: { right: OFF_BOX, top: MARKER_SIZE / 2 } },
};

type PinMarkerProps = {
  pinId: string;
  position: readonly [number, number];
  /** Where the icon meets the map, in its MARKER_SIZE box. */
  anchor: readonly [number, number];
  icon: ReactNode;
  name: string;
  address: string;
  /** Whether this pin currently matches the active filter. Ignored while `active`. */
  visible: boolean;
  /**
   * True while this pin is the active route's destination: labeled with
   * its name and street and a close button that ends directions, and
   * elevated (z-30) above the route dim overlay/line instead of getting
   * dimmed like every other pin — see MapView's comment on why plain
   * z-index is enough, no second disposable marker needed.
   */
  active: boolean;
  /** True while RouteContext is fading the active state out ahead of a route change/clear. */
  fadeOut: boolean;
};

/**
 * A pin on the map — LocationMarker's flag or ModelHomeMarker's balloon —
 * planted by `anchor` at its (iconOffset-nudged) position, kept a steady
 * screen size by KeepScale. The tap target is the icon's box.
 */
export default function PinMarker({
  pinId,
  position: [x, y],
  anchor: [anchorX, anchorY],
  icon,
  name,
  address,
  visible,
  active,
  fadeOut,
}: PinMarkerProps) {
  const tap = usePinClick(pinId);
  const { clearRoute, labelSide, reportLabelSize } = useRoute();

  // Its full-size px (layout size: KeepScale's transform doesn't change
  // it), for RouteLine's framing, which runs after this in the same commit.
  const labelRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const label = labelRef.current;
    if (active && label) reportLabelSize({ width: label.offsetWidth, height: label.offsetHeight });
  });
  const placement = LABEL_PLACEMENT[labelSide];

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
      {/* transformOrigin "0 0" is required: KeepScale's own counter-scale
          otherwise pivots around its box's center, dragging the anchor
          below away from (x, y) as the map's zoom scale changes instead of
          keeping it pinned in place. */}
      <KeepScale style={{ transformOrigin: "0 0" }}>
        {/* Pure anchor placement — kept separate from .destination-marker
            below so its own inline transform doesn't fight that class's
            CSS-driven show/hide transform on .destination-marker-inner.
            The directions label hangs below the box, so it never affects
            the anchor math. */}
        <div
          className="pin-marker-anchor relative"
          style={{
            width: MARKER_SIZE,
            height: MARKER_SIZE,
            transform: `translate(${-anchorX}px, ${-anchorY}px)`,
          }}
        >
          <div
            className={`destination-marker size-full ${visible || active ? "" : "marker-hidden"}`}
            data-pin-id={pinId}
            {...tap}
          >
            <div className="destination-marker-inner relative size-full">{icon}</div>
          </div>
          {active && (
            <div
              ref={labelRef}
              className={`pin-marker-directions absolute flex flex-col text-white ${placement.className}`}
              style={{ ...placement.style, width: LABEL_WIDTH }}
            >
              <p className="pin-marker-directions-name font-vision text-[70px] leading-[74px]">{name}</p>
              {/* No address yet (the CMS flags it): no line, rather than an empty one. */}
              {address && (
                <p
                  className="pin-marker-directions-address whitespace-nowrap font-vision text-[30px] font-extrabold uppercase leading-[36px] tracking-[1.2px]"
                  style={{ marginTop: ADDRESS_GAP_PX }}
                >
                  {streetAddress(address)}
                </p>
              )}
              <RoundCloseButton onClose={clearRoute} className="mt-[41px]" />
            </div>
          )}
        </div>
      </KeepScale>
    </div>
  );
}
