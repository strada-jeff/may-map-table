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
    fitPaddingPx: 200, // Screen-pixel padding when the map fits to a newly-activated route.
    // Where each origin's "you are here" badge is drawn — independent of
    // that #origins anchor itself, which network.svg pins onto the road
    // network for snapping/routing and shouldn't be nudged just to make the
    // badge look right. Keyed by origin id (which network the active route
    // came from — see RouteContext/RouteLine); an origin absent here just
    // uses its own anchor point. Override with a point only if the badge
    // needs to sit somewhere visually different (e.g. centered on the
    // "home" artwork) than where that origin's routes actually start.
    youAreHereBadgePoints: {} as Record<string, string | readonly [number, number]>,
  },
  details: {
    panelWidthPx: 2160, // Figma Info_card_overlay; kiosk screen is fixed, so this is a constant, not measured
  },
  help: {
    // TODO: replace with the real help copy (Figma help_alt is still lorem ipsum).
    heading: "Inmensae subtilitatis, obscuris et malesuada.",
    body: "Pellentesque habitant morbi tristique senectus et netus. Quo usque tandem abutere, Catilina, patientia nostra? Paullum deliquit, ponderibus modulisque suis ratio utitur. Praeterea iter est quasdam res quas ex communi.",
  },
  signup: {
    heading: "Sign up to receive Mayfair news, event invitations, and more",
    // TODO: replace with the real sign-up destination.
    qrValue: "https://mayfairtx.com/",
  },
} as const;
