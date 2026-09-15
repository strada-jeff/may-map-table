import type { Point } from "../routing/types";

/** The route currently drawn on the map, if any. */
export type ActiveRoute = {
  destinationId: string;
  originId: string;
  coordinates: Point[];
  distance: number;
};
