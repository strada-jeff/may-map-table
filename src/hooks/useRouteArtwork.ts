import { useEffect } from "react";
import { artworkPiece, pieceMapUrl } from "../data/artwork";
import type { ArtworkPiece } from "../types/artwork";
import { useRoute } from "./RouteContext";
import { useDestinationPins } from "./useDestinationPins";

/**
 * The artwork piece of the displayed route's destination, which the route
 * layer lifts above its dim overlay (RouteArtwork, LottieMarkers). Follows
 * `displayedRoute`, not `activeRoute`, so it changes over in step with the
 * overlay's fade.
 */
export function useRouteArtwork(): ArtworkPiece | undefined {
  const { displayedRoute } = useRoute();
  const { pins } = useDestinationPins();
  const pin = displayedRoute ? pins.find((p) => p.id === displayedRoute.destinationId) : undefined;
  return artworkPiece(pin?.artwork);
}

/**
 * Loads every pin's map cut-out up front, so a route's art is drawn the
 * moment the overlay dims instead of a beat later, once fetched.
 */
export function usePreloadRouteArtwork(): void {
  const { pins } = useDestinationPins();
  useEffect(() => {
    for (const pin of pins) {
      const piece = artworkPiece(pin.artwork);
      const url = piece && pieceMapUrl(piece);
      if (url) new Image().src = url;
    }
  }, [pins]);
}
