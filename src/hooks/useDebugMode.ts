import { useEffect, useState } from "react";

export const DEBUG_MODES = ["network", "points", "touch", "lottie"] as const;
export type DebugMode = (typeof DEBUG_MODES)[number];

const param = new URLSearchParams(window.location.search).get("debug");
const initialMode = DEBUG_MODES.find((m) => m === param) ?? null;

/**
 * Which debug tool is showing. `?debug=1` opens the mode picker;
 * `?debug=<mode>` opens straight into that mode. Debug can also be
 * entered and exited in-app (DebugEntryButton, DebugSwitcher's Exit), for
 * the kiosk, which has no address bar.
 *
 * Modes are exclusive (their panels would fight over the screen); the
 * network overlay can additionally be layered over the others, since it's
 * what points and routes are placed against. The URL follows the state,
 * so a reload lands back in it.
 */
export function useDebugMode() {
  const [enabled, setEnabled] = useState(param === "1" || initialMode !== null);
  const [mode, setMode] = useState<DebugMode | null>(initialMode);
  const [showNetwork, setShowNetwork] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (enabled) url.searchParams.set("debug", mode ?? "1");
    else url.searchParams.delete("debug");
    window.history.replaceState(window.history.state, "", url);
  }, [enabled, mode]);

  return {
    enabled,
    enter: () => setEnabled(true),
    exit: () => {
      setEnabled(false);
      setMode(null);
      setShowNetwork(false);
    },
    mode,
    setMode,
    showNetwork,
    setShowNetwork,
    networkVisible: mode === "network" || (mode !== null && showNetwork),
  };
}
