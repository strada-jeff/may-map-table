import { useLottieMarkers } from "../hooks/useLottieMarkers";
import LottieMarker from "./LottieMarker";

export default function LottieMarkers() {
  const markers = useLottieMarkers();

  return (
    <>
      {markers.map((marker) => (
        <LottieMarker key={marker.id} marker={marker} />
      ))}
    </>
  );
}
