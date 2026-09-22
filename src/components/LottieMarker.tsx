import { useEffect, useRef } from "react";
// Light build: no AE expressions interpreter (this project's animations
// don't use them), which also drops the `eval()` the full build ships for it.
import lottie from "lottie-web/build/player/lottie_light";
import { LOTTIE_ANIMATIONS } from "../data/lottie";
import type { LottieMarkerConfig } from "../types/lottie";

/**
 * A plain absolutely-positioned div in artwork-pixel units, *not* wrapped
 * in KeepScale — unlike destination markers, these are meant to scale with
 * the artwork as the shared transform zooms, the same as the road/route
 * art. That's the whole reason this used to need a bespoke Leaflet
 * L.svgOverlay sized in map units instead of an ordinary marker; here it's
 * just an ordinary positioned element, since everything in this coordinate
 * space scales together for free.
 */
export default function LottieMarker({ marker }: { marker: LottieMarkerConfig }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const animation = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: LOTTIE_ANIMATIONS[marker.file],
    });
    return () => animation.destroy();
  }, [marker.file]);

  const [x, y] = marker.position;
  const half = marker.size / 2;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute"
      style={{ left: x - half, top: y - half, width: marker.size, height: marker.size }}
    />
  );
}
