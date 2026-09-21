/**
 * How long the dim overlay/route line/badge/active-pin fade out for before
 * RouteEffects swaps in a new route (or clears to none). Shared so each of
 * those pieces' own inline `transition` (RouteDimOverlay, RouteLine, and
 * LocationMarker/ModelHomeMarker's `active` state) finishes in lockstep
 * with the setTimeout in RouteEffects that actually performs the swap.
 */
export const ROUTE_EXIT_FADE_MS = 350;
