import signupCorner from "../assets/icons/signup-corner.svg";
import { useTap } from "../hooks/useTap";
import { useSideModal } from "../hooks/SideModalContext";

/**
 * Quarter-circle "keep in touch" badge, bottom-right — opens the sign-up
 * overlay. The button is the quarter circle itself (Figma's 148px radius
 * grown by the bezel, its corner 12px/1px past the screen's, as in Figma),
 * rounded so only the visible navy shape takes taps. The navy and shadow are
 * the button's own; the SVG is just the label and icon, kept where Figma's
 * 148px circle put them so they sit a bezel in from both edges.
 */
export default function SignupCta() {
  const { open } = useSideModal();
  const tap = useTap(() => open("signup"));

  return (
    <button
      type="button"
      {...tap}
      aria-label="Keep in touch"
      className="signup-cta absolute bottom-[-1px] right-[-12px] z-40 size-[calc(var(--bezel)+148px)] rounded-tl-full bg-mayfair-navy shadow-[0_4px_10px_0_rgba(0,0,0,0.2)]"
    >
      {/* The export is the whole 271.76px Figma frame plus its drop-shadow
          margin, its own quarter circle removed; the art sits in its
          top-left, measured from Figma's 148px circle. */}
      <img src={signupCorner} alt="" className="signup-cta-icon pointer-events-none absolute left-[-10px] top-[-6px] h-[277.76px] w-[281.76px] max-w-none" />
    </button>
  );
}
