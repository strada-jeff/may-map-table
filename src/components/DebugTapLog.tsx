import { useEffect, useRef, useState } from "react";
import { useDetails } from "../hooks/DetailsContext";
import { useMapControls } from "../hooks/MapControlsContext";
import type { Transform } from "../hooks/mapTransform";
import { useTouchSettings } from "../hooks/touchSettings";
import { onGesture, type GestureEntry } from "../hooks/gestureLog";

const MAX_ROWS = 18;
/** How long after a pointerup to check whether the pin's details opened. */
const OPEN_CHECK_MS = 80;

type Verdict = "tap" | "too-short" | "moved" | "zoomed" | "map-drift" | "cancelled";

type ContactRow = {
  kind: "contact";
  seq: number;
  target: string;
  pointerType: string;
  durationMs: number;
  travelPx: number;
  driftPx: number;
  scaleChange: number;
  verdict: Verdict;
  /** Did the pin's details actually open? null for bare-map contacts. */
  opened: boolean | null;
};

/** What useMapGestures decided (pinch start/end, glide, post-pinch pan hold), interleaved with the contacts. */
type GestureRow = GestureEntry & { seq: number };

type Row = ContactRow | GestureRow;

type Down = { x: number; y: number; t: number; transform: Transform; pinId: string | null; pointerType: string };

/**
 * `?debug=touch` log of every contact on the map: which pin it landed on (or
 * bare map), its numbers, what usePinClick's rules make of them, and
 * whether the pin's details actually opened. Mirrors those rules rather
 * than hooking into them, so the app's tap path runs exactly as it does
 * without debug. A "tap" verdict that didn't open means something other
 * than the rules swallowed it. Gesture rows come from useMapGestures
 * itself (see gestureLog); a yellow one is worth a second look.
 */
