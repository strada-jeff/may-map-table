import { MapContainer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../leaflet/smoothWheelZoom";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { CONFIG } from "../config";
import { resolveMapPoint } from "../routing";
import { space } from "../mapSpace";
import ArtworkTiles from "./ArtworkTiles";
import DebugNetworkOverlay from "./DebugNetworkOverlay";
import DestinationMarkers from "./DestinationMarkers";
import RouteEffects from "./RouteEffects";
import FilterEffects from "./FilterEffects";
import DetailsMapEffect from "./DetailsMapEffect";
import InitialViewEffect from "./InitialViewEffect";
import PublishMapInstance from "./PublishMapInstance";
import ZoomSlider from "./ZoomSlider";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// The welcome screen is up on first paint, so the map should already be
// showing its idle (zoomed-out) view rather than fitting the whole artwork
// — see InitialViewEffect for the transitions after this initial render.
const initialCenter = space.toLatLng(resolveMapPoint(CONFIG.map.initialCenter));
const initialZoom = CONFIG.map.initialZoom - CONFIG.map.idleZoomOffset;

const isDebug =
  new URLSearchParams(window.location.search).get("debug") === "1";

function MapView() {
  return (
    <MapContainer
      className="h-full w-full bg-[#f2f0ee]! z-40"
      crs={L.CRS.Simple}
      center={initialCenter}
      zoom={initialZoom}
      maxBounds={space.latLngBounds}
      minZoom={CONFIG.map.minZoom}
      maxZoom={CONFIG.map.maxZoom}
      zoomSnap={0}
      scrollWheelZoom={false}
      smoothWheelZoom
      smoothSensitivity={1}
      // ZoomSlider changes zoom with animate:false so a drag doesn't fight
      // its own transitions (see ZoomSlider) — with fade animation on,
      // every one of those rapid, discrete zoom resets briefly fades the
      // tile layer out/in, which reads as flashing/flickering.
      fadeAnimation={false}
    >
      <ArtworkTiles space={space} />
      <DestinationMarkers space={space} />
      <RouteEffects space={space} />
      <FilterEffects space={space} />
      <DetailsMapEffect space={space} />
      <InitialViewEffect space={space} />
      <PublishMapInstance />
      <ZoomSlider />
      {isDebug && <DebugNetworkOverlay />}
    </MapContainer>
  );
}

export default MapView;
