import type { Network } from "./types";
import type { BoundAnchor } from "./planner";
import networkData from "../data/generated/network.json";
import originsData from "../data/generated/origins.json";

// TS widens JSON tuple fields ([x, y] points) to number[], so these are
// asserted rather than structurally checked — same note as api.ts.

/** The road network with the origins already split in (see build-network). */
export const network = networkData as unknown as Network;
/** network.svg's #origins, each bound to its node in `network`. */
export const origins = originsData as unknown as BoundAnchor[];
