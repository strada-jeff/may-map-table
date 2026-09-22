import { TransformComponent } from "react-zoom-pan-pinch";
import { CONFIG } from "../config";
import ArtworkTiles from "./ArtworkTiles";
import DebugNetworkOverlay from "./DebugNetworkOverlay";
import DestinationMarkers from "./DestinationMarkers";
import LottieMarkers from "./LottieMarkers";
import RouteSvgLayer from "./RouteSvgLayer";
import FilterEffects from "./FilterEffects";
import DetailsMapEffect from "./DetailsMapEffect";
import InitialViewEffect from "./InitialViewEffect";
import ZoomWarmupEffect from "./ZoomWarmupEffect";
import ZoomSlider from "./ZoomSlider";

const isDebug = new URLSearchParams(window.location.search).get("debug") === "1";

/**
 * The pannable/zoomable scene is one plain div sized exactly to the
 * artwork's native pixel dimensions — artwork, routes, and markers all
 * live as real children in that same coordinate space, so panning/zooming
 * (react-zoom-pan-pinch's shared transform on the wrapping div, see
 * App.tsx) repositions everything for free. No per-frame recompute, no
 * tile pyramid, no map-unit-to-screen-pixel conversion layer.
 *
 * Route/debug content is real SVG (masks, filters, dash-draw-in animation
 * need it); destination/Lottie markers are plain positioned HTML, since
 * that's what they already were as react-leaflet divIcons/markers.
 *
 * Markers render *before* the route SVG in DOM order on purpose: with no
 * explicit z-index on the markers, plain stacking order puts the dim
 * overlay/route/badge above every pin while directions are active — the
 * active pin re-asserts itself above that via its own z-index (see
 * LocationMarker/ModelHomeMarker's `active` prop) rather than a second,
 * disposable marker.
 */
function MapView({ rotated }: { rotated: boolean }) {
  return (
    <>
      <TransformComponent
        wrapperClass="!h-full !w-full !bg-[#f2f0ee] !z-40"
        contentStyle={{ width: CONFIG.map.width, height: CONFIG.map.height }}
      >
        <div className="relative" style={{ width: CONFIG.map.width, height: CONFIG.map.height }}>
          <ArtworkTiles />
          <DestinationMarkers />
          <LottieMarkers />
          <svg
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            viewBox={`0 0 ${CONFIG.map.width} ${CONFIG.map.height}`}
          >
            <RouteSvgLayer />
            {isDebug && <DebugNetworkOverlay />}
          </svg>
        </div>
      </TransformComponent>
      <FilterEffects />
      <DetailsMapEffect />
      <InitialViewEffect />
      <ZoomWarmupEffect />
      <ZoomSlider rotated={rotated} />
    </>
  );
}

export default MapView;
