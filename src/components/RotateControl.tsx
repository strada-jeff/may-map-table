import type { PointerEvent, TouchEvent } from "react";
import rotateIcon from "../assets/icons/rotate-icon.svg";
import { useTap } from "../hooks/useTap";
import { useRotation } from "../hooks/RotationContext";
import { useSideModal } from "../hooks/SideModalContext";
import { useWelcome } from "../hooks/WelcomeContext";

/**
 * Flips the whole app 180deg (see App.tsx/RotationContext) so the person on
 * the other side of the tabletop can read it right-side up. Tops the
 * right-edge column, above the zoom slider (whose top index.css keeps
 * clear of it). On the map it opens a confirm overlay rather than flipping
 * immediately — see SidePanel's "rotate" branch, which owns that `toggle()`
 * call.
 *
 * On the welcome screen it sits above the overlay and flips straight away,
 * leaving the welcome up, now facing whoever tapped: there's nothing on it
 * to lose, and the confirm overlay would open beneath it. Its touches stop
 * here, as the overlay's own do, so the idle listener doesn't take them for
 * a visitor waking the table and dismiss the welcome.
 */
export default function RotateControl() {
  const { rotated, toggle } = useRotation();
  const { open } = useSideModal();
  const { isIdle } = useWelcome();
  const tap = useTap(() => (isIdle ? toggle() : open("rotate")));

  const stopOnIdle = (e: PointerEvent | TouchEvent) => {
    if (isIdle) e.stopPropagation();
  };

  return (
    <button
      type="button"
      {...tap}
      onPointerDown={(e) => {
        tap.onPointerDown(e);
        stopOnIdle(e);
      }}
      onTouchStart={stopOnIdle}
      aria-pressed={rotated}
      aria-label="Rotate view 180 degrees"
      className={`rotate-control absolute top-[calc(var(--bezel)+72px)] right-[calc(var(--bezel)+63px)] size-[65px] cursor-pointer ${isIdle ? "z-[60]" : "z-40"}`}
    >
      {/* 85px export = the 65px circle plus its drop-shadow margin. */}
      <img src={rotateIcon} alt="" className="rotate-control-icon pointer-events-none absolute left-[-10px] top-[-6px] h-[85px] w-[85px] max-w-none" />
    </button>
  );
}
