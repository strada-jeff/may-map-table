import { useEffect, useState, useSyncExternalStore } from "react";
import { useMapControls } from "../hooks/MapControlsContext";
import type { Point } from "../routing/types";
import { useTap } from "../hooks/useTap";

const MAX_TAPS = 8;
/** Finger travel (screen px) beyond which a contact was a pan, not a tap. */
const TAP_MOVE_PX = 12;

// Shared between the panel (outside the transformed scene, so it can listen
// on the wrapper and stay screen-fixed) and the markers (inside the scene's
// SVG, so they sit on the artwork). Debug-only, so a module-level store
// beats threading a context through MapView.
let taps: Point[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setTaps = (next: Point[]) => {
  taps = next;
  for (const listener of listeners) listener();
};
const useTaps = () => useSyncExternalStore(subscribe, () => taps);

const round = ([x, y]: Point): Point => [Math.round(x), Math.round(y)];
const formatPoint = ([x, y]: Point) => `${x}, ${y}`;

function copy(text: string) {
  console.log(`[debug-coords] ${text}`);
  // Clipboard needs a secure context — absent when the kiosk loads the dev
  // server over plain http on the LAN, so the console log is the fallback.
  navigator.clipboard?.writeText(text).catch(() => {});
}

/**
 * `?debug=points` tap-to-read coordinates, in artwork-pixel space (the same
 * y-down space as network.svg's anchors, CONFIG points and iconOffset).
 * Listens in the capture phase so a tap on a pin still reports. Rotation
 * needs no handling here: useRotatedInputCorrection has already mirrored
 * clientX/Y by the time these listeners see the event.
 */
export function DebugCoordsPanel() {
  const controls = useMapControls();
  const list = useTaps();
  const [hover, setHover] = useState<Point | null>(null);
  const clearTap = useTap(() => setTaps([]));

  useEffect(() => {
    const wrapper = controls.wrapper;
    if (!wrapper) return;
    const downs = new Map<number, { x: number; y: number }>();
    const toContent = (e: PointerEvent): Point => {
      const p = controls.clientToContent(e.clientX, e.clientY);
      return round([p.x, p.y]);
    };

    const onDown = (e: PointerEvent) => downs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      const down = downs.get(e.pointerId);
      downs.delete(e.pointerId);
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_MOVE_PX) return;
      const point = toContent(e);
      copy(`[${formatPoint(point)}]`);
      setTaps([point, ...taps].slice(0, MAX_TAPS));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") setHover(toContent(e));
    };
    const onCancel = (e: PointerEvent) => downs.delete(e.pointerId);

    wrapper.addEventListener("pointerdown", onDown, { capture: true });
    wrapper.addEventListener("pointerup", onUp, { capture: true });
    wrapper.addEventListener("pointercancel", onCancel, { capture: true });
    wrapper.addEventListener("pointermove", onMove, { capture: true });
    return () => {
      wrapper.removeEventListener("pointerdown", onDown, { capture: true });
      wrapper.removeEventListener("pointerup", onUp, { capture: true });
      wrapper.removeEventListener("pointercancel", onCancel, { capture: true });
      wrapper.removeEventListener("pointermove", onMove, { capture: true });
    };
  }, [controls]);

  return (
    <div className="debug-coords-panel pointer-events-auto absolute bottom-12 left-12 z-[100] rounded-3xl bg-black/80 px-10 py-8 font-mono text-[36px] leading-tight text-white">
      <div className="debug-coords-header flex items-center gap-10">
        <span className="debug-coords-title font-bold">Tap map for x, y</span>
        {hover && <span className="debug-coords-hover text-white/60">{formatPoint(hover)}</span>}
        <button
          type="button"
          className="debug-coords-clear rounded-xl bg-white/20 px-6 py-2"
          {...clearTap}
        >
          Clear
        </button>
      </div>
      {list.length > 0 && (
        <ol className="debug-coords-list mt-4">
          {list.map((point, i) => (
            <li
              key={`${point[0]}-${point[1]}-${list.length - i}`}
              className={`debug-coords-item ${i === 0 ? "text-[#FACC15]" : "text-white/70"}`}
              onPointerUp={() => copy(`[${formatPoint(point)}]`)}
            >
              {formatPoint(point)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Crosshairs at the recorded taps, drawn in the scene's shared SVG (see MapView). */
export function DebugCoordsMarkers() {
  const list = useTaps();
  return (
    <>
      {list.map(([x, y], i) => (
        <g
          key={`${x}-${y}-${list.length - i}`}
          className="debug-coords-marker"
          stroke={i === 0 ? "#FACC15" : "#111827"}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        >
          <line className="debug-coords-marker-h" x1={x - 16} y1={y} x2={x + 16} y2={y} vectorEffect="non-scaling-stroke" />
          <line className="debug-coords-marker-v" x1={x} y1={y - 16} x2={x} y2={y + 16} vectorEffect="non-scaling-stroke" />
          <circle className="debug-coords-marker-dot" cx={x} cy={y} r={5} fill="none" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </>
  );
}
