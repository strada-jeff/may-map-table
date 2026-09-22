import type { Network, Point } from "./types";
import networkData from "../data/generated/network.json";
import anchorsData from "../data/generated/anchors.json";
import routesData from "../data/generated/routes.json";

export type BoundAnchor = {
  id: string;
  point: Point;
  node: number;
  snapDistance: number;
};

/** A destination bound to whichever single origin's network reaches it. */
export type BoundDestination = BoundAnchor & { originId: string };

export type AnchorsFile = {
  origins: BoundAnchor[];
  destinations: BoundDestination[];
};

export type RouteResult = {
  coordinates: Point[];
  distance: number;
};

/** `{ [originId]: { [destinationId]: route } }` */
export type RoutesFile = Record<string, Record<string, RouteResult>>;

// TS widens JSON tuple fields ([x, y] points) to number[], so these are
// asserted rather than structurally checked — same note as api.ts.
export const network = networkData as unknown as Network;
export const anchors = anchorsData as unknown as AnchorsFile;
export const routes = routesData as unknown as RoutesFile;
