import { useRef } from "react";
import { useDetails } from "./DetailsContext";
import { useMapControls } from "./MapControlsContext";
import { useTap, type TapHandlers } from "./useTap";
import { useTouchSettings } from "./touchSettings";
import type { Transform } from "./mapTransform";
import type { DestinationPin } from "../types/pins";

/**
 * Shared by both marker types — a pin tap always opens its details view.
 * On top of useTap's own movement check, a tap is dropped if the map moved
 * more than the finger did: in a two-finger pinch, the finger that landed
 * on the pin can stay perfectly still while the other one zooms, and
 * lifting it shouldn't then open that pin. Measured relative to the finger
 * rather than as a fixed limit, since a one-finger tap's own jitter moves
 * the map by the same amount once it's past the pan threshold.
 */
export function usePinClick(pinId: DestinationPin["id"]): TapHandlers {
  const { openDetails } = useDetails();
  const controls = useMapControls();
  const { maxMovePx, minContactMs, mapDriftSlackPx, maxScaleChange } = useTouchSettings().pinTap;
  const start = useRef<{ x: number; y: number; transform: Transform } | null>(null);
  const end = useRef({ x: 0, y: 0 });

  const tap = useTap(
    () => {
      const down = start.current;
      if (down) {
        const now = controls.state;
        const travel = Math.hypot(end.current.x - down.x, end.current.y - down.y);
        const drift = Math.hypot(now.x - down.transform.x, now.y - down.transform.y);
        if (
          drift > travel + mapDriftSlackPx ||
          Math.abs(now.scale / down.transform.scale - 1) > maxScaleChange
        ) {
          return;
        }
      }
      openDetails(pinId);
    },
    { maxMovePx, minContactMs },
  );

  return {
    ...tap,
    onPointerDown: (e) => {
      start.current = { x: e.clientX, y: e.clientY, transform: controls.state };
      tap.onPointerDown(e);
    },
    onPointerUp: (e) => {
      end.current = { x: e.clientX, y: e.clientY };
      tap.onPointerUp(e);
    },
  };
}
