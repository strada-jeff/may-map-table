export type GestureEntry = {
  kind: "pinch-start" | "pinch-end" | "glide" | "glide-skipped" | "pan-held" | "pan-resumed";
  detail: string;
  /** Worth a second look — e.g. a pinch restarting straight after one ended (an IR finger-ID drop). */
  warn?: boolean;
};

// useMapGestures reports what it decided (a pinch started or ended, a glide
// ran or was skipped) for ?debug=touch's tap log, which can't infer those
// from raw pointer events the way it does taps. Nothing listens outside
// debug, so `detail` is built lazily to keep that path free.
const listeners = new Set<(entry: GestureEntry) => void>();

export function logGesture(kind: GestureEntry["kind"], detail: () => string, warn = false) {
  if (listeners.size === 0) return;
  const entry = { kind, detail: detail(), warn };
  for (const listener of listeners) listener(entry);
}

export function onGesture(listener: (entry: GestureEntry) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
