import { useEffect, useRef } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { CONFIG } from "../config";
import { resolveMapPoint } from "../routing";
import { centeredTransform, tweenTransform, zoomToScale } from "../hooks/mapTransform";
import { useWelcome } from "../hooks/WelcomeContext";
import { useRoute } from "../hooks/RouteContext";

/**
 * App.tsx's TransformWrapper onInit already renders the idle (zoomed-out)
 * view on first mount — this only handles the transitions after that:
 * flying back out on returning to idle, and flying in on Explore.
 */
export default function InitialViewEffect() {
  const controls = useControls();
  const { isIdle, exploreCount } = useWelcome();
  const { clearRoute } = useRoute();
  const isFirstIdleRun = useRef(true);

  const center = resolveMapPoint(CONFIG.map.initialCenter);
  const idleScale = zoomToScale(CONFIG.map.initialZoom - CONFIG.map.idleZoomOffset);

  function targetTransform(scale: number) {
    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return null;
    const { width, height } = wrapper.getBoundingClientRect();
    return centeredTransform({ width, height }, center, scale);
  }

  useEffect(() => {
    if (isFirstIdleRun.current) {
      isFirstIdleRun.current = false;
      return;
    }
    if (!isIdle) return;
    // Standing idle back into the welcome screen should leave no trace of
    // whatever the previous visitor was doing — clear any in-progress route
    // along with flying back out to the idle view.
    clearRoute();
    const target = targetTransform(idleScale);
    if (target) tweenTransform(controls, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIdle]);

  useEffect(() => {
    if (exploreCount === 0) return;
    const target = targetTransform(zoomToScale(CONFIG.map.initialZoom));
    if (target) tweenTransform(controls, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreCount]);

  return null;
}
