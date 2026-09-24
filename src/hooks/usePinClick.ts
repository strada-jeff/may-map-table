import { useRef } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { useDetails } from "./DetailsContext";
import { useTap, type TapHandlers } from "./useTap";
import type { DestinationPin } from "../types/pins";

// How far the map's own transform may drift between finger-down and -up
// and still count as a tap on the pin, in screen px / scale ratio.
const MAP_MOVE_TOLERANCE_PX = 18;
const MAP_SCALE_TOLERANCE = 0.02;

/**
 * Shared by both marker types — a pin tap always opens its details view.
 * On top of useTap's own movement check, a tap is dropped if the map
 * itself panned or zoomed meanwhile: in a two-finger pinch, the finger
 * that landed on the pin can stay perfectly still while the other one
 * zooms, and lifting it shouldn't then open that pin.
 */
export function usePinClick(pinId: DestinationPin["id"]): TapHandlers {
  const { openDetails } = useDetails();
  const controls = useControls();
  const startState = useRef<{
    positionX: number;
    positionY: number;
    scale: number;
  } | null>(null);

  const tap = useTap(() => {
    const start = startState.current;
    const now = controls.instance.state;
    if (
      start &&
      (Math.abs(now.positionX - start.positionX) > MAP_MOVE_TOLERANCE_PX ||
        Math.abs(now.positionY - start.positionY) > MAP_MOVE_TOLERANCE_PX ||
        Math.abs(now.scale / start.scale - 1) > MAP_SCALE_TOLERANCE)
    ) {
      return;
    }
    openDetails(pinId);
  });

  return {
    ...tap,
    onPointerDown: (e) => {
      const { positionX, positionY, scale } = controls.instance.state;
      startState.current = { positionX, positionY, scale };
      tap.onPointerDown(e);
    },
  };
}
