import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import lottie from "lottie-web";
import type { MapSpace } from "../routing";
import { LOTTIE_ANIMATIONS } from "../data/lottie";
import type { LottieMarkerConfig } from "../types/lottie";

/**
 * Lives inside <MapContainer> so it can reach Leaflet's map instance.
 * Drawn as an L.svgOverlay rather than a Marker/divIcon (see
 * LocationMarker/ModelHomeMarker) — an overlay's bounds are in map space,
 * so Leaflet resizes and repositions its element on every zoom/pan the
 * same way it does the artwork tiles, no manual recompute needed. A
 * divIcon's iconSize is fixed CSS pixels and would stay the same size
 * regardless of zoom, which is exactly what these shouldn't do.
 *
 * The outer <svg>'s viewBox matches the animation's own native w/h so the
 * nested <svg> lottie-web creates inside it (via container.appendChild)
 * lines up 1:1 — the outer element is what Leaflet actually stretches to
 * the overlay's real on-screen size.
 */
export default function LottieMarker({ space, marker }: { space: MapSpace; marker: LottieMarkerConfig }) {
  const map = useMap();

  useEffect(() => {
    const animationData = LOTTIE_ANIMATIONS[marker.file];
    const half = marker.size / 2;
    const [x, y] = marker.position;
    const bounds = L.latLngBounds(
      space.toLatLng([x - half, y - half]),
      space.toLatLng([x + half, y + half]),
    );

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${animationData.w} ${animationData.h}`);

    const overlay = L.svgOverlay(svg, bounds, { interactive: false });
    overlay.addTo(map);

    const animation = lottie.loadAnimation({
      container: svg,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData,
    });

    return () => {
      animation.destroy();
      overlay.remove();
    };
  }, [map, space, marker]);

  return null;
}
