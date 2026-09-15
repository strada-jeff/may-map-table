import { useRoute } from "./RouteContext";
import { useDrawer } from "./DrawerContext";
import { useDetails } from "./DetailsContext";
import type { DestinationPin } from "../types/pins";

/**
 * Shared by both marker types. While the drawer's open, a pin click plots a
 * route to it (the existing "locate" behaviour, useful alongside the
 * drawer's card list); while it's closed, there's no list to relate the pin
 * to, so the click opens that pin's details view instead.
 */
export function usePinClick(pinId: DestinationPin["id"]): () => void {
  const { routeTo } = useRoute();
  const { open } = useDrawer();
  const { openDetails } = useDetails();

  return () => {
    if (open) routeTo(pinId);
    else openDetails(pinId);
  };
}
