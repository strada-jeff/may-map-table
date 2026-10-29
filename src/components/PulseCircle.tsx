/**
 * The white circle behind a flag or balloon (Figma flag_new/balloon_new),
 * breathing 1 -> 0.92 -> 1 (`.marker-pulse` in index.css). A box-shadow
 * rather than Figma's filter, so the animation stays cheap on the kiosk's
 * integrated graphics: it only ever moves an already-painted layer.
 */
export default function PulseCircle({ left, top, size }: { left: number; top: number; size: number }) {
  return (
    <div
      className="marker-pulse pointer-events-none absolute rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
      style={{ left, top, width: size, height: size }}
    />
  );
}
