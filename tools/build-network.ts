import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFromFile } from "./extract";
import { buildTopology, connectedComponents } from "./topology";
import { SnapIndex, splitEdgeAt } from "../src/routing/snap";
import type { BoundAnchor } from "../src/routing/planner";
import type { Network, Point } from "../src/routing/types";
import { CONFIG } from "../src/config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_SVG = resolve(root, "public/network.svg");
const OUT_DIR = resolve(root, "src/data/generated");
/** What the CMS's map position field draws and checks pins against (cms/theme/inc/map-field.php). */
const CMS_MAP_DATA = resolve(root, "cms/theme/assets/map-data.json");


// Matched by layer *role* (see extract.ts's `nameOf`), not literal id — so
// duplicating a whole "roads-network"/"origins" layer in Illustrator to
// start a second, separate network just works, however Illustrator ends up
// suffixing the copy's actual ids to keep them unique.
const NETWORK_LAYER_IDS = ["roads-network", "network", "roads"];
const ORIGINS_LAYER_IDS = ["origins"];
// No longer read: destinations are the CMS's pins, each placed by its own
// `anchor` and routed to at runtime (src/routing/planner.ts). Still named
// here so a leftover layer is reported, and so it can never be read as roads.
const DESTINATIONS_LAYER_IDS = ["destinations"];

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
      `${extraction.paths.length} paths, ${extraction.origins.length} origins`,
  );
  if (extraction.destinations.length > 0) {
    console.log(
      `  ${extraction.destinations.length} dot(s) in a #destinations layer, ignored — ` +
        `destinations are placed by each entry's "anchor" in the data now. Delete the layer.`,
    );
  }

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

  if (extraction.origins.length === 0) {
    throw new Error(`No origin anchors found. Add at least one to #origins in ${SOURCE_SVG}.`);
  }

  // Origins are split into the network here, once; destinations are split
  // into a copy of it at runtime, from wherever the CMS puts them.
  const origins: BoundAnchor[] = extraction.origins.map((anchor) =>
    bind(network, anchor.id, anchor.point, note),
  );

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
  write("origins.json", origins);

  // The admin only draws roads and measures distance to them, so it gets
  // the bare geometry (to 0.01u) rather than the whole graph — plus which
  // roads no origin connects to, since a pin on one of those gets no route.
  const round = (p: Point): Point => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
  const routedNodes = new Set(
    finalComponents.filter((component) => origins.some((o) => component.includes(o.node))).flat(),
  );
  mkdirSync(dirname(CMS_MAP_DATA), { recursive: true });
  writeFileSync(
    CMS_MAP_DATA,
    `${JSON.stringify({
      width: CONFIG.map.width,
      height: CONFIG.map.height,
      maxSnapDistance: CONFIG.routing.maxSnapDistance,
      roads: network.edges.map((edge) => edge.geom.map(round)),
      unreachableRoads: network.edges.flatMap((edge, i) => (routedNodes.has(edge.a) ? [] : [i])),
      origins: origins.map(({ id, point }) => ({ id, point })),
    })}\n`,
  );
  console.log(`  wrote ${CMS_MAP_DATA.slice(root.length + 1)}`);

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
  if (snap.distance > CONFIG.routing.maxSnapDistance) {
    note(
      `"${id}" is ${snap.distance.toFixed(1)}u from the nearest road ` +
        `(limit ${CONFIG.routing.maxSnapDistance}u) - is the anchor in the right place?`,
    );
  }
  const node = splitEdgeAt(network, snap);
  return { id, point, node, snapDistance: snap.distance };
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
