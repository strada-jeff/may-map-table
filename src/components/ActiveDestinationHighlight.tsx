import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { MapSpace } from "../routing";
import type { DestinationPin } from "../types/pins";
import DestinationFlagIcon from "./DestinationFlagIcon";
import { ROUTE_ACTIVE_PANE } from "./routePanes";

// Same artwork proportions as LocationMarker/ModelHomeMarker (see there for
// the measured anchor notes) — sized up slightly so the highlighted pin
// visibly pops above its dimmed twin underneath. Duplicated on purpose
// rather than reusing those components directly: an earlier version tried
// elevating the real marker into this pane instead, which meant swapping
// its Leaflet pane on the fly — Leaflet doesn't support that, so it needed
// a remount-via-key hack that turned out to be fragile (an explicit
// `pane={undefined}` on the non-elevated path silently broke the marker
// entirely). A second, disposable pin here is simpler and more robust,
// at the cost of keeping this geometry in sync by hand if those change.
const FLAG_NATURAL_WIDTH = 172;
const FLAG_NATURAL_HEIGHT = 215;
const FLAG_ANCHOR_X = 14;
const FLAG_ANCHOR_Y = 213;
const FLAG_DISPLAY_HEIGHT = 84;
const FLAG_DISPLAY_WIDTH = Math.round((FLAG_DISPLAY_HEIGHT * FLAG_NATURAL_WIDTH) / FLAG_NATURAL_HEIGHT);

const BALLOON_ICON = "/icons/model-home-balloon.svg";
const BALLOON_NATURAL_WIDTH = 48;
const BALLOON_NATURAL_HEIGHT = 189;
// Builder-abbreviation dot within the balloon art (see ModelHomeMarker for
// the measured envelope this comes from) — baked into neither the SVG nor
// this component's own markup, so it has to be positioned the same way here.
const BALLOON_LABEL_TOP_PERCENT = (34 / BALLOON_NATURAL_HEIGHT) * 100;
const BALLOON_DISPLAY_HEIGHT = 132;
const BALLOON_DISPLAY_WIDTH = Math.round(
  (BALLOON_DISPLAY_HEIGHT * BALLOON_NATURAL_WIDTH) / BALLOON_NATURAL_HEIGHT,
);

const FALLBACK_COLOR = "#82b1dd";

const LABEL_CLASS =
  "mb-2 whitespace-nowrap font-vision text-[26px] font-extrabold uppercase tracking-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]";

// Extra width beyond the icon itself, reserved for the label — Leaflet
// doesn't clip a divIcon's overflow, but iconSize still needs to be wide
// enough that the anchor math (which stays keyed to the icon's own width,
// below) doesn't get thrown off by it.
const LABEL_WIDTH_BUDGET = 420;

export default function ActiveDestinationHighlight({
  space,
  pin,
  fadeOut,
}: {
  space: MapSpace;
  pin: DestinationPin;
  /** True while RouteEffects is fading this out ahead of a route change. */
  fadeOut: boolean;
}) {
  const position = useMemo(() => space.toLatLng(pin.position), [space, pin.position]);

  const icon = useMemo(() => {
    // Narrowed via direct `pin.kind` checks (not a hoisted boolean) so
    // `pin.name`/`pin.title` stay type-safe across the union.
    if (pin.kind === "model-home") {
      const html = renderToStaticMarkup(
        <div className="flex items-end gap-3" style={{ height: BALLOON_DISPLAY_HEIGHT }}>
          <div className="relative" style={{ width: BALLOON_DISPLAY_WIDTH, height: BALLOON_DISPLAY_HEIGHT }}>
            <img src={BALLOON_ICON} alt="" className="absolute inset-0 size-full" />
            <span
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-vision text-[16px] font-extrabold uppercase tracking-tight text-white"
              style={{ top: `${BALLOON_LABEL_TOP_PERCENT}%` }}
            >
              {pin.markerLabel ?? ""}
            </span>
          </div>
          <span className={LABEL_CLASS}>{pin.name}</span>
        </div>,
      );
      return L.divIcon({
        className: "active-destination-highlight",
        html,
        iconSize: [BALLOON_DISPLAY_WIDTH + LABEL_WIDTH_BUDGET, BALLOON_DISPLAY_HEIGHT],
        iconAnchor: [BALLOON_DISPLAY_WIDTH / 2, BALLOON_DISPLAY_HEIGHT],
      });
    }

    const html = renderToStaticMarkup(
      <div className="flex items-end gap-3" style={{ height: FLAG_DISPLAY_HEIGHT }}>
        <div style={{ width: FLAG_DISPLAY_WIDTH, height: FLAG_DISPLAY_HEIGHT }}>
          <DestinationFlagIcon color={pin.markerColor ?? FALLBACK_COLOR} className="size-full" />
        </div>
        <span className={LABEL_CLASS}>{pin.title}</span>
      </div>,
    );
    return L.divIcon({
      className: "active-destination-highlight",
      html,
      iconSize: [FLAG_DISPLAY_WIDTH + LABEL_WIDTH_BUDGET, FLAG_DISPLAY_HEIGHT],
      iconAnchor: [
        Math.round((FLAG_DISPLAY_WIDTH * FLAG_ANCHOR_X) / FLAG_NATURAL_WIDTH),
        Math.round((FLAG_DISPLAY_HEIGHT * FLAG_ANCHOR_Y) / FLAG_NATURAL_HEIGHT),
      ],
    });
  }, [pin]);

  return (
    <Marker
      position={position}
      icon={icon}
      pane={ROUTE_ACTIVE_PANE}
      interactive={false}
      opacity={fadeOut ? 0 : 1}
    />
  );
}
