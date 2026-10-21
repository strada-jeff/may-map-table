import { useCallback, useRef } from "react";
import { CONFIG } from "../config";
import { useMapControls } from "../hooks/MapControlsContext";
import { useMapGestures } from "../hooks/useMapGestures";
import { useDebugMode } from "../hooks/useDebugMode";
import { useLottieMotionPause } from "../hooks/lottiePlayback";
import { useMapMovingLayers } from "../hooks/useMapMovingLayers";
import ArtworkTiles from "./ArtworkTiles";
import DebugNetworkOverlay from "./DebugNetworkOverlay";
import { DebugCoordsMarkers, DebugCoordsPanel } from "./DebugCoords";
import DebugTapLog from "./DebugTapLog";
import DebugTouchSettings from "./DebugTouchSettings";
import DebugLottie from "./DebugLottie";
import DebugSwitcher from "./DebugSwitcher";
import DebugEntryButton from "./DebugEntryButton";
import DestinationMarkers from "./DestinationMarkers";
import LottieMarkers from "./LottieMarkers";
import RouteSvgLayer from "./RouteSvgLayer";
import FilterEffects from "./FilterEffects";
import DetailsMapEffect from "./DetailsMapEffect";
import InitialViewEffect from "./InitialViewEffect";
import ZoomWarmupEffect from "./ZoomWarmupEffect";
import ZoomSlider from "./ZoomSlider";

/**
 * The pannable/zoomable scene is one plain div sized exactly to the
 * artwork's native pixel dimensions — artwork, routes, and markers all
 * live as real children in that same coordinate space, so panning/zooming
 * (MapControls' one transform on the scene div, driven by useMapGestures
 * and the programmatic tweens) repositions everything for free. No per-frame recompute, no
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
  const controls = useMapControls();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  // Hands both elements to MapControls in the commit phase, before any
  // effect runs, so the opening view is in place for everything mounting.
  // On the wrapper, not the scene: React attaches child refs first, so by
  // now sceneRef is already set.
  const attachWrapper = useCallback(
    (el: HTMLDivElement | null) => {
      wrapperRef.current = el;
      controls.attach(el, sceneRef.current);
    },
    [controls],
  );
  useMapGestures(wrapperRef);
  const debug = useDebugMode();
  useLottieMotionPause();
  useMapMovingLayers(wrapperRef);

  return (
    <>
      <div
        ref={attachWrapper}
        className={`map-viewport relative z-40 h-full w-full touch-none select-none overflow-hidden bg-[#f2f0ee] ${debug.mode === "touch" ? "debug-hitboxes" : ""}`}
      >
        <div
          ref={sceneRef}
          className="map-scene absolute left-0 top-0 origin-top-left"
          style={{ width: CONFIG.map.width, height: CONFIG.map.height }}
        >
          <ArtworkTiles />
          {/* Scenery stands in for tile art, so it sits with the tiles: under the pins. */}
          <LottieMarkers />
          <DestinationMarkers />
          <svg
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            viewBox={`0 0 ${CONFIG.map.width} ${CONFIG.map.height}`}
          >
            <RouteSvgLayer />
            {debug.networkVisible && <DebugNetworkOverlay />}
            {debug.mode === "points" && <DebugCoordsMarkers />}
          </svg>
        </div>
      </div>
      <FilterEffects />
      <DetailsMapEffect />
      <InitialViewEffect />
      <ZoomWarmupEffect />
      <ZoomSlider rotated={rotated} />
      {debug.mode === "points" && <DebugCoordsPanel />}
      {debug.mode === "touch" && <DebugTapLog />}
      {debug.mode === "touch" && <DebugTouchSettings />}
      {debug.mode === "lottie" && <DebugLottie />}
      {debug.enabled && (
        <DebugSwitcher
          mode={debug.mode}
          onMode={debug.setMode}
          showNetwork={debug.showNetwork}
          onShowNetwork={debug.setShowNetwork}
          onExit={debug.exit}
        />
      )}
      {!debug.enabled && CONFIG.debug.showEntryButton && <DebugEntryButton onEnter={debug.enter} />}
    </>
  );
}

export default MapView;
