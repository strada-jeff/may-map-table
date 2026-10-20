import { useCallback, useEffect, useRef } from "react";
import { useLottieAnimation } from "../hooks/useLottieAnimation";

// balloon_coventry's comp, in its own pixels: the Figma frame (127x261, the
// balloon on its string plus radiating lines) inside build-lottie's 10px pad.
const COMP_WIDTH = 147;
const COMP_HEIGHT = 282;
// The balloon-and-string column within that comp — the box this component
// fills, bottom-centered on the string's foot, so the pin anchors there and
// the radiating lines overflow it without widening the tap target.
const BODY_LEFT = 49.75;
const BODY_TOP = 48;
export const BALLOON_BODY_WIDTH = 48;
export const BALLOON_BODY_HEIGHT = 222;

// Where Figma's placeholder "c" sat, in the Lottie's layer coordinates
// (frame pixels — the pad is applied by a parent transform).
const LABEL_X = 64.85;
const LABEL_Y = 74;
const LABEL_FONT_PX = 23;

const SVG_NS = "http://www.w3.org/2000/svg";
const pct = (n: number, of: number) => `${(n / of) * 100}%`;

/**
 * The animated model-home balloon (Figma's balloon_coventry) with the
 * builder's abbreviation written on it. The recipe drops Figma's "c" and
 * tags the balloon's layer "balloon-body"; the label is added as SVG <text>
 * inside that layer so it sways with the balloon instead of floating over
 * it. Fills its parent, which should have the body's aspect ratio
 * (BALLOON_BODY_WIDTH x BALLOON_BODY_HEIGHT).
 */
export default function LottieBalloon({ label, fontPx = LABEL_FONT_PX }: { label: string; fontPx?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<SVGTextElement | null>(null);
  const labelRef = useRef(label);
  const fontPxRef = useRef(fontPx);

  const addLabel = useCallback((container: HTMLElement) => {
    const layer = container.querySelector(".balloon-body");
    if (!layer) return;
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("class", "lottie-balloon-label font-vision font-extrabold uppercase tracking-tight");
    text.setAttribute("x", `${LABEL_X}`);
    text.setAttribute("y", `${LABEL_Y}`);
    text.setAttribute("fill", "#fff");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-size", `${fontPxRef.current}`);
    text.textContent = labelRef.current;
    layer.appendChild(text);
    textRef.current = text;
  }, []);

  useLottieAnimation(containerRef, "balloon_coventry", { onLoad: addLabel });

  useEffect(() => {
    labelRef.current = label;
    if (textRef.current) textRef.current.textContent = label;
  }, [label]);

  useEffect(() => {
    fontPxRef.current = fontPx;
    textRef.current?.setAttribute("font-size", `${fontPx}`);
  }, [fontPx]);

  return (
    <div
      ref={containerRef}
      className="lottie-balloon pointer-events-none absolute"
      style={{
        left: pct(-BODY_LEFT, BALLOON_BODY_WIDTH),
        top: pct(-BODY_TOP, BALLOON_BODY_HEIGHT),
        width: pct(COMP_WIDTH, BALLOON_BODY_WIDTH),
        height: pct(COMP_HEIGHT, BALLOON_BODY_HEIGHT),
      }}
    />
  );
}
