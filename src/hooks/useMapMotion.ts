import { useEffect, useLayoutEffect, useRef } from "react";
import { useMapTransformEffect } from "./MapControlsContext";

// How long the map must sit still after its last transform change to count
// as settled — same bridge over gesture-frame and inertia gaps as
// lottiePlayback's SETTLE_MS.
const SETTLE_MS = 200;

/**
 * Calls `listener(true)` when the map's transform starts changing — pan,
 * pinch, inertia or a programmatic camera move alike — and
 * `listener(false)` once it has held still for SETTLE_MS.
 */
export function useMapMotion(listener: (moving: boolean) => void) {
  const listenerRef = useRef(listener);
  useLayoutEffect(() => {
    listenerRef.current = listener;
  });
  const moving = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useMapTransformEffect(() => {
    if (!moving.current) {
      moving.current = true;
      listenerRef.current(true);
    }
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      moving.current = false;
      listenerRef.current(false);
    }, SETTLE_MS);
  });

  useEffect(() => () => clearTimeout(settleTimer.current), []);
}
