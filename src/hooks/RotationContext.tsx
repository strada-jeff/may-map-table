import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type RotationContextValue = {
  rotated: boolean;
  toggle: () => void;
  /** Back to upright — IdleResetEffect uses this so each visitor starts unrotated. */
  reset: () => void;
};

const RotationContext = createContext<RotationContextValue | null>(null);

/**
 * Whether the app is flipped 180deg lives here (rather than local App
 * state) so RotateControl and SidePanel's rotate-confirm branch can share
 * it without prop drilling — RotateControl now opens the confirm overlay
 * instead of toggling directly, and the overlay's own CTA is what actually
 * calls `toggle`.
 */
export function RotationProvider({ children }: { children: ReactNode }) {
  const [rotated, setRotated] = useState(false);
  const toggle = useCallback(() => setRotated((r) => !r), []);
  const reset = useCallback(() => setRotated(false), []);

  return <RotationContext.Provider value={{ rotated, toggle, reset }}>{children}</RotationContext.Provider>;
}

export function useRotation(): RotationContextValue {
  const context = useContext(RotationContext);
  if (!context) throw new Error("useRotation must be used within a RotationProvider");
  return context;
}
