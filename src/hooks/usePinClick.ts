import { useDetails } from "./DetailsContext";
import type { DestinationPin } from "../types/pins";

/** Shared by both marker types — a pin click always opens its details view. */
export function usePinClick(pinId: DestinationPin["id"]): () => void {
  const { openDetails } = useDetails();
  return () => openDetails(pinId);
}
