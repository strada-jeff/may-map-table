import { useRef, type HTMLAttributes } from "react";
import { useMapTransformEffect } from "../hooks/MapControlsContext";
import { scaleToZoom } from "../hooks/mapTransform";
import { CONFIG } from "../config";

/**
 * Pins' on-screen size relative to full: 1 from CONFIG.map.pinFullSizeZoom
 * in, easing linearly down to pinMinScale at pinMinSizeZoom and held there
 * further out, so the zoomed-out overview isn't crowded with full-size flags.
 */
function pinSize(scale: number): number {
  const { pinFullSizeZoom, pinMinSizeZoom, pinMinScale } = CONFIG.map;
  const zoom = scaleToZoom(scale);
  if (zoom >= pinFullSizeZoom) return 1;
  const t = Math.max(0, (zoom - pinMinSizeZoom) / (pinFullSizeZoom - pinMinSizeZoom));
  return pinMinScale + (1 - pinMinScale) * t;
}

/**
 * Counter-scales its children against the map's zoom, so markers stay the
 * same on-screen size at every zoom level (shrinking only when zoomed out,
 * see pinSize) while still riding the scene's pan. Written imperatively on
 * each transform change — no re-render.
 */
export default function KeepScale({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useMapTransformEffect(({ scale }) => {
    if (ref.current) ref.current.style.transform = `scale(${pinSize(scale) / scale})`;
  });

  return <div ref={ref} className={`keep-scale ${className ?? ""}`} {...props} />;
}
