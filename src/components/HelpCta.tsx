import helpIcon from "../assets/icons/help-icon.svg";
import { useSideModal } from "../hooks/SideModalContext";

/** Bottom-right circular icon button — opens the help legend. */
export default function HelpCta() {
  const { open } = useSideModal();

  return (
    <button
      type="button"
      onClick={() => open("help")}
      aria-label="Help"
      className="help-cta absolute bottom-[67px] right-[63px] z-40 size-[65px] cursor-pointer"
    >
      {/* 85px export = the 65px circle plus its drop-shadow margin. */}
      <img src={helpIcon} alt="" className="help-cta-icon pointer-events-none absolute left-[-10px] top-[-6px] h-[85px] w-[85px] max-w-none" />
    </button>
  );
}
