export const CONFIG = {
  welcomeScreen: {
    idleTimeoutMs: 90_000, // how long the app can sit idle before the welcome overlay reappears
  },
  map: {
    width: 3840, // pixel dimension of base artwork
    height: 2160,
  },
  routing: {
    activeOriginId: "main", // Which #origins anchor in network.svg routes are precomputed from.
    fitPaddingPx: 80, // Screen-pixel padding when the map fits to a newly-activated route.
  },
} as const;
