import signupBadge from "../assets/icons/signup-badge.svg";
import { useSideModal } from "../hooks/SideModalContext";

/** Corner ribbon badge, top-right — opens the sign-up overlay. */
export default function SignupCta() {
  const { open } = useSideModal();

  return (
    <button
      type="button"
      onClick={() => open("signup")}
      aria-label="Sign up"
      className="signup-cta absolute right-0 top-0 z-40 size-[155px]"
    >
      {/* 175px export = the 155px badge plus its drop-shadow margin. */}
      <img src={signupBadge} alt="" className="signup-cta-icon pointer-events-none absolute left-[-10px] top-[-6px] h-[175px] w-[175px] max-w-none" />
    </button>
  );
}
