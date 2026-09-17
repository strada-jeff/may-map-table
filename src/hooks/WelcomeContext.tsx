import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CONFIG } from "../config";
import { useIdle } from "./useIdle";

type WelcomeContextValue = {
  isIdle: boolean;
  /**
   * Bumped each time the Explore CTA fires (0 = never yet). InitialViewEffect
   * watches it to fly the map to CONFIG.map.initialCenter/initialZoom —
   * distinct from `dismiss` so a category button's own fit-to-category pan
   * (see FilterEffects) isn't immediately overridden by this one.
   */
  exploreCount: number;
  /** Wakes from idle without moving the map — e.g. a category button. */
  dismiss: () => void;
  /** Wakes from idle and flies the map to the initial view. */
  explore: () => void;
};

const WelcomeContext = createContext<WelcomeContextValue | null>(null);

export function WelcomeProvider({ children }: { children: ReactNode }) {
  const [isIdle, wake] = useIdle(CONFIG.welcomeScreen.idleTimeoutMs);
  const [exploreCount, setExploreCount] = useState(0);

  const dismiss = useCallback(() => wake(), [wake]);
  const explore = useCallback(() => {
    wake();
    setExploreCount((n) => n + 1);
  }, [wake]);

  return (
    <WelcomeContext.Provider value={{ isIdle, exploreCount, dismiss, explore }}>
      {children}
    </WelcomeContext.Provider>
  );
}

export function useWelcome(): WelcomeContextValue {
  const context = useContext(WelcomeContext);
  if (!context) throw new Error("useWelcome must be used within a WelcomeProvider");
  return context;
}
