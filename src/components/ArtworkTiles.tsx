import { useRef, useState } from "react";
import { useControls, useTransformEffect, type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { CONFIG } from "../config";

// Must match tools/build-artwork.ts's GRID_SIZE.
const GRID_SIZE = 4;
const CELL_WIDTH = CONFIG.map.width / GRID_SIZE;
const CELL_HEIGHT = CONFIG.map.height / GRID_SIZE;
// Content-space margin loaded beyond the visible viewport, so a tile is
// already mounted before its edge pans into view instead of popping in.
const BUFFER_PX = CELL_WIDTH / 2;

type VisibleRange = { minCol: number; maxCol: number; minRow: number; maxRow: number };

function clamp(n: number, max: number): number {
  return Math.min(max, Math.max(0, n));
}

function rangesEqual(a: VisibleRange, b: VisibleRange): boolean {
  return a.minCol === b.minCol && a.maxCol === b.maxCol && a.minRow === b.minRow && a.maxRow === b.maxRow;
}

function readVisibleRange(controls: ReactZoomPanPinchContentRef): VisibleRange | null {
  const wrapper = controls.instance.wrapperComponent;
  if (!wrapper) return null;
  const rect = wrapper.getBoundingClientRect();
  const topLeft = controls.clientToContent(rect.left, rect.top);
  const bottomRight = controls.clientToContent(rect.right, rect.bottom);

  return {
    minCol: clamp(Math.floor((topLeft.x - BUFFER_PX) / CELL_WIDTH), GRID_SIZE - 1),
    maxCol: clamp(Math.floor((bottomRight.x + BUFFER_PX) / CELL_WIDTH), GRID_SIZE - 1),
    minRow: clamp(Math.floor((topLeft.y - BUFFER_PX) / CELL_HEIGHT), GRID_SIZE - 1),
    maxRow: clamp(Math.floor((bottomRight.y + BUFFER_PX) / CELL_HEIGHT), GRID_SIZE - 1),
  };
}

/**
 * The background artwork as a GRID_SIZE x GRID_SIZE grid of tiles (see
 * tools/build-artwork.ts) instead of one 15360x8640 image — only the tiles
 * intersecting the current viewport (+ a half-cell buffer) are ever
 * mounted, so the browser never decodes/holds more than a handful of
 * 3840x2160 bitmaps at once instead of the full ~500MB master image. That
 * matters on this kiosk's NUC specifically: Iris Xe is integrated graphics
 * sharing system RAM, no dedicated VRAM to absorb an always-resident
 * texture that size.
 *
 * Each tile is still a plain absolutely-positioned child of the shared
 * transformed div (see MapView), riding the same pan/zoom transform as
 * markers and routes — no per-frame position recompute needed, only which
 * tiles are mounted changes, driven by react-zoom-pan-pinch's own
 * useTransformEffect (same pattern CompassControl uses for its minimap).
 */
export default function ArtworkTiles() {
  const controls = useControls();
  const [range, setRange] = useState<VisibleRange | null>(() => readVisibleRange(controls));
  // Tracks the last range independently of React's render timing, so the
  // comparison below is always against what was last computed, not what's
  // last painted — avoids a re-render (and a full tile-list reconcile) on
  // every transform frame during a gesture when the tile set hasn't
  // actually changed, e.g. panning within the same tile neighborhood.
  const lastRangeRef = useRef(range);

  useTransformEffect(() => {
    const next = readVisibleRange(controls);
    const last = lastRangeRef.current;
    if (next && last && rangesEqual(next, last)) return;
    lastRangeRef.current = next;
    setRange(next);
  });

  if (!range) return null;

  const tiles = [];
  for (let row = range.minRow; row <= range.maxRow; row++) {
    for (let col = range.minCol; col <= range.maxCol; col++) {
      tiles.push(
        <img
          key={`${row}-${col}`}
          src={`/artwork-tiles/${row}-${col}.webp`}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute select-none"
          style={{ left: col * CELL_WIDTH, top: row * CELL_HEIGHT, width: CELL_WIDTH, height: CELL_HEIGHT }}
        />,
      );
    }
  }

  return <>{tiles}</>;
}
