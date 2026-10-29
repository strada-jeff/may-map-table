import { useLottieMarkers } from "../hooks/useLottieMarkers";
import { useRouteArtwork } from "../hooks/useRouteArtwork";
import LottieMarker from "./LottieMarker";

export default function LottieMarkers() {
  const markers = useLottieMarkers();
  // Scenery in the route destination's artwork piece shows above the dim
  // overlay along with the rest of it (RouteArtwork).
  const raised = new Set(useRouteArtwork()?.lottie);

  return (
    <>
      {markers.map((marker) => (
        <LottieMarker key={marker.id} marker={marker} raised={raised.has(marker.id)} />
      ))}
    </>
  );
}
