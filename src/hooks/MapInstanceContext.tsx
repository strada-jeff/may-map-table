import { createContext, useContext, useState, type ReactNode } from "react";
import type L from "leaflet";

type MapInstanceContextValue = {
  /** The main map's Leaflet instance, once it's mounted — null until then. */
  map: L.Map | null;
  setMap: (map: L.Map | null) => void;
};

const MapInstanceContext = createContext<MapInstanceContextValue | null>(null);

/**
 * Publishes the main map's Leaflet instance so components rendered outside
 * <MapContainer> (e.g. CompassControl's own minimap) can still read its
 * live bounds/zoom — see PublishMapInstance, which is the one thing that
 * calls setMap, from inside the main map's own component tree.
 */
export function MapInstanceProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<L.Map | null>(null);

  return (
    <MapInstanceContext.Provider value={{ map, setMap }}>{children}</MapInstanceContext.Provider>
  );
}

export function useMapInstance(): MapInstanceContextValue {
  const context = useContext(MapInstanceContext);
  if (!context) throw new Error("useMapInstance must be used within a MapInstanceProvider");
  return context;
}
