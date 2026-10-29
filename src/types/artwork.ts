/**
 * A "PIN " layer of base.svg, cut out by `npm run build:artwork`
 * (tools/build-pieces.ts) so a pin can show it: the CMS's Artwork field
 * stores its `id`. Generated into src/data/generated/artwork.json; don't
 * hand-edit.
 */
export type ArtworkPiece = {
  /** base.svg's id for the layer, e.g. "PIN_Swim_club". */
  id: string;
  /** The layer's name without its prefix, e.g. "Swim club". */
  label: string;
  /** Painted bounds in map units, [x, y, width, height]: the cut-outs' viewBox. */
  box: [number, number, number, number];
  /**
   * What to draw on the map, at `box`: "whole" is /artwork-pieces/<id>.svg,
   * "separate" is <id>.map.svg (the piece minus the art its Lottie scenery
   * replaces), "none" when the scenery covers all of it.
   */
  map: "whole" | "separate" | "none";
  /** Ids of the Lottie scenery inside the piece (lottie-markers.json), shown animated on the map. */
  lottie: string[];
};
