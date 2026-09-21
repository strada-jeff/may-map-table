import { connectedComponents, type Point } from "../routing";
import { network } from "../routing/generated";

const COMPONENT_COLOURS = ["#D6236A", "#F2A03D", "#7B5BD6", "#12A594", "#C4324B"];

const components = connectedComponents(network);

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

const toPointsAttr = (points: readonly Point[]) => points.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * Renders the derived road graph over the artwork, gated behind `?debug=1`.
 * The only way to see what the extractor actually produced — a gap the merge
 * missed, a disconnected component, a road that never made it out of the SVG
 * are all obvious here and invisible everywhere else. Plain SVG children of
 * the shared master <svg> (see MapView) — network coordinates are already
 * in the same artwork-pixel space.
 */
export default function DebugNetworkOverlay() {
  return (
    <>
      {network.edges.map((edge, id) => (
        <polyline
          key={`edge-${id}`}
          points={toPointsAttr(edge.geom)}
          fill="none"
          stroke={COMPONENT_COLOURS[(componentOf.get(edge.a) ?? 0) % COMPONENT_COLOURS.length]}
          strokeWidth={edge.kind === "bridge" ? 4 : 2}
          strokeOpacity={0.9}
          strokeDasharray={edge.kind === "bridge" ? "10 5" : undefined}
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: "none" }}
        />
      ))}

      {network.edges.map((edge, id) => {
        if (!edge.oneWay) return null;
        const chevron = chevronFor(edge.geom);
        if (!chevron) return null;
        return (
          <polyline
            key={`chevron-${id}`}
            points={toPointsAttr(chevron)}
            fill="none"
            stroke="#111827"
            strokeWidth={2}
            strokeOpacity={0.9}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: "none" }}
          />
        );
      })}

      {network.nodes.map((point, id) => {
        const count = degree.get(id) ?? 0;
        const isDeadEnd = count === 1;
        return (
          <circle
            key={`node-${id}`}
            cx={point[0]}
            cy={point[1]}
            r={isDeadEnd ? 6 : 4}
            stroke={isDeadEnd ? "#E11D48" : "#111827"}
            fill={isDeadEnd ? "#E11D48" : "#FFFFFF"}
            fillOpacity={1}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`node ${id} · degree ${count}`}</title>
          </circle>
        );
      })}
    </>
  );
}
