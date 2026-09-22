import { useEffect } from "react";
import { useWelcome } from "../hooks/WelcomeContext";
import { useDrawer } from "../hooks/DrawerContext";
import { useDetails } from "../hooks/DetailsContext";
import { useRoute } from "../hooks/RouteContext";
import { useSideModal } from "../hooks/SideModalContext";
import { useRotation } from "../hooks/RotationContext";

/**
 * Falling back to idle (the welcome screen reappearing) should hand the
 * next visitor a clean slate, not whatever route, pin details, or drawer
 * state the previous one left open — including a help/rotate/signup side
 * modal, which would otherwise sit on top of the welcome overlay (same
 * z-50, later in the DOM) — and the 180deg rotation, so the next visitor
 * doesn't walk up to an upside-down screen. Route/details already unwind each
 * other in places (see RouteContext/DrawerContext/DetailsContext), but
 * nothing until now reacted to idling itself.
 */
export default function IdleResetEffect() {
  const { isIdle } = useWelcome();
  const { setOpen } = useDrawer();
  const { closeDetails } = useDetails();
  const { clearRoute } = useRoute();
  const { close: closeSideModal } = useSideModal();
  const { reset: resetRotation } = useRotation();

  useEffect(() => {
    if (!isIdle) return;
    setOpen(false);
    closeDetails();
    clearRoute();
    closeSideModal();
    resetRotation();
  }, [isIdle, setOpen, closeDetails, clearRoute, closeSideModal, resetRotation]);

  return null;
}
