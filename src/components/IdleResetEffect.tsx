import { useEffect } from "react";
import { useWelcome } from "../hooks/WelcomeContext";
import { useDrawer } from "../hooks/DrawerContext";
import { useDetails } from "../hooks/DetailsContext";
import { useRoute } from "../hooks/RouteContext";

/**
 * Falling back to idle (the welcome screen reappearing) should hand the
 * next visitor a clean slate, not whatever route, pin details, or drawer
 * state the previous one left open. Route/details already unwind each
 * other in places (see RouteContext/DrawerContext/DetailsContext), but
 * nothing until now reacted to idling itself.
 */
export default function IdleResetEffect() {
  const { isIdle } = useWelcome();
  const { setOpen } = useDrawer();
  const { closeDetails } = useDetails();
  const { clearRoute } = useRoute();

  useEffect(() => {
    if (!isIdle) return;
    setOpen(false);
    closeDetails();
    clearRoute();
  }, [isIdle, setOpen, closeDetails, clearRoute]);

  return null;
}
