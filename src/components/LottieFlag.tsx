import { useRef, type CSSProperties } from "react";
import { LOTTIE_ANIMATIONS } from "../data/lottie";
import { useLottieAnimation } from "../hooks/useLottieAnimation";

// flag_red's comp, in its own pixels: the Figma frame (283x267, the flag
// plus its radiating lines) inside build-lottie's 14px pad.
const COMP_WIDTH = 311;
const COMP_HEIGHT = 295;
// The flag body (shadow ellipse to fabric tip) within that comp — the box
// this component fills, so the radiating lines overflow it while the pin's
// tap target and anchor stay on the flag itself, matching the old static
// destination-flag.svg (172x215, same art).
const BODY_LEFT = 73;
const BODY_TOP = 66;
export const FLAG_BODY_WIDTH = 173;
export const FLAG_BODY_HEIGHT = 215;

const pct = (n: number, of: number) => `${(n / of) * 100}%`;

/**
 * The animated destination flag (Figma's flag_red), recolored per category:
 * the recipe tags the fabric and lines layers "flag-color", which index.css
 * fills from --flag-color. Fills its parent, which should have the flag
 * body's aspect ratio (FLAG_BODY_WIDTH x FLAG_BODY_HEIGHT).
 */
export default function LottieFlag({ color }: { color: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useLottieAnimation(containerRef, LOTTIE_ANIMATIONS.flag_red);

  return (
    <div
      ref={containerRef}
      className="lottie-flag pointer-events-none absolute"
      style={
        {
          "--flag-color": color,
          left: pct(-BODY_LEFT, FLAG_BODY_WIDTH),
          top: pct(-BODY_TOP, FLAG_BODY_HEIGHT),
          width: pct(COMP_WIDTH, FLAG_BODY_WIDTH),
          height: pct(COMP_HEIGHT, FLAG_BODY_HEIGHT),
        } as CSSProperties
      }
    />
  );
}
