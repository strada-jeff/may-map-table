import { MapContainer, ImageOverlay } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { CONFIG } from "../config";
import { MapSpace } from "../routing";
import DebugNetworkOverlay from "./DebugNetworkOverlay";
import DestinationMarkers from "./DestinationMarkers";
import RouteEffects from "./RouteEffects";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const space = new MapSpace([
  [0, 0],
  [CONFIG.map.width, CONFIG.map.height],
]);

const isDebug = new URLSearchParams(window.location.search).get("debug") === "1";

function MapView() {
  return (
    <MapContainer
      className="h-full w-full bg-[#f2f0ee]! z-40"
      crs={L.CRS.Simple}
      bounds={space.latLngBounds}
      maxBounds={space.latLngBounds}
      minZoom={-4}
      maxZoom={2}
      scrollWheelZoom
    >
      <ImageOverlay url="/base.png" bounds={space.latLngBounds} />
      <DestinationMarkers space={space} />
      <RouteEffects space={space} />
      {isDebug && <DebugNetworkOverlay />}
    </MapContainer>
  );
}

export default MapView;
