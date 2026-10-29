import type { ArtworkPiece } from "../types/artwork";
import catalog from "./generated/artwork.json";

const pieces = new Map((catalog as ArtworkPiece[]).map((piece) => [piece.id, piece]));

/** The piece a pin's `artwork` names, if base.svg still has it. */
export function artworkPiece(id: string | undefined): ArtworkPiece | undefined {
  return id ? pieces.get(id) : undefined;
}

/** The whole piece, for the details view. */
export function pieceUrl(piece: ArtworkPiece): string {
  return `/artwork-pieces/${piece.id}.svg`;
}

/** What to draw on the map, or null when the piece's Lottie scenery covers all of it. */
export function pieceMapUrl(piece: ArtworkPiece): string | null {
  if (piece.map === "none") return null;
  return `/artwork-pieces/${piece.id}${piece.map === "separate" ? ".map" : ""}.svg`;
}
