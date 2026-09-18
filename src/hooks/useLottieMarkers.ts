import { useEffect, useState } from "react";
import { getLottieMarkers } from "../data/api";
import type { LottieMarkerConfig } from "../types/lottie";

export function useLottieMarkers(): LottieMarkerConfig[] {
  const [markers, setMarkers] = useState<LottieMarkerConfig[]>([]);

  useEffect(() => {
    let cancelled = false;
    getLottieMarkers().then((result) => {
      if (!cancelled) setMarkers(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return markers;
}
