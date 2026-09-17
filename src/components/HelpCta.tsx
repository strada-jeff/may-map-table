import helpIcon from "../assets/icons/help-icon.svg";
import { useSideModal } from "../hooks/SideModalContext";

/** Bottom-right circular icon button — opens the (placeholder) help panel. */
export default function HelpCta() {
  const { open } = useSideModal();

  return (
    <button
      type="button"
      onClick={() => open("help")}
      aria-label="Help"
      className="help-cta absolute bottom-6 right-6 z-40 size-[60px] cursor-pointer"
    >
      <img src={helpIcon} alt="" className="size-full" />
    </button>
  );
}
