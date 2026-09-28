import { useSyncExternalStore } from "react";
import { CONFIG } from "../config";

/** CONFIG.touch's shape, widened from its `as const` literals so it can be retuned. */
export type TouchSettings = {
  panThresholdPx: number;
  inertiaStrength: number;
  pinch: { deadZonePx: number; smoothingMs: number };
  pinTap: { maxMovePx: number; minContactMs: number; mapDriftSlackPx: number; maxScaleChange: number };
};

// CONFIG.touch, overridable live from ?debug=touch's sliders so the numbers
// can be tuned on the table. Outside that mode nothing ever sets it, so it
// stays exactly CONFIG.touch. A module-level store rather than a context:
// every pin reads it, and there's only ever one.
let settings: TouchSettings = CONFIG.touch;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setTouchSettings(next: TouchSettings) {
  settings = next;
  for (const listener of listeners) listener();
}

export const resetTouchSettings = () => setTouchSettings(CONFIG.touch);

export const useTouchSettings = () => useSyncExternalStore(subscribe, () => settings);
