import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useMapControls, useMapTransformEffect, type MapControls } from "../hooks/MapControlsContext";
import { CONFIG } from "../config";
import { centeredTransform, clampTransform, tweenTransform } from "../hooks/mapTransform";
import type { Point } from "../routing/types";
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

// Finger travel (in the frame's own px) before a contact is a drag of the
// view, not a tap to jump there.
const DRAG_THRESHOLD_PX = 10;

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

function readView(controls: MapControls): View | null {
  const wrapper = controls.wrapper;
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

/** A point in the frame's padding box (its own, unrotated px) -> artwork px. */
function frameToContent(frame: HTMLElement, x: number, y: number): Point {
  return [
    (CROP.xOffset + (x / frame.clientWidth) * CROP.xVisible) * CONFIG.map.width,
    (CROP.yOffset + (y / frame.clientHeight) * CROP.yVisible) * CONFIG.map.height,
  ];
}

type Drag = { pointerId: number; startX: number; startY: number; startCenter: Point; moved: boolean };

/**
 * A static overview image (public/overview.jpg — a small render of base.svg,
 * from build:overview) plus a live rectangle + dot, positioned by plain
 * percentage math rather than a second map instance — this never needed
 * Leaflet's own mapping features to begin with, just its current
 * viewport/center, which MapControls exposes just as directly.
 *
 * Also a way to move the map: dragging on it moves the view by as much as
 * the finger moved (grab the dot and it follows), and a tap jumps the view
 * to that spot. The map outside the view is dimmed, more so while
 * dragging. Positions come from the events' offsetX/Y, which the browser
 * resolves through every transform — so they're in the frame's own
 * coordinates even when the app is rotated (useRotatedInputCorrection only
 * rewrites clientX/Y).
 */
export default function CompassControl() {
  const controls = useMapControls();
  // useMapTransformEffect also runs once on mount (before paint), so this
  // never waits for the user's first pan/zoom to show the viewport box.
  const [view, setView] = useState<View | null>(null);

  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<Drag | null>(null);

  useMapTransformEffect(() => setView(readView(controls)));

  // Centers the map on `point` at its current zoom, clamped like a pan.
  function targetFor(point: Point) {
    const wrapper = controls.wrapper;
    if (!wrapper) return null;
    const { width, height } = wrapper.getBoundingClientRect();
    return clampTransform(
      centeredTransform({ width, height }, point, controls.state.scale),
      { width, height },
      controls.state,
    );
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // One finger at a time; others landing mid-drag are ignored.
    if (dragRef.current) return;
    const wrapper = controls.wrapper;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const center = controls.clientToContent(rect.left + rect.width / 2, rect.top + rect.height / 2);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.nativeEvent.offsetX,
      startY: e.nativeEvent.offsetY,
      startCenter: [center.x, center.y],
      moved: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // An IR ghost point already gone; the drag just won't be captured.
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.nativeEvent.offsetX - d.startX;
    const dy = e.nativeEvent.offsetY - d.startY;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      setDragging(true);
    }
    const frame = e.currentTarget;
    const [x0, y0] = frameToContent(frame, 0, 0);
    const [x1, y1] = frameToContent(frame, dx, dy);
    const target = targetFor([d.startCenter[0] + x1 - x0, d.startCenter[1] + y1 - y0]);
    if (target) controls.setTransform(target);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (d.moved) return;
    const target = targetFor(frameToContent(e.currentTarget, e.nativeEvent.offsetX, e.nativeEvent.offsetY));
    if (target) tweenTransform(controls, target, { duration: 0.6 });
  }

  function handlePointerCancel(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div className="compass-control pointer-events-none absolute bottom-[67px] right-[82px] z-40">
      <img
        src={compassPoints}
        alt=""
        className="compass-control-points pointer-events-none absolute left-[-71px] top-[-68px] size-[231.4px]"
      />
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="compass-control-frame pointer-events-auto relative cursor-pointer overflow-hidden rounded-full border-[16px] border-mayfair-navy bg-[#f1f0ee]"
        style={{ width: SIZE_PX, height: SIZE_PX }}
      >
        {/* Nothing inside takes pointer events, so offsetX/Y are always
            relative to the frame itself. */}
        <img
          src="/overview.jpg"
          alt=""
          className="compass-control-overview pointer-events-none absolute inset-0 size-full object-cover"
        />

        {view && (
          <>
            {/* The dim is the rectangle's own spread shadow, filling the
                frame around it (the frame's overflow clips it to the circle). */}
            <div
              className={`compass-control-viewport pointer-events-none absolute border-4 border-mayfair-navy/70 transition-shadow duration-200 ${
                dragging ? "shadow-[0_0_0_400px_rgba(37,74,93,0.45)]" : "shadow-[0_0_0_400px_rgba(37,74,93,0.2)]"
              }`}
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
