import { useEffect } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { CONFIG } from "../config";
import { resolveMapPoint } from "../routing";
import { centeredTransform, zoomToScale } from "../hooks/mapTransform";

/**
 * artwork.png is 15360x8640 so it stays crisp at max zoom — the browser
 * only rasterizes it at native resolution the first time something is
 * actually drawn at that scale, which otherwise happens mid-gesture on a
 * visitor's first zoom-in and stutters. Forcing that paint once here,
 * right after mount, hides the cost behind the welcome overlay (up at
 * 92% opacity from isIdle's initial true) instead: jump to max scale for
 * one frame, then jump straight back to the idle transform already set
 * by TransformWrapper's onInit.
 */
export default function ZoomWarmupEffect() {
  const controls = useControls();

  useEffect(() => {
    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return;

    const { positionX, positionY, scale } = controls.instance.state;
    const { width, height } = wrapper.getBoundingClientRect();
    const center = resolveMapPoint(CONFIG.map.initialCenter);
    const warm = centeredTransform({ width, height }, center, zoomToScale(CONFIG.map.maxZoom));

    requestAnimationFrame(() => {
      controls.setTransform(warm.x, warm.y, warm.scale, 0);
      requestAnimationFrame(() => {
        controls.setTransform(positionX, positionY, scale, 0);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
