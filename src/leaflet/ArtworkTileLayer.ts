import L from "leaflet";
import { CONFIG } from "../config";

function rowsAtZoom(zoom: number): number {
  return Math.ceil((CONFIG.map.height * 2 ** zoom) / CONFIG.tiles.tileSize);
}

/**
 * Serves the raster tile pyramid tools/build-tiles.ts generates into
 * public/tiles, at {z}/{x}/{y}.png with (0,0) at the artwork's top-left.
 *
 * Leaflet's CRS.Simple puts latitude on the y axis increasing *upward* (see
 * MapSpace), so its own internal tile row numbering for this bounded map
 * runs negative, counting up from the artwork's bottom edge — the opposite
 * of the on-disk layout, which is just a plain top-down image slice. This
 * overrides getTileUrl to remap Leaflet's row into that on-disk numbering
 * rather than relying on Leaflet's built-in {-y} TMS flip, whose exact
 * offset depends on internals (_globalTileRange) not worth relying on here.
 */
export const ArtworkTileLayer = L.TileLayer.extend({
  getTileUrl(this: L.TileLayer, coords: L.Coords): string {
    const row = coords.y + rowsAtZoom(coords.z);
    return `/tiles/${coords.z}/${coords.x}/${row}.png`;
  },
}) as unknown as new (urlTemplate: string, options: L.TileLayerOptions) => L.TileLayer;
