import FlagGlyph from "./FlagGlyph";
import PulseCircle from "./PulseCircle";
import balloonArt from "../assets/markers/balloon.svg";

// Figma flag_new (2519:10356) and balloon_new (2519:10775): a flag or
// balloon on a pulsing white circle, drawn in a 134px box — the size on the
// map at full zoom (KeepScale shrinks it zoomed out) and in the key.
export const MARKER_SIZE = 134;

// Where each marker meets the map, in its box: the flag's pole base and the
// balloon's tail tip — the same points the old flag and balloon were
// planted by, so pins' CMS icon offsets still hold.
export const FLAG_ANCHOR = [37.7, 109] as const;
export const BALLOON_ANCHOR = [65.7, 119] as const;

// The flag's place in its box (Figma: inset 26.12% 15.8% 18.66% 27%).
const FLAG_LEFT = 36.18;
const FLAG_TOP = 35;

// The balloon's circle is smaller than its box, leaving room under it for
// the tail; its letters sit centered on the envelope (Figma: caps from 47
// to 63, centered on x 67.5).
const BALLOON_CIRCLE = { left: 14, top: 0, size: 106 };
const BALLOON_LABEL_CENTER = [67.5, 55] as const;

export function FlagMarkerIcon({ color }: { color: string }) {
  return (
    <div className="flag-marker-icon pointer-events-none relative" style={{ width: MARKER_SIZE, height: MARKER_SIZE }}>
      <PulseCircle left={0} top={0} size={MARKER_SIZE} />
      <FlagGlyph color={color} className="absolute" style={{ left: FLAG_LEFT, top: FLAG_TOP }} />
    </div>
  );
}

export function BalloonMarkerIcon({ label }: { label: string }) {
  return (
    <div className="balloon-marker-icon pointer-events-none relative" style={{ width: MARKER_SIZE, height: MARKER_SIZE }}>
      <PulseCircle {...BALLOON_CIRCLE} />
      <img src={balloonArt} alt="" className="absolute inset-0 size-full" />
      <span
        className="balloon-marker-label absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-vision text-[26px] font-extrabold uppercase leading-none tracking-[-1.3px] text-white"
        style={{ left: BALLOON_LABEL_CENTER[0], top: BALLOON_LABEL_CENTER[1] }}
      >
        {label}
      </span>
    </div>
  );
}
