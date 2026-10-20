import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { DestinationPin } from "../types/pins";
import { useRoute } from "./RouteContext";

type DetailsContextValue = {
  /** null means the details view is closed. */
  activePinId: DestinationPin["id"] | null;
  openDetails: (pinId: DestinationPin["id"]) => void;
  closeDetails: () => void;
};

const DetailsContext = createContext<DetailsContextValue | null>(null);

/**
 * Shared so both the drawer card's "learn more" and a map pin click (when
 * the drawer's closed) open the same details view. Nested inside
 * RouteProvider (see App.tsx) specifically so this can reach into route
 * state in both directions: viewing a pin's details clears any active
 * route (its "show on map" destination pin may not even be the one being
 * viewed), and a route starting to any other pin closes the details view.
 * A route to the viewed pin itself ("show on map") leaves it open —
 * RouteLine fits that route into the map space beside the panel — and
 * closing the details view clears it.
 */
export function DetailsProvider({ children }: { children: ReactNode }) {
  const [activePinId, setActivePinId] = useState<DestinationPin["id"] | null>(null);
  const { activeRoute, clearRoute } = useRoute();

  const openDetails = useCallback(
    (pinId: DestinationPin["id"]) => {
      clearRoute();
      setActivePinId(pinId);
    },
    [clearRoute],
  );
  // Any route still active while details is open is that pin's own "show
  // on map" (a route to another pin closes details, below), so it goes too.
  const closeDetails = useCallback(() => {
    clearRoute();
    setActivePinId(null);
  }, [clearRoute]);

  useEffect(() => {
    if (!activeRoute) return;
    setActivePinId((id) => (id === activeRoute.destinationId ? id : null));
  }, [activeRoute]);

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
