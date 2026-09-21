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
      className="signup-cta absolute right-0 top-0 z-40 size-[120px]"
    >
      <img src={signupBadge} alt="" className="size-full" />
    </button>
  );
}
