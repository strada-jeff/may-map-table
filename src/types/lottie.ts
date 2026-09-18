import type { Point } from "../routing/types";
import type { LottieAnimationId } from "../data/lottie";

/**
 * Purely decorative — unlike DestinationPin, never routed to, so its
 * position is a raw map-space point straight from the registry, not an
 * anchor joined in from network.svg.
 */
export type LottieMarkerConfig = {
  id: string;
  file: LottieAnimationId;
  position: Point;
  /** On-screen width/height in map units (artwork pixels), so it scales with zoom like the road art rather than staying a fixed screen size like a marker icon. */
  size: number;
};
