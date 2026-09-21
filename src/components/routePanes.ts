/**
 * How long the dim overlay/route line/badge/highlight fade out for before
 * RouteEffects swaps in a new route (or clears to none). Shared so the CSS
 * transitions on each of those (index.css: .route-dim-overlay,
 * .you-are-here-badge, .active-destination-highlight) and RouteLine's own
 * inline fade all finish in lockstep with the setTimeout in RouteEffects
 * that actually performs the swap.
 */
export const ROUTE_EXIT_FADE_MS = 350;
