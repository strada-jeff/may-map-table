export const CONFIG = {
  welcomeScreen: {
    idleTimeoutMs: 90_000, // how long the app can sit idle before the welcome overlay reappears
  },
  map: {
    width: 3840, // pixel dimension of base artwork
    height: 2160,
    minZoom: -2, // furthest the map controls can zoom out; build:tiles matches this
    maxZoom: 2, // furthest the map controls can zoom in; build:tiles matches this
    initialCenter: "main" as string | readonly [number, number], // anchor id or [x, y] point
    initialZoom: 1.4, // zoom once the welcome screen is dismissed
    idleZoomOffset: 1, // idle view is initialZoom minus this, zoomed further out
  },
  tiles: {
    tileSize: 256,
  },
  routing: {
    activeOriginId: "main", // Which #origins anchor in network.svg routes are precomputed from.
    fitPaddingPx: 80, // Screen-pixel padding when the map fits to a newly-activated route.
  },
  details: {
    panelWidthPx: 720, // kiosk screen is fixed, so this is a constant, not measured
  },
} as const;
