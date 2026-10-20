import { useRef } from "react";
import { useLottieAnimation } from "../hooks/useLottieAnimation";
import type { LottieMarkerConfig } from "../types/lottie";

/**
 * Animated scenery laid exactly over the hole its base.svg art left in the
 * tiles (build-artwork drops that art; build-lottie computes the matrix).
 * Sized in the Lottie's own comp pixels and mapped onto the artwork by
 * `matrix` — scale, the art's rotation where it follows a road, position —
 * and *not* wrapped in KeepScale, so it scales with the artwork as the
 * shared transform zooms, the same as the tile art it replaces.
 */
export default function LottieMarker({ marker }: { marker: LottieMarkerConfig }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useLottieAnimation(containerRef, marker.file);

  const [width, height] = marker.size;

  return (
    <div
      ref={containerRef}
      className="lottie-marker pointer-events-none absolute left-0 top-0 origin-top-left"
      style={{ width, height, transform: `matrix(${marker.matrix.join(",")})` }}
    />
  );
}
