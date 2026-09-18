import type { MapSpace } from "../routing";
import { useLottieMarkers } from "../hooks/useLottieMarkers";
import LottieMarker from "./LottieMarker";

export default function LottieMarkers({ space }: { space: MapSpace }) {
  const markers = useLottieMarkers();

  return (
    <>
      {markers.map((marker) => (
        <LottieMarker key={marker.id} space={space} marker={marker} />
      ))}
    </>
  );
}
