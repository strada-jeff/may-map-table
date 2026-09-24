import { useRef, type MouseEvent, type PointerEvent } from "react";

type TapOptions = {
  /** Travel (CSS px, from where the finger landed) beyond which it's a drag, not a tap. */
  maxMovePx?: number;
  /** Contacts shorter than this are ignored — IR touch frames emit brief ghost points where two real touches' beams cross. */
  minContactMs?: number;
};

const STALE_MS = 10_000;

export type TapHandlers = {
  onPointerDown: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
  onClick: (e: MouseEvent) => void;
};

/**
 * Tap detection per pointer, instead of `click`. Chrome only synthesizes a
 * touch `click` for a single-finger tap — any other contact landing
 * mid-tap (another visitor, a resting palm, an IR frame's ghost point)
 * cancels it. This is a multi-user tabletop, so that's the normal case:
 * each pointerId is tracked on its own and other fingers are ignored.
 *
 * `onClick` is kept for keyboard activation only (`detail === 0`); pointer
 * taps already fired from pointerup, so nothing double-fires. A handled
 * tap stops propagation, so a nested button (e.g. a drawer card's
 * learn-more) doesn't also tap its card.
 */
export function useTap(
  onTap: () => void,
  { maxMovePx = 24, minContactMs = 20 }: TapOptions = {},
): TapHandlers {
  const downs = useRef(new Map<number, { x: number; y: number; t: number }>());

  return {
    onPointerDown: (e) => {
      // A nested tap stops its pointerup from bubbling here, leaving this
      // pointer's entry behind; touch pointerIds never repeat, so sweep.
      for (const [id, d] of downs.current)
        if (e.timeStamp - d.t > STALE_MS) downs.current.delete(id);
      downs.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        t: e.timeStamp,
      });
    },
    onPointerUp: (e) => {
      const down = downs.current.get(e.pointerId);
      downs.current.delete(e.pointerId);
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved > maxMovePx || e.timeStamp - down.t < minContactMs) return;
      e.stopPropagation();
      onTap();
    },
    onPointerCancel: (e) => {
      downs.current.delete(e.pointerId);
    },
    onClick: (e) => {
      if (e.detail !== 0) return;
      e.stopPropagation();
      onTap();
    },
  };
}
