import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFromFile } from "./extract";
import { buildTopology, connectedComponents } from "./topology";
import { buildGraph, dijkstraFrom, pathTo } from "../src/routing/graph";
import { SnapIndex, splitEdgeAt } from "../src/routing/snap";
import type { Network, Point } from "../src/routing/types";
import { CONFIG } from "../src/config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_SVG = resolve(root, "public/network.svg");
const LOCATIONS_JSON = resolve(root, "src/data/locations.json");
const MODEL_HOMES_JSON = resolve(root, "src/data/model-homes.json");
const OUT_DIR = resolve(root, "src/data/generated");

/** A destination anchor is a mis-placed pin beyond this distance from a road. */
const MAX_SNAP_DISTANCE = 60;

// Matched by layer *role* (see extract.ts's `nameOf`), not literal id — so
// duplicating a whole "roads-network"/"origins"/"destinations" layer in
// Illustrator to start a second, separate network just works, however
// Illustrator ends up suffixing the copy's actual ids to keep them unique.
const NETWORK_LAYER_IDS = ["roads-network", "network", "roads"];
const ORIGINS_LAYER_IDS = ["origins"];
const DESTINATIONS_LAYER_IDS = ["destinations"];

interface BoundAnchor {
  id: string;
  point: Point;
  node: number;
  snapDistance: number;
}

/** A destination bound to whichever single origin's network reaches it. */
interface BoundDestination extends BoundAnchor {
  originId: string;
}

interface PrecomputedRoute {
  coordinates: Point[];
  distance: number;
}

