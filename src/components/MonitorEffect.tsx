import { useEffect, useMemo, useRef } from "react";
import { useWelcome } from "../hooks/WelcomeContext";
import { useDetails } from "../hooks/DetailsContext";
import { useRoute } from "../hooks/RouteContext";
import { useFilter } from "../hooks/FilterContext";
import { useDrawer } from "../hooks/DrawerContext";
import { useSideModal } from "../hooks/SideModalContext";
import { useRotation } from "../hooks/RotationContext";
import { useDestinationPins, type DestinationPin } from "../hooks/useDestinationPins";
import { useBuilders } from "../hooks/useBuilders";
import { useCategories } from "../hooks/useCategories";
import { endSession, monitorEnabled, report, startSession } from "../monitor/report";

const ACTIVE_HEARTBEAT_MS = 30_000; // the monitor greys out an active session it hasn't heard from in 90s
const IDLE_HEARTBEAT_MS = 5 * 60_000; // lets the monitor tell "idle" from "kiosk offline"

/**
 * Tells the staff Table Monitor (see src/monitor/report.ts) when a visit
 * starts and ends and what the visitor opens along the way. Watches the
 * app's existing state instead of hooking each control, so a pin opened
 * from the map or the drawer reports the same way. Only openings are
 * reported — closing things, and IdleResetEffect's cleanup, aren't news.
 */
export default function MonitorEffect() {
  return monitorEnabled ? <Reporter /> : null;
}

function Reporter() {
  const { isIdle } = useWelcome();
  const { activePinId } = useDetails();
  const { activeRoute } = useRoute();
  const { activeCategoryId } = useFilter();
  const { open: drawerOpen } = useDrawer();
  const { activeModal } = useSideModal();
  const { rotated } = useRotation();
  const pinName = usePinNames();
  const categories = useCategories();

  // First, so a tap that wakes the table and opens something in the same
  // render reports the session's start before what was opened.
  useEffect(() => {
    if (isIdle) endSession();
    else startSession();
  }, [isIdle]);

  useEffect(() => {
    const send = () => report("heartbeat");
    send();
    const interval = setInterval(send, isIdle ? IDLE_HEARTBEAT_MS : ACTIVE_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [isIdle]);

  useOnChange(activePinId, (id) => id && report("details", pinName(id)));
  useOnChange(activeRoute?.destinationId ?? null, (id) => id && report("directions", pinName(id)));
  useOnChange(activeCategoryId, (id) => {
    if (isIdle) return;
    report("filter", id ? (categories.find((category) => category.id === id)?.label ?? id) : "All");
  });
  useOnChange(drawerOpen, (open) => open && report("drawer"));
  useOnChange(activeModal, (modal) => {
    if (modal === "help") report("help");
    if (modal === "signup") report("signup");
  });
  useOnChange(rotated, (flipped) => flipped && report("rotate"));

  return null;
}

/**
 * Calls `onChange` when `value` changes after mount — not on mount itself,
 * and not twice under StrictMode's re-run effects, since the ref already
 * holds the value by then.
 */
function useOnChange<T>(value: T, onChange: (value: T) => void) {
  const previous = useRef(value);
  const callback = useRef(onChange);
  // Before the effect below (effects run in order), so it sees this render's closure.
  useEffect(() => {
    callback.current = onChange;
  });
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    callback.current(value);
  }, [value]);
}

/** A pin's name as staff would say it: "Highland Homes – Groveton", "Mayfair Swim Club". */
function usePinNames(): (id: DestinationPin["id"]) => string {
  const { pins } = useDestinationPins();
  const builders = useBuilders();
  return useMemo(() => {
    const builderNames = new Map(builders.map((builder) => [builder.id, builder.name]));
    const names = new Map(
      pins.map((pin) => {
        if (pin.kind === "location") return [pin.id, pin.title];
        const builder = builderNames.get(pin.builderId);
        return [pin.id, builder ? `${builder} – ${pin.name}` : pin.name];
      }),
    );
    return (id) => names.get(id) ?? id;
  }, [pins, builders]);
}
