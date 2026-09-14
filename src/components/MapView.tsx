import { MapContainer, ImageOverlay, Marker, Popup } from "react-leaflet";
import L, { type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BASE_MAP_WIDTH = 3840;
const BASE_MAP_HEIGHT = 2160;
const BASE_MAP_BOUNDS: LatLngBoundsExpression = [
  [0, 0],
  [BASE_MAP_HEIGHT, BASE_MAP_WIDTH],
];
const BASE_MAP_CENTER: [number, number] = [
  BASE_MAP_HEIGHT / 2,
  BASE_MAP_WIDTH / 2,
];

function MapView() {
  return (
    <MapContainer
      className="h-full w-full bg-[#f2f0ee]! z-40"
      crs={L.CRS.Simple}
      bounds={BASE_MAP_BOUNDS}
      maxBounds={BASE_MAP_BOUNDS}
      minZoom={-4}
      maxZoom={2}
      scrollWheelZoom
    >
      <ImageOverlay url="/base.png" bounds={BASE_MAP_BOUNDS} />
      <Marker position={BASE_MAP_CENTER}>
        <Popup>Center of base map</Popup>
      </Marker>
    </MapContainer>
  );
}

export default MapView;
