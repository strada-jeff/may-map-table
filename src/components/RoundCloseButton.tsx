import { useTap } from "../hooks/useTap";
import closeX from "../assets/icons/close-x.svg";

/**
 * Figma's close_btn (2496:6729): a 132px white disc reading "CLOSE" over an
 * ×. Ends the help, sign-up and rotate overlays (SidePanel) and directions
 * (the destination's marker), each at the bottom of what it closes.
 */
export default function RoundCloseButton({ onClose, className }: { onClose: () => void; className?: string }) {
  const tap = useTap(onClose);

  return (
    <button
      type="button"
      {...tap}
      aria-label="Close"
      className={`round-close-button pointer-events-auto relative block size-[132px] shrink-0 rounded-full bg-white ${className ?? ""}`}
    >
      <span className="round-close-button-label absolute inset-x-0 top-[25px] font-vision text-[26px] font-extrabold uppercase leading-[54px] tracking-[2.6px] text-[#254a5d]">
        close
      </span>
      <img src={closeX} alt="" className="round-close-button-x absolute left-[57px] top-[74px] h-[20.24px] w-[20.12px]" />
    </button>
  );
}
