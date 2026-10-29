import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { CONFIG } from "../config";
import { planRoutes } from "../routing";
import { network, origins } from "../routing/generated";
import { useDestinationPins } from "./useDestinationPins";
import type { ActiveRoute } from "../types/routing";
import { ROUTE_EXIT_FADE_MS } from "../components/routePanes";
import type { LabelSide, LabelSize } from "../components/directionsLabel";

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
  /**
   * Which side of the destination's circle its directions label hangs on:
   * RouteLine picks it while framing the route (chooseLabelSide), PinMarker
   * draws it there.
   */
  labelSide: LabelSide;
  setLabelSide: (side: LabelSide) => void;
  /**
   * The label's full-size px, measured by PinMarker as it mounts — in the
   * same commit as, and before, RouteLine's framing reads it (markers come
   * first in MapView). Starts as a generous guess.
   */
  labelSize: Readonly<MutableRefObject<LabelSize>>;
  reportLabelSize: (size: LabelSize) => void;
};

const RouteContext = createContext<RouteContextValue | null>(null);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [displayedRoute, setDisplayedRoute] = useState<ActiveRoute | null>(null);
  const [exiting, setExiting] = useState(false);
  const [labelSide, setLabelSide] = useState<LabelSide>("below");
  const labelSize = useRef<LabelSize>({ width: 402, height: 400 });
  const reportLabelSize = useCallback((size: LabelSize) => {
    labelSize.current = size;
  }, []);
  const displayedRouteRef = useRef(displayedRoute);

  // Routed from the pins as loaded, so a pin moved in the CMS routes from
  // its new spot without a rebuild. Each destination lands on the road at
  // its `anchor`, not its icon (iconOffset moves only the icon).
  const { pins } = useDestinationPins();
  const plan = useMemo(() => {
    const result = planRoutes(
      network,
      origins,
      pins.map((pin) => ({ id: pin.id, point: pin.anchor })),
      CONFIG.routing.maxSnapDistance,
    );
    for (const problem of result.problems) console.warn(`Pin placement: ${problem}`);
    return result;
  }, [pins]);
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
    const route = plan.routes.get(destinationId);
    if (!route) {
      console.warn(
        `No route to "${destinationId}" — it may have no anchor in the data, or may be ` +
          `unreachable from its network's origin.`,
      );
      setActiveRoute(null);
      return;
    }
    setActiveRoute({
      destinationId,
      originId: route.originId,
      coordinates: route.coordinates,
      distance: route.distance,
    });
  }, [plan]);

  const clearRoute = useCallback(() => setActiveRoute(null), []);

  return (
    <RouteContext.Provider
      value={{ activeRoute, displayedRoute, exiting, routeTo, clearRoute, labelSide, setLabelSide, labelSize, reportLabelSize }}
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
