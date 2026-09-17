import { useEffect } from "react";

// Mouse/pointer events carry their position directly as clientX/clientY.
// Touch events don't — each finger's position lives on a separate Touch
// object inside touches/changedTouches/targetTouches instead. Leaflet's own
// Draggable and TouchZoom pick whichever family the browser actually
// prefers: on any device that also exposes the legacy Touch Events API
// (true for basically every real touchscreen — see Browser.touchNative in
// leaflet-src.js), Leaflet skips its pointer-event compatibility shim
// entirely and binds raw touchstart/touchmove/touchend/touchcancel,  so
// mouse-only testing never exercises this path even though it's the one
// that matters on the actual kiosk hardware.
const MOUSE_EVENTS = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "mousedown",
  "mousemove",
  "mouseup",
  "click",
  "dblclick",
  "contextmenu",
  "wheel",
] as const;

const TOUCH_EVENTS = ["touchstart", "touchmove", "touchend", "touchcancel"] as const;

// A given finger's Touch object can be the same reference across multiple
// of these lists (e.g. touches and changedTouches) — mirroring it twice
// would flip it right back to its original value.
const TOUCH_LISTS = ["touches", "changedTouches", "targetTouches"] as const;

/**
 * App.tsx flips the whole kiosk 180deg with `transform: rotate(180deg)` so
 * the person across the table can read it right-side up — but that's a
 * paint-only transform. clientX/clientY on every pointer/mouse/wheel event
 * are always real, un-rotated viewport pixels, no matter which ancestor
 * carries the rotation.
 *
 * Leaflet's drag handler measures a raw pointer *delta* (current clientX/Y
 * minus the delta's own start point) and applies that delta as a new
 * `transform: translate()` on the map pane — a pane that's itself nested
 * inside the rotated wrapper. A translation applied to a rotated
 * subtree renders 180deg from how it was authored, so a real rightward
 * drag paints as a leftward pan (same for wheel-zoom's cursor-anchored
 * scale). That's the bug this hook fixes: mirroring clientX/clientY through
 * the viewport's center — upstream of Leaflet's own listeners (bound to the
 * map container/document), via a capture-phase listener on window — negates
 * the delta going in so the translate-then-rotate ends up visually matching
 * the real, on-screen gesture.
 *
 * ZoomSlider does NOT have this bug and must stay excluded: it computes an
 * *absolute* fraction from `clientY` against its own track's
 * `getBoundingClientRect()`, and that rect is already reported in real,
 * post-rotation visual space — so clientY and rect.top are already in the
 * same (correct) coordinate system without any correction. Mirroring
 * clientY there while leaving the rect un-mirrored is what would actually
 * *introduce* a reversal, so events targeting the slider (identified via
 * pointer capture, which retargets them to the track for the whole drag
 * even once the pointer leaves its bounds) pass through untouched.
 */
export function useRotatedInputCorrection(rotated: boolean) {
  useEffect(() => {
    if (!rotated) return;

    function mirrorPoint(point: { clientX: number; clientY: number }) {
      Object.defineProperty(point, "clientX", {
        value: window.innerWidth - point.clientX,
        configurable: true,
      });
      Object.defineProperty(point, "clientY", {
        value: window.innerHeight - point.clientY,
        configurable: true,
      });
    }

    function mirror(e: Event) {
      const target = e.target as Element | null;
      if (target?.closest(".zoom-slider-track")) return;

      const touchEvent = e as TouchEvent;
      if (touchEvent.touches) {
        const seen = new Set<Touch>();
        for (const key of TOUCH_LISTS) {
          const list = touchEvent[key];
          for (let i = 0; i < list.length; i++) {
            const touch = list[i];
            if (seen.has(touch)) continue;
            seen.add(touch);
            mirrorPoint(touch);
          }
        }
        return;
      }

      mirrorPoint(e as MouseEvent);
    }

    const types: readonly string[] = [...MOUSE_EVENTS, ...TOUCH_EVENTS];
    for (const type of types) {
      window.addEventListener(type, mirror, { capture: true });
    }
    return () => {
      for (const type of types) {
        window.removeEventListener(type, mirror, { capture: true });
      }
    };
  }, [rotated]);
}
