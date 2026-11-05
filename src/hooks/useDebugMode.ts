import { useEffect, useState } from "react";

export const DEBUG_MODES = ["network", "points", "touch", "lottie"] as const;
export type DebugMode = (typeof DEBUG_MODES)[number];

const param = new URLSearchParams(window.location.search).get("debug");
const initialMode = DEBUG_MODES.find((m) => m === param) ?? null;

/**
 * Any `?debug` makes debug available on this page: the Debug button shows
 * (DebugEntryButton), which visitors otherwise never see. On the kiosk,
 * which has no address bar, that means adding `?debug=1` to its launch URL.
 * The URL keeps a `debug` value while it's available, so reloads (the idle
 * content check reloads too) keep it.
 */
export const debugAvailable = param !== null;

/**
 * Which debug tool is showing. `?debug=1` just shows the Debug button;
 * `?debug=menu` opens the mode picker, `?debug=<mode>` that mode. Entered
 * and exited in-app with the Debug button and DebugSwitcher's Exit.
 *
 * Modes are exclusive (their panels would fight over the screen); the
 * network overlay can additionally be layered over the others, since it's
 * what points and routes are placed against. The URL follows the state,
 * so a reload lands back in it.
 */
export function useDebugMode() {
  const [enabled, setEnabled] = useState(param === "menu" || initialMode !== null);
  const [mode, setMode] = useState<DebugMode | null>(initialMode);
  const [showNetwork, setShowNetwork] = useState(false);

  useEffect(() => {
    if (!debugAvailable) return;
    const url = new URL(window.location.href);
    url.searchParams.set("debug", enabled ? (mode ?? "menu") : "1");
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