export default function DebugTapLog() {
  const controls = useMapControls();
  const { activePinId } = useDetails();
  const activePinRef = useRef(activePinId);
  const [rows, setRows] = useState<Row[]>([]);
  // Read at pointerup, so retuning a slider doesn't re-run the listener
  // effect (which would drop contacts in flight and restart `seq`).
  const pinTap = useTouchSettings().pinTap;
  const pinTapRef = useRef(pinTap);

  useEffect(() => {
    activePinRef.current = activePinId;
  }, [activePinId]);

  useEffect(() => {
    pinTapRef.current = pinTap;
  }, [pinTap]);

  useEffect(() => {
    const wrapper = controls.wrapper;
    if (!wrapper) return;
    const downs = new Map<number, Down>();
    let seq = 0;

    const onDown = (e: PointerEvent) => {
      const pin = (e.target as Element).closest<HTMLElement>("[data-pin-id]");
      downs.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        t: e.timeStamp,
        transform: controls.state,
        pinId: pin?.dataset.pinId ?? null,
        pointerType: e.pointerType,
      });
    };

    const finish = (e: PointerEvent, cancelled: boolean) => {
      const down = downs.get(e.pointerId);
      downs.delete(e.pointerId);
      if (!down) return;
      const now = controls.state;
      const durationMs = e.timeStamp - down.t;
      const travelPx = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const driftPx = Math.hypot(now.x - down.transform.x, now.y - down.transform.y);
      const scaleChange = Math.abs(now.scale / down.transform.scale - 1);
      const { maxMovePx, minContactMs, mapDriftSlackPx, maxScaleChange } = pinTapRef.current;

      let verdict: Verdict = "tap";
      if (cancelled) verdict = "cancelled";
      else if (travelPx > maxMovePx) verdict = "moved";
      else if (durationMs < minContactMs) verdict = "too-short";
      else if (driftPx > travelPx + mapDriftSlackPx) verdict = "map-drift";
      else if (scaleChange > maxScaleChange) verdict = "zoomed";

      const row: ContactRow = {
        kind: "contact",
        seq: ++seq,
        target: down.pinId ?? "map",
        pointerType: down.pointerType,
        durationMs,
        travelPx,
        driftPx,
        scaleChange,
        verdict,
        opened: null,
      };
      setRows((r) => [row, ...r].slice(0, MAX_ROWS));
      // This capture listener runs before React's own pointerup handling,
      // so check the outcome a moment later.
      if (down.pinId) {
        const pinId = down.pinId;
        window.setTimeout(() => {
          const opened = activePinRef.current === pinId;
          setRows((r) => r.map((x) => (x.kind === "contact" && x.seq === row.seq ? { ...x, opened } : x)));
        }, OPEN_CHECK_MS);
      }
    };
    const onUp = (e: PointerEvent) => finish(e, false);
    const onCancel = (e: PointerEvent) => finish(e, true);

    wrapper.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);
    const offGesture = onGesture((entry) =>
      setRows((r) => [{ ...entry, seq: ++seq }, ...r].slice(0, MAX_ROWS)),
    );
    return () => {
      offGesture();
      wrapper.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
    };
  }, [controls]);

  return (
    <div className="debug-tap-log pointer-events-none absolute left-1/2 top-12 z-[100] -translate-x-1/2 rounded-3xl bg-black/80 px-10 py-8 font-mono text-[28px] leading-snug text-white">
      <div className="debug-tap-log-title font-bold">
        Map contacts (tap ≤{pinTap.maxMovePx}px, ≥{pinTap.minContactMs}ms, drift ≤ travel+{pinTap.mapDriftSlackPx}px)
      </div>
      <table className="debug-tap-log-table mt-3">
        <thead className="debug-tap-log-head text-white/60">
          <tr className="debug-tap-log-row">
            <th className="debug-tap-log-cell pr-8 text-left">Target</th>
            <th className="debug-tap-log-cell pr-8 text-left">Type</th>
            <th className="debug-tap-log-cell pr-8 text-right">ms</th>
            <th className="debug-tap-log-cell pr-8 text-right">Finger</th>
            <th className="debug-tap-log-cell pr-8 text-right">Map</th>
            <th className="debug-tap-log-cell pr-8 text-left">Verdict</th>
            <th className="debug-tap-log-cell text-left">Opened</th>
          </tr>
        </thead>
        <tbody className="debug-tap-log-body">
          {rows.map((r) => {
            if (r.kind !== "contact") {
              return (
                <tr key={r.seq} className={`debug-tap-log-row ${r.warn ? "text-[#FACC15]" : "text-[#67E8F9]"}`}>
                  <td className="debug-tap-log-cell" colSpan={7}>
                    ↳ {r.kind}: {r.detail}
                  </td>
                </tr>
              );
            }
            const mismatch = r.opened !== null && r.opened !== (r.verdict === "tap");
            const tone = mismatch
              ? "text-[#FACC15]"
              : r.verdict === "tap"
                ? "text-[#4ADE80]"
                : r.target === "map"
                  ? "text-white/50"
                  : "text-[#F87171]";
            return (
              <tr key={r.seq} className={`debug-tap-log-row ${tone}`}>
                <td className="debug-tap-log-cell pr-8">{r.target.replace(/^(loc|mh)-/, "")}</td>
                <td className="debug-tap-log-cell pr-8">{r.pointerType}</td>
                <td className="debug-tap-log-cell pr-8 text-right">{Math.round(r.durationMs)}</td>
                <td className="debug-tap-log-cell pr-8 text-right">{Math.round(r.travelPx)}</td>
                <td className="debug-tap-log-cell pr-8 text-right">
                  {Math.round(r.driftPx)}
                  {r.scaleChange > 0.001 ? ` z${(r.scaleChange * 100).toFixed(1)}%` : ""}
                </td>
                <td className="debug-tap-log-cell pr-8">{r.verdict}</td>
                <td className="debug-tap-log-cell">{r.opened === null ? "" : r.opened ? "yes" : "NO"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
