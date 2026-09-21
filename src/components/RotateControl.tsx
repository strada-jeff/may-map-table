import rotateIcon from "../assets/icons/rotate-icon.svg";
import { useRotation } from "../hooks/RotationContext";
import { useSideModal } from "../hooks/SideModalContext";

/**
 * Flips the whole app 180deg (see App.tsx/RotationContext) so the person on
 * the other side of the tabletop can read it right-side up. Stacked
 * directly above HelpCta, same right-edge column. Opens a confirm overlay
 * rather than flipping immediately — see SidePanel's "rotate" branch,
 * which owns the actual `toggle()` call.
 */
export default function RotateControl() {
  const { rotated } = useRotation();
  const { open } = useSideModal();

  return (
    <button
      type="button"
      onClick={() => open("rotate")}
      aria-pressed={rotated}
      aria-label="Rotate view 180 degrees"
      className="rotate-control absolute bottom-[90px] right-6 z-40 size-[60px] cursor-pointer"
    >
      <img src={rotateIcon} alt="" className="size-full" />
    </button>
  );
}
