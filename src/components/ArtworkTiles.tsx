import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { CONFIG } from "../config";
import type { MapSpace } from "../routing";
import { ArtworkTileLayer } from "../leaflet/ArtworkTileLayer";

/** Lives inside <MapContainer> so it can reach Leaflet's map instance. */
export default function ArtworkTiles({ space }: { space: MapSpace }) {
  const map = useMap();

  useEffect(() => {
    const layer = new ArtworkTileLayer("", {
      tileSize: CONFIG.tiles.tileSize,
      minZoom: CONFIG.tiles.minZoom,
      maxZoom: CONFIG.tiles.maxZoom,
      bounds: space.latLngBounds,
      noWrap: true,
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, space]);

  return null;
}
