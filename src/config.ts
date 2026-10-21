export const CONFIG = {
  welcomeScreen: {
    idleTimeoutMs: 200_000, // how long the app can sit idle before the welcome overlay reappears
  },
  map: {
    width: 3840, // pixel dimension of base artwork
    height: 2160,
    minZoom: 0, // furthest the map controls can zoom out; 0 = the 3840px artwork exactly fills the 4K viewport
    maxZoom: 3, // furthest the map controls can zoom in; build:tiles matches this
    initialCenter: "main" as string | readonly [number, number], // anchor id or [x, y] point
    initialZoom: 1.4, // zoom once the welcome screen is dismissed; Figma's 4K comps draw the map at ~1.43 (scale ~2.69)
    idleZoomOffset: 1, // idle view is initialZoom minus this, zoomed further out
    pinDetailZoomLevel: 2, // zoom the map flies to when a pin's details open
    resharpenZoomRatio: 1.25, // while zooming in, the moving map is repainted sharp each time it grows by this factor (lower = sharper, more repaints mid-pinch). See useMapMovingLayers
  },
  // Tuned on the IR touch frame in ~/Sandbox/touch-poc (2026-09-24). All px
  // are screen px. See useMapGestures and usePinClick.
  touch: {
    panThresholdPx: 30, // finger travel before a one-finger drag pans the map, so tap jitter never moves it
    inertiaStrength: 0.1, // multiplier on release velocity for the glide after a flick; 0 disables
    pinch: {
      deadZonePx: 30, // fingers' spread must change this much before zoom starts
      smoothingMs: 20, // half-life: time for the map to close half the gap to the fingers. 0 = raw IR positions, higher = steadier but laggier
    },
    drawerSwipe: {
      thresholdPx: 30, // horizontal travel before a drag on the drawer starts moving it (vertical travel scrolls its list instead)
      flickVelocity: 0.5, // px/ms at release above which the drawer goes the flick's way, wherever it was let go
    },
    pinTap: {
      maxMovePx: 20, // finger travel beyond which a contact on a pin isn't a tap
      minContactMs: 50, // shorter contacts are IR ghost points
      mapDriftSlackPx: 20, // tap rejected only if the map moved more than the finger did, plus this (i.e. a pinch moved it)
      maxScaleChange: 0.06, // tap rejected if zoom changed more than this ratio during it
    },
  },
  // Background artwork pyramid (tools/build-artwork.ts, ArtworkTiles): one
  // level per whole zoom step, 0..map.maxZoom, level z being the artwork at
  // map.width * 2^z px. Every level is cut into tiles of this size, in that
  // level's own pixels, so must divide map.width x map.height evenly.
  tiles: {
    width: 960,
    height: 540,
  },
  routing: {
    fitPaddingPx: 400, // Screen-pixel padding when the map fits to a newly-activated route (doubled for the 4K canvas).
    // Where each origin's "you are here" badge is drawn — independent of
    // that #origins anchor itself, which network.svg pins onto the road
    // network for snapping/routing and shouldn't be nudged just to make the
    // badge look right. Keyed by origin id (which network the active route
    // came from — see RouteContext/RouteLine); an origin absent here just
    // uses its own anchor point. Override with a point only if the badge
    // needs to sit somewhere visually different (e.g. centered on the
    // "home" artwork) than where that origin's routes actually start.
    youAreHereBadgePoints: {} as Record<
      string,
      string | readonly [number, number]
    >,
  },
  details: {
    panelWidthPx: 1728, // Figma Info_card_overlay's 2160 narrowed 20%; kiosk screen is fixed, so this is a constant, not measured
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
  debug: {
    // Temporary, for development on the table: a "Debug" button in the
    // top-right corner, since the kiosk has no address bar for ?debug=1.
    // Turn off before handover; ?debug=1 still works without it.
    showEntryButton: true,
  },
} as const;
