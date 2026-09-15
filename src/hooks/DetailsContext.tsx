import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { DestinationPin } from "../types/pins";

type DetailsContextValue = {
  /** null means the details view is closed. */
  activePinId: DestinationPin["id"] | null;
  openDetails: (pinId: DestinationPin["id"]) => void;
  closeDetails: () => void;
};

const DetailsContext = createContext<DetailsContextValue | null>(null);

/**
 * Shared so both the drawer card's "learn more" and a map pin click (when
 * the drawer's closed) open the same details view.
 */
export function DetailsProvider({ children }: { children: ReactNode }) {
  const [activePinId, setActivePinId] = useState<DestinationPin["id"] | null>(null);

  const openDetails = useCallback((pinId: DestinationPin["id"]) => setActivePinId(pinId), []);
  const closeDetails = useCallback(() => setActivePinId(null), []);

  return (
    <DetailsContext.Provider value={{ activePinId, openDetails, closeDetails }}>
      {children}
    </DetailsContext.Provider>
  );
}

export function useDetails(): DetailsContextValue {
  const context = useContext(DetailsContext);
  if (!context) throw new Error("useDetails must be used within a DetailsProvider");
  return context;
}
