import { useState } from "react";
import { useControls, useTransformEffect, type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { CONFIG } from "../config";
import compassPoints from "../assets/icons/compass-points.svg";
import youAreHereIcon from "../assets/icons/compass-you-are-here.svg";

const SIZE_PX = 400;
// compass-you-are-here.svg is 66px: the 46px dot plus its drop-shadow
// margin, with the dot's centre at (33, 29) rather than the file's centre.
const DOT_FILE_PX = 66;
const DOT_CENTER_X = 33;
const DOT_CENTER_Y = 29;

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

function readView(controls: ReactZoomPanPinchContentRef): View | null {
  const wrapper = controls.instance.wrapperComponent;
  if (!wrapper) return null;
  const rect = wrapper.getBoundingClientRect();
  const topLeft = controls.clientToContent(rect.left, rect.top);
  const bottomRight = controls.clientToContent(rect.right, rect.bottom);
  const center = controls.clientToContent(rect.left + rect.width / 2, rect.top + rect.height / 2);
  const { width, height } = CONFIG.map;

  return {
    rectLeft: clamp01(topLeft.x / width),
    rectTop: clamp01(topLeft.y / height),
    rectWidth: clamp01((bottomRight.x - topLeft.x) / width),
    rectHeight: clamp01((bottomRight.y - topLeft.y) / height),
    centerX: clamp01(center.x / width),
    centerY: clamp01(center.y / height),
  };
}

/**
 * A static overview image (public/overview.jpg — a small, manually-exported
 * version of the artwork) plus a live rectangle + dot, positioned by plain
 * percentage math rather than a second map instance — this never needed
 * Leaflet's own mapping features to begin with, just its current
 * viewport/center, which react-zoom-pan-pinch exposes just as directly.
 */
export default function CompassControl() {
  const controls = useControls();
  // Read once synchronously at first render (App.tsx's onInit already set
  // the real transform by the time this mounts) rather than starting at
  // null and waiting for the first onChange, which wouldn't fire until the
  // user's first pan/zoom.
  const [view, setView] = useState<View | null>(() => readView(controls));

  useTransformEffect(() => setView(readView(controls)));

  return (
    <div className="compass-control pointer-events-none absolute right-[82px] top-[78px] z-40">
      <img
        src={compassPoints}
        alt=""
        className="compass-control-points pointer-events-none absolute left-[-73px] top-[-70px] size-[231px]"
      />
      <div
        className="compass-control-frame relative overflow-hidden rounded-full border-[9px] border-white bg-[#f1f0ee] shadow-[0_4px_10px_0_rgba(0,0,0,0.2)]"
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
              className="compass-control-viewport pointer-events-none absolute border-4 border-mayfair-navy/70 bg-mayfair-navy/10"
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
              className="compass-control-dot pointer-events-none absolute max-w-none"
              style={{
                left: `${toFramePercent(view.centerX, CROP.xOffset, CROP.xVisible)}%`,
                top: `${toFramePercent(view.centerY, CROP.yOffset, CROP.yVisible)}%`,
                width: DOT_FILE_PX,
                height: DOT_FILE_PX,
                transform: `translate(${-DOT_CENTER_X}px, ${-DOT_CENTER_Y}px)`,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
