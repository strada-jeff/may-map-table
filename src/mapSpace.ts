import { CONFIG } from "./config";
import { MapSpace } from "./routing";

/**
 * The one MapSpace for the whole app, built from CONFIG.map's artwork
 * pixel bounds. Shared so the main map (MapView) and the minimap
 * (CompassControl) — two separate Leaflet instances — agree on the exact
 * same coordinate conversion.
 */
export const space = new MapSpace([
  [0, 0],
  [CONFIG.map.width, CONFIG.map.height],
]);
