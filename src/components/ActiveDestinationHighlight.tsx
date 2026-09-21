import { KeepScale } from "react-zoom-pan-pinch";
import type { DestinationPin } from "../types/pins";
import DestinationFlagIcon from "./DestinationFlagIcon";

// Same artwork proportions as LocationMarker/ModelHomeMarker (see there for
// the measured anchor notes) — sized up slightly so the highlighted pin
// visibly pops above its dimmed twin underneath. Duplicated on purpose
// rather than reusing those components directly: an earlier version tried
// elevating the real marker above the dim overlay instead, which needed a
// remount-via-key hack to move it in the DOM; a second, disposable pin here
// is simpler and more robust, at the cost of keeping this geometry in sync
// by hand if those change.
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

export default function ActiveDestinationHighlight({
  pin,
  fadeOut,
}: {
  pin: DestinationPin;
  /** True while RouteContext is fading this out ahead of a route change. */
  fadeOut: boolean;
}) {
  const [x, y] = pin.position;

  return (
    <div
      className="active-destination-highlight pointer-events-none absolute z-30"
      style={{ left: x, top: y, opacity: fadeOut ? 0 : 1 }}
    >
      {/* transformOrigin "0 0" — see LocationMarker for why KeepScale needs
          this to keep the anchor pinned to (x, y) across zoom levels. */}
      <KeepScale style={{ transformOrigin: "0 0" }}>
        {pin.kind === "model-home" ? (
          <div
            className="flex -translate-x-1/2 -translate-y-full items-end gap-3"
            style={{ height: BALLOON_DISPLAY_HEIGHT }}
          >
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
          </div>
        ) : (
          <div
            className="flex items-end gap-3"
            style={{
              height: FLAG_DISPLAY_HEIGHT,
              transform: `translate(${-Math.round((FLAG_DISPLAY_WIDTH * FLAG_ANCHOR_X) / FLAG_NATURAL_WIDTH)}px, ${-Math.round((FLAG_DISPLAY_HEIGHT * FLAG_ANCHOR_Y) / FLAG_NATURAL_HEIGHT)}px)`,
            }}
          >
            <div style={{ width: FLAG_DISPLAY_WIDTH, height: FLAG_DISPLAY_HEIGHT }}>
              <DestinationFlagIcon color={pin.markerColor ?? FALLBACK_COLOR} className="size-full" />
            </div>
            <span className={LABEL_CLASS}>{pin.title}</span>
          </div>
        )}
      </KeepScale>
    </div>
  );
}
