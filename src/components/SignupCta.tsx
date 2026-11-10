import signupCorner from "../assets/icons/signup-corner.svg";
import { useTap } from "../hooks/useTap";
import { useSideModal } from "../hooks/SideModalContext";

/**
 * Quarter-circle "keep in touch" badge, bottom-right — opens the sign-up
 * overlay. The button is the quarter circle itself (Figma "Group 54", node
 * 2585:6168: 239px radius, drawn for the table's bezel so the label and
 * icon already sit ~80px in from both edges), its corner on the screen's,
 * rounded so only the visible navy shape takes taps.
 */
export default function SignupCta() {
  const { open } = useSideModal();
  const tap = useTap(() => open("signup"));

  return (
    <button
      type="button"
      {...tap}
      aria-label="Keep in touch"
      className="signup-cta absolute bottom-0 right-0 z-40 size-[239px] rounded-tl-full"
    >
      {/* The export is the whole Figma group plus its drop-shadow margin;
          the quarter circle sits 10px/6px into it. */}
      <img src={signupCorner} alt="" className="signup-cta-icon pointer-events-none absolute left-[-10px] top-[-6px] h-[310.756px] w-[314.756px] max-w-none" />
    </button>
  );
}
