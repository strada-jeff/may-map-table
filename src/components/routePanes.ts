/**
 * Pane names for the directions-active layer stack. Both are created (and
 * z-indexed) once in RouteEffects, before any of its children mount, so
 * every component below can just reference them by name.
 *
 * routeDim sits just above the default markerPane (600) so it darkens the
 * base artwork and every ordinary pin; routeActive sits above that so the
 * drawn route, its arrowhead, the "you are here" badge, and the active
 * destination's highlighted pin all stay bright on top of the dimming.
 */
export const ROUTE_DIM_PANE = "routeDim";
export const ROUTE_ACTIVE_PANE = "routeActive";

/**
 * How long the dim overlay/route line/badge/highlight fade out for before
 * RouteEffects swaps in a new route (or clears to none). Shared so the CSS
 * transitions on each of those (index.css: .route-dim-overlay,
 * .you-are-here-badge, .active-destination-highlight) and RouteLine's own
 * inline fade all finish in lockstep with the setTimeout in RouteEffects
 * that actually performs the swap.
 */
export const ROUTE_EXIT_FADE_MS = 350;
