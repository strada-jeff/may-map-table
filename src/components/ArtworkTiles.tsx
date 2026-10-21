import { useRef, useState } from "react";
import { useMapControls, useMapTransformEffect, type MapControls } from "../hooks/MapControlsContext";
import { CONFIG } from "../config";

const MAX_LEVEL = CONFIG.map.maxZoom;
// How far past a whole zoom step (in zoom steps) a level may be drawn
// enlarged before the next level up replaces it — so overshooting a step
// by a hair doesn't fetch a level with 4x the pixels for no visible gain.
const UPSCALE_TOLERANCE = 0.1;

/** A level and the block of its tiles mounted for the current viewport. */
type Layer = { level: number; minCol: number; maxCol: number; minRow: number; maxRow: number };

function clamp(n: number, max: number): number {
  return Math.min(max, Math.max(0, n));
}

/** Content (artwork) px covered by one of `level`'s tiles. */
function tileSize(level: number) {
  return { width: CONFIG.tiles.width / 2 ** level, height: CONFIG.tiles.height / 2 ** level };
}

/** The coarsest level that's still at least screen resolution at `scale`. */
function levelFor(scale: number): number {
  return clamp(Math.ceil(Math.log2(scale) - UPSCALE_TOLERANCE), MAX_LEVEL);
}

function layersEqual(a: Layer, b: Layer): boolean {
  return (
    a.level === b.level &&
    a.minCol === b.minCol &&
    a.maxCol === b.maxCol &&
    a.minRow === b.minRow &&
    a.maxRow === b.maxRow
  );
}

function readLayer(controls: MapControls, level: number): Layer | null {
  const wrapper = controls.wrapper;
  if (!wrapper) return null;
  const rect = wrapper.getBoundingClientRect();
  const topLeft = controls.clientToContent(rect.left, rect.top);
  const bottomRight = controls.clientToContent(rect.right, rect.bottom);
  const tile = tileSize(level);
  const lastCol = CONFIG.map.width / tile.width - 1;
  const lastRow = CONFIG.map.height / tile.height - 1;
  // Half a tile beyond the viewport, so a tile is already mounted before
  // its edge pans into view instead of popping in.
  const bufferX = tile.width / 2;
  const bufferY = tile.height / 2;

  return {
    level,
    minCol: clamp(Math.floor((topLeft.x - bufferX) / tile.width), lastCol),
    maxCol: clamp(Math.floor((bottomRight.x + bufferX) / tile.width), lastCol),
    minRow: clamp(Math.floor((topLeft.y - bufferY) / tile.height), lastRow),
    maxRow: clamp(Math.floor((bottomRight.y + bufferY) / tile.height), lastRow),
  };
}

function wholeLevel(level: number): Layer {
  const tile = tileSize(level);
  return {
    level,
    minCol: 0,
    maxCol: CONFIG.map.width / tile.width - 1,
    minRow: 0,
    maxRow: CONFIG.map.height / tile.height - 1,
  };
}

function tileKey(level: number, row: number, col: number) {
  return `${level}-${row}-${col}`;
}

// Level 0 is the whole map at screen resolution: 16 small tiles, ~33MB
// decoded. Always mounted underneath, so a sharper tile still loading shows
// the artwork slightly soft instead of a hole.
const BACKDROP = wholeLevel(0);

/**
 * The background artwork as a tile pyramid (see tools/build-artwork.ts):
 * level z is the artwork at CONFIG.map.width * 2^z px, cut into
 * CONFIG.tiles-sized tiles. Only the level matching the current zoom is
 * mounted, and only around the viewport, so the browser holds about a
 * screenful of roughly screen-resolution tiles at any zoom. That matters on
 * this kiosk's NUC: Iris Xe is integrated graphics sharing system RAM, and
 * the single full-resolution level this replaced held ~2GB decoded at every
 * zoomed-out view, shrinking it every frame.
 *
 * The level follows the zoom mid-gesture too: tiles are small enough to
 * decode off the main thread without stalling a pinch, and
 * useMapMovingLayers' mid-zoom repaints pick up the sharper ones. When the
 * level changes, the old level stays mounted underneath until the new
 * one's tiles have loaded.
 *
 * Each tile is a plain absolutely-positioned child of the shared
 * transformed div (see MapView), riding the same pan/zoom transform as
 * markers and routes — only which tiles are mounted changes.
 */
export default function ArtworkTiles() {
  const controls = useMapControls();
  const [layer, setLayer] = useState<Layer | null>(() =>
    readLayer(controls, levelFor(controls.state.scale)),
  );
  const [previous, setPrevious] = useState<Layer | null>(null);
  // Tracked outside React's render timing, so the comparison below is
  // always against what was last computed, not what's last painted —
  // avoids a re-render (and a full tile-list reconcile) on every transform
  // frame while the tile set hasn't actually changed.
  const layerRef = useRef(layer);
  // Tiles that have finished loading (or failed), to know when `previous`
  // is no longer needed under the current layer.
  const loaded = useRef(new Set<string>());

  useMapTransformEffect(({ scale }) => {
    const current = layerRef.current;
    const next = readLayer(controls, levelFor(scale));
    if (!next || (current && layersEqual(next, current))) return;
    if (current && current.level !== next.level) setPrevious(current);
    layerRef.current = next;
    setLayer(next);
  });

  const onTileDone = (key: string) => {
    loaded.current.add(key);
    const current = layerRef.current;
    if (current && forEachTile(current, (k) => loaded.current.has(k)).every(Boolean)) {
      setPrevious(null);
    }
  };

  const renderLayer = (l: Layer) =>
    forEachTile(l, (key, row, col) => {
      const tile = tileSize(l.level);
      return (
        <img
          key={key}
          src={`/artwork-tiles/${l.level}/${row}-${col}.webp`}
          alt=""
          draggable={false}
          decoding="async"
          className={`artwork-tile artwork-tile-level-${l.level} absolute select-none`}
          style={{ left: col * tile.width, top: row * tile.height, width: tile.width, height: tile.height }}
          onLoad={() => onTileDone(key)}
          onError={() => onTileDone(key)}
        />
      );
    });

  return (
    <>
      {renderLayer(BACKDROP)}
      {previous && previous.level !== 0 && previous.level !== layer?.level && renderLayer(previous)}
      {layer && layer.level !== 0 && renderLayer(layer)}
    </>
  );
}

function forEachTile<T>(l: Layer, fn: (key: string, row: number, col: number) => T): T[] {
  const out: T[] = [];
  for (let row = l.minRow; row <= l.maxRow; row++) {
    for (let col = l.minCol; col <= l.maxCol; col++) out.push(fn(tileKey(l.level, row, col), row, col));
  }
  return out;
}
