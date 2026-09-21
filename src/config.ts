export const CONFIG = {
  welcomeScreen: {
    idleTimeoutMs: 90_000, // how long the app can sit idle before the welcome overlay reappears
  },
  map: {
    width: 3840, // pixel dimension of base artwork
    height: 2160,
    minZoom: -1, // furthest the map controls can zoom out; build:tiles matches this
    maxZoom: 2, // furthest the map controls can zoom in; build:tiles matches this
    initialCenter: "main" as string | readonly [number, number], // anchor id or [x, y] point
    initialZoom: 1.4, // zoom once the welcome screen is dismissed
    idleZoomOffset: 1, // idle view is initialZoom minus this, zoomed further out
    pinDetailZoomLevel: 2, // zoom the map flies to when a pin's details open
  },
  tiles: {
    tileSize: 256,
  },
  routing: {
    activeOriginId: "main", // Which #origins anchor in network.svg routes are precomputed from.
    fitPaddingPx: 200, // Screen-pixel padding when the map fits to a newly-activated route.
    // Where the "you are here" badge is drawn — independent of
    // activeOriginId's #origins anchor, which network.svg pins onto the
    // road network for snapping/routing and shouldn't be nudged just to
    // make the badge look right. Anchor id or a raw [x, y] map-space point;
    // defaults to the same anchor, override with a point if the badge
    // needs to sit somewhere visually different (e.g. centered on the
    // "home" artwork) than where routes actually originate.
    youAreHereBadgePoint: "main" as string | readonly [number, number],
  },
  details: {
    panelWidthPx: 720, // kiosk screen is fixed, so this is a constant, not measured
  },
  signup: {
    heading: "Sign up to receive Mayfair news, event invitations, and more",
    // TODO: replace with the real sign-up destination.
    qrValue: "https://example.com/signup",
  },
} as const;
