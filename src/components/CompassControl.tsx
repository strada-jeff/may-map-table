import { useEffect, useState } from "react";
import type L from "leaflet";
import { CONFIG } from "../config";
import { space } from "../mapSpace";
import { useMapInstance } from "../hooks/MapInstanceContext";
import compassPoints from "../assets/icons/compass-points.svg";
import youAreHereIcon from "../assets/icons/compass-you-are-here.svg";

const SIZE_PX = 200;
const DOT_PX = 22;

type View = {
  rectLeft: number;
  rectTop: number;
  rectWidth: number;
  rectHeight: number;
  centerX: number;
  centerY: number;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// overview.jpg is displayed with object-cover in a square frame, but it's
// the artwork's own (wider) aspect ratio — cover crops its left/right edges
// to fill the square, so the frame's visible 0-100% isn't the artwork's
// full 0-100%. This is the one-axis crop window that maps between them,
// assuming overview.jpg keeps the artwork's aspect ratio (see CompassControl).
const FRAME_ASPECT = 1; // compass-control-frame is always SIZE_PX x SIZE_PX
const IMAGE_ASPECT = CONFIG.map.width / CONFIG.map.height;
const CROP =
  IMAGE_ASPECT > FRAME_ASPECT
    ? { xOffset: (1 - FRAME_ASPECT / IMAGE_ASPECT) / 2, xVisible: FRAME_ASPECT / IMAGE_ASPECT, yOffset: 0, yVisible: 1 }
    : { xOffset: 0, xVisible: 1, yOffset: (1 - IMAGE_ASPECT / FRAME_ASPECT) / 2, yVisible: IMAGE_ASPECT / FRAME_ASPECT };

/** Artwork-fraction (0-1) -> percent position within the cropped frame. */
function toFramePercent(fraction: number, offset: number, visible: number): number {
  return ((fraction - offset) / visible) * 100;
}

/** Main map's current viewport/center, as fractions (0-1) of the full artwork. */
function readView(mainMap: L.Map): View {
  const bounds = mainMap.getBounds();
  const [minX, minY] = space.fromLatLng(bounds.getNorthWest());
  const [maxX, maxY] = space.fromLatLng(bounds.getSouthEast());
  const [centerX, centerY] = space.fromLatLng(mainMap.getCenter());
  const { width, height } = CONFIG.map;

  return {
    rectLeft: clamp01(minX / width),
    rectTop: clamp01(minY / height),
    rectWidth: clamp01((maxX - minX) / width),
    rectHeight: clamp01((maxY - minY) / height),
    centerX: clamp01(centerX / width),
    centerY: clamp01(centerY / height),
  };
}

/**
 * A static overview image (public/overview.jpg — a small, manually-exported
 * version of the artwork; NOT the full-resolution base.jpg, which was
 * decoding/compositing a 132-megapixel image on every pan of the main map)
 * plus a live rectangle + dot, positioned by plain percentage math rather
 * than a second Leaflet map. The raster tile pyramid's lowest zoom is still
 * much bigger than this circle, so getting a real Leaflet instance to show
 * the *whole* artwork here would mean CSS-scaling the whole map down —
 * which shrinks every marker/stroke back to invisible along with it.
 */
export default function CompassControl() {
  const { map: mainMap } = useMapInstance();
  const [view, setView] = useState<View | null>(() => (mainMap ? readView(mainMap) : null));

  useEffect(() => {
    if (!mainMap) return;
    // "move" fires on every animation frame of a drag/flyTo — rAF-coalesce
    // so a fast drag can't queue more state updates than the browser can
    // paint.
    let rafId = 0;
    const update = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setView(readView(mainMap)));
    };
    update();
    mainMap.on("move zoom", update);
    return () => {
      cancelAnimationFrame(rafId);
      mainMap.off("move zoom", update);
    };
  }, [mainMap]);

  return (
    <div className="compass-control pointer-events-none absolute right-18 top-18 z-40">
      <img
        src={compassPoints}
        alt=""
        className="compass-control-points pointer-events-none absolute -left-10 -top-10 size-24"
      />
      <div
        className="compass-control-frame relative overflow-hidden rounded-full border-[6px] border-white bg-[#f1f0ee] shadow-[0_4px_10px_0_rgba(0,0,0,0.2)]"
        style={{ width: SIZE_PX, height: SIZE_PX }}
      >
        <img
          src="/overview.jpg"
          alt=""
          className="compass-control-overview absolute inset-0 size-full object-cover"
        />

        {view && (
          <>
            <div
              className="compass-control-viewport pointer-events-none absolute border-2 border-mayfair-navy/70 bg-mayfair-navy/10"
              style={{
                left: `${toFramePercent(view.rectLeft, CROP.xOffset, CROP.xVisible)}%`,
                top: `${toFramePercent(view.rectTop, CROP.yOffset, CROP.yVisible)}%`,
                width: `${(view.rectWidth / CROP.xVisible) * 100}%`,
                height: `${(view.rectHeight / CROP.yVisible) * 100}%`,
              }}
            />
            <img
              src={youAreHereIcon}
              alt=""
              className="compass-control-dot pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${toFramePercent(view.centerX, CROP.xOffset, CROP.xVisible)}%`,
                top: `${toFramePercent(view.centerY, CROP.yOffset, CROP.yVisible)}%`,
                width: DOT_PX,
                height: DOT_PX,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
