import rotateIcon from "../assets/icons/rotate-icon.svg";
import { useTap } from "../hooks/useTap";
import { useRotation } from "../hooks/RotationContext";
import { useSideModal } from "../hooks/SideModalContext";

/**
 * Flips the whole app 180deg (see App.tsx/RotationContext) so the person on
 * the other side of the tabletop can read it right-side up. Tops the
 * right-edge column, above the zoom slider (whose top index.css keeps
 * clear of it). Opens a confirm overlay
 * rather than flipping immediately — see SidePanel's "rotate" branch,
 * which owns the actual `toggle()` call.
 */
export default function RotateControl() {
  const { rotated } = useRotation();
  const { open } = useSideModal();
  const tap = useTap(() => open("rotate"));

  return (
    <button
      type="button"
      {...tap}
      aria-pressed={rotated}
      aria-label="Rotate view 180 degrees"
      className="rotate-control absolute top-[72px] right-[63px] z-40 size-[65px] cursor-pointer"
    >
      {/* 85px export = the 65px circle plus its drop-shadow margin. */}
      <img src={rotateIcon} alt="" className="rotate-control-icon pointer-events-none absolute left-[-10px] top-[-6px] h-[85px] w-[85px] max-w-none" />
    </button>
  );
}
