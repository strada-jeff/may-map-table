import rotateIcon from "../assets/icons/rotate-icon.svg";

type RotateControlProps = {
  rotated: boolean;
  onToggle: () => void;
};

/**
 * Flips the whole app 180deg (see App.tsx) so the person on the other side
 * of the tabletop can read it right-side up. Stacked directly above
 * HelpCta, same right-edge column.
 */
export default function RotateControl({
  rotated,
  onToggle,
}: RotateControlProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={rotated}
      aria-label="Rotate view 180 degrees"
      className="rotate-control absolute bottom-[90px] right-6 z-40 size-[60px] cursor-pointer"
    >
      <img src={rotateIcon} alt="" className="size-full" />
    </button>
  );
}
