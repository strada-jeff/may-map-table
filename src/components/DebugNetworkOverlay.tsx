import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { MapSpace, connectedComponents, type Point } from "../routing";
import { network } from "../routing/generated";

const space = new MapSpace(network.bounds);
const components = connectedComponents(network);

const COMPONENT_COLOURS = ["#D6236A", "#F2A03D", "#7B5BD6", "#12A594", "#C4324B"];

const componentOf = new Map<number, number>();
components.forEach((component, index) => {
  for (const node of component) componentOf.set(node, index);
});

const degree = new Map<number, number>();
for (const edge of network.edges) {
  degree.set(edge.a, (degree.get(edge.a) ?? 0) + 1);
  degree.set(edge.b, (degree.get(edge.b) ?? 0) + 1);
}

/** Arrowhead at an edge's midpoint, pointing the way it may be travelled. */
function chevronFor(geom: readonly Point[], size = 11, sweep = 0.6): Point[] | null {
  const at = Math.max(1, Math.floor(geom.length / 2));
  const from = geom[at - 1];
  const tip = geom[at];
  if (!from || !tip) return null;

  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  const ux = dx / length;
  const uy = dy / length;

  const barb = (angle: number): Point => [
    tip[0] - size * (ux * Math.cos(angle) - uy * Math.sin(angle)),
    tip[1] - size * (uy * Math.cos(angle) + ux * Math.sin(angle)),
  ];

  return [barb(sweep), tip, barb(-sweep)];
}

/**
 * Renders the derived road graph over the artwork, gated behind `?debug=1`.
 * The only way to see what the extractor actually produced — a gap the merge
 * missed, a disconnected component, a road that never made it out of the SVG
 * are all obvious here and invisible everywhere else.
 */
export default function DebugNetworkOverlay() {
  return (
    <>
      {network.edges.map((edge, id) => (
        <Polyline
          key={`edge-${id}`}
          positions={space.toLatLngs(edge.geom)}
          pathOptions={{
            color: COMPONENT_COLOURS[(componentOf.get(edge.a) ?? 0) % COMPONENT_COLOURS.length],
            weight: edge.kind === "bridge" ? 4 : 2,
            opacity: 0.9,
            dashArray: edge.kind === "bridge" ? "10 5" : undefined,
            interactive: false,
          }}
        />
      ))}

      {network.edges.map((edge, id) => {
        if (!edge.oneWay) return null;
        const chevron = chevronFor(edge.geom);
        if (!chevron) return null;
        return (
          <Polyline
            key={`chevron-${id}`}
            positions={space.toLatLngs(chevron)}
            pathOptions={{ color: "#111827", weight: 2, opacity: 0.9, interactive: false }}
          />
        );
      })}

      {network.nodes.map((point, id) => {
        const count = degree.get(id) ?? 0;
        const isDeadEnd = count === 1;
        return (
          <CircleMarker
            key={`node-${id}`}
            center={space.toLatLng(point)}
            radius={isDeadEnd ? 6 : 4}
            pathOptions={{
              color: isDeadEnd ? "#E11D48" : "#111827",
              fillColor: isDeadEnd ? "#E11D48" : "#FFFFFF",
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Tooltip direction="top">{`node ${id} · degree ${count}`}</Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
