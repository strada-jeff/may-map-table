import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CONFIG } from "../config";
import { routes } from "../routing/generated";
import type { ActiveRoute } from "../types/routing";

export type { ActiveRoute };

type RouteContextValue = {
  activeRoute: ActiveRoute | null;
  /** Reusable everywhere — a map pin, an info card, a future list view. */
  routeTo: (destinationId: string) => void;
  clearRoute: () => void;
};

const RouteContext = createContext<RouteContextValue | null>(null);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);

  const routeTo = useCallback((destinationId: string) => {
    const originId: string = CONFIG.routing.activeOriginId;
    const route = routes[originId]?.[destinationId];
    if (!route) {
      console.warn(
        `No route from origin "${originId}" to "${destinationId}" — ` +
          `it may be unreachable or the id may not exist in #destinations.`,
      );
      setActiveRoute(null);
      return;
    }
    setActiveRoute({
      destinationId,
      originId,
      coordinates: route.coordinates,
      distance: route.distance,
    });
  }, []);

  const clearRoute = useCallback(() => setActiveRoute(null), []);

  return (
    <RouteContext.Provider value={{ activeRoute, routeTo, clearRoute }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute(): RouteContextValue {
  const context = useContext(RouteContext);
  if (!context) throw new Error("useRoute must be used within a RouteProvider");
  return context;
}
