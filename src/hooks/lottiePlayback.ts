import { useSyncExternalStore } from "react";
import type { LottieAnimationId } from "../data/lottie";
import { useMapTransformEffect } from "./MapControlsContext";

// How long the map must sit still after its last transform change before
// animations resume — long enough to bridge the gaps between gesture
// frames and inertia, short enough that the scene wakes up right away.
const SETTLE_MS = 200;

// Whether every Lottie (map scenery, pins, CTA) should hold still. A
// module-level store rather than a context, like touchSettings: ~50
// animations read it and there's only ever one.
let mapMoving = false;
let pausedByDebug = false;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const notify = () => {
  for (const listener of listeners) listener();
};

/** True while the map is moving or ?debug=lottie has paused animations. */
export const isLottiePaused = () => mapMoving || pausedByDebug;

/**
 * For useLottieAnimation, which applies it imperatively — a React
 * subscription would re-render every animated component at the start and
 * end of each gesture, the exact moment this exists to keep cheap.
 */
export const subscribeLottiePaused = subscribe;

export const usePausedByDebug = () => useSyncExternalStore(subscribe, () => pausedByDebug);

export function setPausedByDebug(paused: boolean) {
  pausedByDebug = paused;
  notify();
}

// ?debug=lottie's per-animation switches: an id in here isn't loaded at
// all (no SVG in the DOM), so turning one off removes its whole cost —
// for finding which animation the frame-rate meter's slow frames come
// from. Replaced, never mutated, so it works as a useSyncExternalStore
// snapshot.
let disabledByDebug: ReadonlySet<LottieAnimationId> = new Set();

export const useDisabledByDebug = () => useSyncExternalStore(subscribe, () => disabledByDebug);

export function setDisabledByDebug(ids: Iterable<LottieAnimationId>) {
  disabledByDebug = new Set(ids);
  notify();
}

/**
 * Mount once, inside the map: pauses all Lotties while the map's transform
 * is changing — pan, pinch, inertia, and programmatic camera moves (opening
 * details, fitting a route) alike. During those, every frame already
 * re-composites the whole 4K scene; animations repainting underneath on
 * the kiosk's integrated graphics is where stutter would show first.
 */
export function useLottieMotionPause() {
  useMapTransformEffect(() => {
    if (!mapMoving) {
      mapMoving = true;
      notify();
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      mapMoving = false;
      notify();
    }, SETTLE_MS);
  });
}
