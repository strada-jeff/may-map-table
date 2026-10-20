import { useRef } from "react";
import { useLottieAnimation } from "../hooks/useLottieAnimation";
import { useTap } from "../hooks/useTap";

// cta_viewmap's comp (Figma's 368x339 frame inside build-lottie's 16px pad)
// and the center of the circle Figma laid it out around (hidden in the
// design, so not in the export) — centered on the button, with the
// radiating lines overflowing it.
const COMP_WIDTH = 400;
const COMP_HEIGHT = 371;
const CENTER_X = 199.4;
const CENTER_Y = 188.2;
const BUTTON_SIZE = 299;

type ExploreCtaProps = {
  onClick: () => void;
  /** Whether the welcome overlay is showing; the animation pauses while it's faded out. */
  visible: boolean;
};

export default function ExploreCta({ onClick, visible }: ExploreCtaProps) {
  const tap = useTap(onClick);
  const animationRef = useRef<HTMLDivElement | null>(null);
  useLottieAnimation(animationRef, "cta_viewmap", { active: visible });

  return (
    <button
      type="button"
      aria-label="View the map"
      {...tap}
      className="explore-cta relative"
      style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
    >
      <div
        ref={animationRef}
        className="explore-cta-animation pointer-events-none absolute"
        style={{
          left: BUTTON_SIZE / 2 - CENTER_X,
          top: BUTTON_SIZE / 2 - CENTER_Y,
          width: COMP_WIDTH,
          height: COMP_HEIGHT,
        }}
      />
    </button>
  );
}
