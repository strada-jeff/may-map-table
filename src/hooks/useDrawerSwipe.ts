import { useRef, type PointerEvent, type RefObject } from "react";
import { CONFIG } from "../config";

const FLICK_WINDOW_MS = 100;

type DrawerSwipeOptions = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The panel's own width; the drawer travels this minus `peekPx`. */
  panelWidth: number;
  /** How much of the panel stays on screen while closed. */
  peekPx: number;
};

export type DrawerSwipeHandlers = {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
};

type Drag = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: number;
  offset: number;
  dragging: boolean;
  lastX: number;
  lastT: number;
  velocity: number;
};

/** The drawer's resting transform; the drag hands back to it on release. */
export function drawerTransform(open: boolean, peekPx: number) {
  return open ? "translateX(0)" : `translateX(calc(-100% + ${peekPx}px))`;
}

/**
 * Swipe the drawer open or closed, following the finger while it drags.
 * One pointer at a time — other contacts landing mid-swipe (another
 * visitor, a palm) are ignored, as in useTap.
 *
 * Only horizontal travel claims the gesture: the card list is
 * `touch-action: pan-y`, so a vertical drag there scrolls natively and the
 * browser cancels the pointer. Once a drag starts it takes pointer capture,
 * so taps underneath (cards, the show/hide tab) never see a pointerup and
 * don't fire.
 *
 * The drag writes `transform` straight to the element instead of through
 * state, so the card list doesn't re-render every move. On release it
 * writes the resting transform itself too: when the drawer snaps back to
 * where it started, `open` doesn't change, so React wouldn't overwrite
 * the dragged position.
 *
 * clientX needs no rotation handling: useRotatedInputCorrection already
 * mirrors it when the app is flipped, which matches the drawer's own
 * flipped x axis.
 */
export function useDrawerSwipe(
  ref: RefObject<HTMLElement | null>,
  { open, setOpen, panelWidth, peekPx }: DrawerSwipeOptions,
): DrawerSwipeHandlers {
  const drag = useRef<Drag | null>(null);
  const closedOffset = -(panelWidth - peekPx);
  const { thresholdPx, flickVelocity } = CONFIG.touch.drawerSwipe;

  // A cancel (the IR frame losing the finger) settles by position like a
  // release does, rather than snapping back to where the drag started.
  const end = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    const el = ref.current;
    if (!d.dragging || !el) return;

    // A finger that stopped before lifting isn't a flick.
    const flicked =
      e.type === "pointerup" &&
      e.timeStamp - d.lastT < FLICK_WINDOW_MS &&
      Math.abs(d.velocity) > flickVelocity;
    const next = flicked ? d.velocity > 0 : d.offset > closedOffset / 2;
    el.style.transition = "";
    el.style.transform = drawerTransform(next, peekPx);
    setOpen(next);
  };

  return {
    onPointerDown: (e) => {
      // A tap underneath (useTap) stops its pointerup from bubbling here,
      // so an undragged contact can be left behind; only a live drag holds.
      if (drag.current?.dragging) return;
      drag.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startOffset: open ? 0 : closedOffset,
        offset: open ? 0 : closedOffset,
        dragging: false,
        lastX: e.clientX,
        lastT: e.timeStamp,
        velocity: 0,
      };
    },
    onPointerMove: (e) => {
      const d = drag.current;
      const el = ref.current;
      if (!d || d.pointerId !== e.pointerId || !el) return;
      const dx = e.clientX - d.startX;

      if (!d.dragging) {
        const dy = e.clientY - d.startY;
        if (Math.abs(dx) < thresholdPx || Math.abs(dx) < Math.abs(dy)) return;
        d.dragging = true;
        el.style.transition = "none";
        // Throws if the pointer is already gone (e.g. an IR ghost point).
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // The drag still works uncaptured, it just may lose the pointer.
        }
      }

      const dt = e.timeStamp - d.lastT;
      if (dt > 0) d.velocity = (e.clientX - d.lastX) / dt;
      d.lastX = e.clientX;
      d.lastT = e.timeStamp;

      d.offset = Math.min(0, Math.max(closedOffset, d.startOffset + dx));
      el.style.transform = `translateX(${d.offset}px)`;
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}
