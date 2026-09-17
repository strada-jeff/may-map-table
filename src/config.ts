export const CONFIG = {
  welcomeScreen: {
    idleTimeoutMs: 90_000, // how long the app can sit idle before the welcome overlay reappears
  },
  map: {
    width: 3840, // pixel dimension of base artwork
    height: 2160,
  },
  tiles: {
    // Leaflet zoom range for the base artwork's raster tile pyramid — must
    // match what `npm run build:tiles` actually generated in public/tiles,
    // since a mismatch means Leaflet requests zoom levels with no tiles on
    // disk. CRS.Simple scales 1 map unit to 2^zoom pixels, so maxZoom 2
    // means the top tile level renders the artwork at 4x (15360x8640).
    minZoom: -4,
    maxZoom: 2,
    tileSize: 256,
  },
  routing: {
    activeOriginId: "main", // Which #origins anchor in network.svg routes are precomputed from.
    fitPaddingPx: 80, // Screen-pixel padding when the map fits to a newly-activated route.
  },
  details: {
    // Kiosk screen size is fixed, so this is a plain constant rather than
    // something measured at runtime — tweak it here if the panel needs to
    // be wider/narrower. DetailsMapEffect uses the same value to recentre
    // the active pin in the space to the right of the panel.
    panelWidthPx: 720,
  },
} as const;
