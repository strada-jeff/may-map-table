import { useEffect } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { CONFIG } from "../config";
import { centeredTransform, tweenTransform, zoomToScale } from "../hooks/mapTransform";
import { useDetails } from "../hooks/DetailsContext";
import { useDestinationPins } from "../hooks/useDestinationPins";

/**
 * The details panel is anchored to the left (see DetailsView), so centering
 * the active pin on the wrapper's true center would put it halfway under
 * the panel. Shifts the target center left by half the panel's width so
 * the pin lands in the middle of the space that's actually still visible,
 * at CONFIG.map.pinDetailZoomLevel.
 */
export default function DetailsMapEffect() {
  const controls = useControls();
  const { activePinId } = useDetails();
  const { pins } = useDestinationPins();

  useEffect(() => {
    const pin = pins.find((p) => p.id === activePinId);
    if (!pin) return;

    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return;
    const { width, height } = wrapper.getBoundingClientRect();
    const target = centeredTransform(
      { width, height },
      pin.position,
      zoomToScale(CONFIG.map.pinDetailZoomLevel),
      { x: -CONFIG.details.panelWidthPx / 2, y: 0 },
    );
    tweenTransform(controls, target);
  }, [activePinId, pins, controls]);

  return null;
}
