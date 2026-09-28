import { useRef, type HTMLAttributes } from "react";
import { useMapTransformEffect } from "../hooks/MapControlsContext";

/**
 * Counter-scales its children against the map's zoom, so markers stay the
 * same on-screen size at every zoom level while still riding the scene's
 * pan. Written imperatively on each transform change — no re-render.
 */
export default function KeepScale({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useMapTransformEffect(({ scale }) => {
    if (ref.current) ref.current.style.transform = `scale(${1 / scale})`;
  });

  return <div ref={ref} className={`keep-scale ${className ?? ""}`} {...props} />;
}
