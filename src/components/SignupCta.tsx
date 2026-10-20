import signupCorner from "../assets/icons/signup-corner.svg";
import { useTap } from "../hooks/useTap";
import { useSideModal } from "../hooks/SideModalContext";

/**
 * Quarter-circle "keep in touch" badge, bottom-right — opens the sign-up
 * overlay. The button is the quarter circle itself (148px radius, its
 * corner 12px/1px past the screen's, as in Figma), rounded so only the
 * visible navy shape takes taps.
 */
export default function SignupCta() {
  const { open } = useSideModal();
  const tap = useTap(() => open("signup"));

  return (
    <button
      type="button"
      {...tap}
      aria-label="Keep in touch"
      className="signup-cta absolute bottom-[-1px] right-[-12px] z-40 size-[148px] rounded-tl-full"
    >
      {/* The export is the whole 271.76px Figma frame plus its drop-shadow
          margin; the quarter circle sits in its top-left. */}
      <img src={signupCorner} alt="" className="signup-cta-icon pointer-events-none absolute left-[-10px] top-[-6px] h-[277.76px] w-[281.76px] max-w-none" />
    </button>
  );
}
