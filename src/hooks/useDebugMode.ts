import { useEffect, useState } from "react";

export const DEBUG_MODES = ["network", "points", "touch"] as const;
export type DebugMode = (typeof DEBUG_MODES)[number];

const param = new URLSearchParams(window.location.search).get("debug");
const initialMode = DEBUG_MODES.find((m) => m === param) ?? null;

/** `?debug=1` opens the mode picker; `?debug=<mode>` opens straight into that mode. */
export const isDebug = param === "1" || initialMode !== null;

/**
 * Which debug tool is showing. Modes are exclusive (their panels would
 * fight over the screen); the network overlay can additionally be layered
 * over the others, since it's what points and routes are placed against.
 * The URL follows the mode, so a reload lands back in it.
 */
export function useDebugMode() {
  const [mode, setMode] = useState<DebugMode | null>(initialMode);
  const [showNetwork, setShowNetwork] = useState(false);

  useEffect(() => {
    if (!isDebug) return;
    const url = new URL(window.location.href);
    url.searchParams.set("debug", mode ?? "1");
    window.history.replaceState(window.history.state, "", url);
  }, [mode]);

  return {
    mode,
    setMode,
    showNetwork,
    setShowNetwork,
    networkVisible: mode === "network" || (mode !== null && showNetwork),
  };
}