function main(): void {
  const problems: string[] = [];
  const note = (message: string) => problems.push(message);

  console.log(`Reading ${SOURCE_SVG}`);
  const extraction = extractFromFile(SOURCE_SVG, {
    networkLayer: NETWORK_LAYER_IDS,
    originsLayer: ORIGINS_LAYER_IDS,
    destinationsLayer: DESTINATIONS_LAYER_IDS,
  });
  console.log(
    `  roads read from ${extraction.networkLayerIds.map((id) => `#${id}`).join(", ")} — ` +
      `${extraction.paths.length} paths, ${extraction.destinations.length} destinations, ` +
      `${extraction.origins.length} origins`,
  );

  if (extraction.ungrouped.length > 0) {
    console.log(
      `\n${extraction.ungrouped.length} path(s) outside any named sublayer, ` +
        `treated as ordinary two-way roads:`,
    );
    for (const id of extraction.ungrouped) console.log(`  ${id}`);
    console.log(`  Move them into two-way, one-way or bridges to be explicit.`);
  }

  // network.svg's viewBox is the coordinate space MapView's CRS.Simple bounds
  // are built from (CONFIG.map). A mismatch slides roads out of alignment
  // with the artwork — looks like a routing bug rather than an authoring one.
  const width = extraction.bounds[1][0] - extraction.bounds[0][0];
  const height = extraction.bounds[1][1] - extraction.bounds[0][1];
  console.log(`\nCoordinate space: ${width} x ${height}, from network.svg's viewBox`);
  if (width !== CONFIG.map.width || height !== CONFIG.map.height) {
    note(
      `network.svg's viewBox is ${width}x${height} but CONFIG.map is ` +
        `${CONFIG.map.width}x${CONFIG.map.height}. They must match exactly, or ` +
        `roads will drift out of alignment with the artwork.`,
    );
  }

  const { network, report } = buildTopology(extraction.paths, extraction.bounds);
  console.log(
    `\nTopology: ${report.nodeCount} nodes, ${report.edgeCount} edges ` +
      `(${report.intersectionsFound} junctions derived, ` +
      `${report.bridgeCrossingsSkipped} bridge crossings left unconnected)`,
  );

  if (report.components.length > 1) {
    // Informational only, not a problem: separate road networks (their own
    // origin, no drawn connection between them) are expected to land as
    // distinct components here. The real invariant — every destination
    // reachable from exactly one origin — is checked after routing below.
    console.log(
      `\n${report.components.length} disconnected components ` +
        `(largest ${report.components[0]!.length} nodes). ` +
        `Islands start at: ${report.components
          .slice(1)
          .map((c) => formatPoint(network.nodes[c[0]!]!))
          .join(", ")}`,
    );
  }

  if (report.nearMisses.length > 0) {
    console.log(`\nNear misses - junctions that almost closed:`);
    for (const miss of report.nearMisses.slice(0, 10)) {
      console.log(
        `  gap ${miss.gap.toFixed(1)}u between ${formatPoint(miss.a)} and ${formatPoint(miss.b)}`,
      );
    }
  }

  // The silent-failure direction: a destination anchor with no matching pin
  // entry produces nothing at all in the UI. Cross-check both ways.
  const knownIds = new Set([
    ...readIds(LOCATIONS_JSON),
    ...readIds(MODEL_HOMES_JSON),
  ]);
  for (const anchor of extraction.destinations) {
    if (!knownIds.has(anchor.id)) {
      note(
        `#destinations anchor "${anchor.id}" has no matching entry in ` +
          `locations.json or model-homes.json, so it has no content`,
      );
    }
  }

  if (extraction.origins.length === 0) {
    throw new Error(`No origin anchors found. Add at least one to #origins in ${SOURCE_SVG}.`);
  }

  // Destinations are bound once — their node doesn't depend on which origin
  // is routing to them. Origins are bound per-anchor, below.
  const destinations: BoundAnchor[] = extraction.destinations.map((anchor) =>
    bind(network, anchor.id, anchor.point, note),
  );

  const routes: Record<string, Record<string, PrecomputedRoute>> = {};
  const origins: BoundAnchor[] = [];
  // Which origin(s) successfully reached each destination — a destination
  // belonging to another, separate network simply won't appear here for
  // this origin, which is expected rather than noted per-origin below.
  const reachedBy = new Map<string, string[]>();

  for (const anchor of extraction.origins) {
    const origin = bind(network, anchor.id, anchor.point, note);
    origins.push(origin);

    const tree = dijkstraFrom(buildGraph(network), origin.node);
    const originRoutes: Record<string, PrecomputedRoute> = {};
    for (const destination of destinations) {
      const route = pathTo(network, tree, destination.node);
      if (!route) continue;
      originRoutes[destination.id] = {
        coordinates: route.coordinates,
        distance: Math.round(route.distance * 10) / 10,
      };
      reachedBy.set(destination.id, [...(reachedBy.get(destination.id) ?? []), origin.id]);
    }
    routes[origin.id] = originRoutes;
  }

  // The real cross-network invariant: every destination should be reachable
  // from exactly one origin. Zero means a dead pin; more than one means an
  // unexpected connection between what should be separate networks.
  const boundDestinations: BoundDestination[] = [];
  for (const destination of destinations) {
    const reachingOrigins = reachedBy.get(destination.id) ?? [];
    if (reachingOrigins.length === 0) {
      note(`"${destination.id}" is unreachable from every origin`);
      continue;
    }
    if (reachingOrigins.length > 1) {
      note(
        `"${destination.id}" is reachable from multiple origins ` +
          `(${reachingOrigins.join(", ")}) — expected exactly one for separate networks`,
      );
    }
    boundDestinations.push({ ...destination, originId: reachingOrigins[0]! });
  }

  const finalComponents = connectedComponents(network);
  if (finalComponents.length > 1) {
    // Informational only — see the matching note on the raw topology check
    // above; separate networks are expected to leave the graph fragmented.
    console.log(`\n${finalComponents.length} disconnected components after binding anchors`);
  }
  for (const edge of network.edges) {
    if (edge.len <= 0) note(`Zero-length edge between nodes ${edge.a} and ${edge.b}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  write("network.json", network);
  write("anchors.json", { origins, destinations: boundDestinations });
  write("routes.json", routes);

  console.log(`\nRoutes precomputed for ${origins.length} origin(s):`);
  for (const origin of origins) {
    const owned = boundDestinations.filter((d) => d.originId === origin.id).length;
    console.log(`  ${origin.id}: ${owned} destination(s) (of ${destinations.length} total)`);
  }

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nAll invariants passed.");
}

function bind(
  network: Network,
  id: string,
  point: Point,
  note: (message: string) => void,
): BoundAnchor {
  const snap = new SnapIndex(network).snap(point);
  if (!snap) throw new Error(`Cannot snap "${id}": the network has no edges`);
  if (snap.distance > MAX_SNAP_DISTANCE) {
    note(
      `"${id}" is ${snap.distance.toFixed(1)}u from the nearest road ` +
        `(limit ${MAX_SNAP_DISTANCE}u) - is the anchor in the right place?`,
    );
  }
  const node = splitEdgeAt(network, snap);
  return { id, point, node, snapDistance: snap.distance };
}

function readIds(path: string): string[] {
  const data = JSON.parse(readFileSync(path, "utf8")) as { id: string }[];
  return data.map((entry) => entry.id);
}

function write(name: string, data: unknown): void {
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`  wrote ${name}`);
}

function formatPoint(p: Point): string {
  return `(${p[0].toFixed(0)}, ${p[1].toFixed(0)})`;
}

main();
