import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CONFIG } from "../config";
import { routes } from "../routing/generated";
import type { ActiveRoute } from "../types/routing";
import { ROUTE_EXIT_FADE_MS } from "../components/routePanes";

export type { ActiveRoute };

type RouteContextValue = {
  activeRoute: ActiveRoute | null;
  /**
   * Lags behind `activeRoute`: when the active route changes (or clears)
   * while one is already displayed, the old presentation fades out in
   * place first — `displayedRoute` only swaps, and consumers should only
   * start any fly/fit animation, once that fade finishes. Going from
   * nothing to a route skips the fade (nothing to fade out).
   *
   * Owned centrally here (not by the components that render off of it) so
   * the SVG route layer and the active-destination marker — two separate
   * render trees — read the exact same fade timer instead of each running
   * their own and risking drift.
   */
  displayedRoute: ActiveRoute | null;
  /** True while the previous route/highlight is fading out ahead of a swap. */
  exiting: boolean;
  /** Reusable everywhere — a map pin, an info card, a future list view. */
  routeTo: (destinationId: string) => void;
  clearRoute: () => void;
};

const RouteContext = createContext<RouteContextValue | null>(null);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [displayedRoute, setDisplayedRoute] = useState<ActiveRoute | null>(null);
  const [exiting, setExiting] = useState(false);
  const displayedRouteRef = useRef(displayedRoute);
  useEffect(() => {
    displayedRouteRef.current = displayedRoute;
  }, [displayedRoute]);

  useEffect(() => {
    if (activeRoute === displayedRouteRef.current) return;

    if (!displayedRouteRef.current) {
      setDisplayedRoute(activeRoute);
      setExiting(false);
      return;
    }

    setExiting(true);
    const timeout = setTimeout(() => {
      setDisplayedRoute(activeRoute);
      setExiting(false);
    }, ROUTE_EXIT_FADE_MS);
    return () => clearTimeout(timeout);
  }, [activeRoute]);

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
    <RouteContext.Provider
      value={{ activeRoute, displayedRoute, exiting, routeTo, clearRoute }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute(): RouteContextValue {
  const context = useContext(RouteContext);
  if (!context) throw new Error("useRoute must be used within a RouteProvider");
  return context;
}
