import { pieceMapUrl } from "../data/artwork";
import { useRouteArtwork } from "../hooks/useRouteArtwork";

/**
 * The route destination's artwork piece (the CMS's Artwork field), drawn
 * over RouteDimOverlay and under the route line, so the place itself stays
 * bright while directions are on. Its Lottie scenery isn't here: those
 * markers raise themselves above the route SVG instead (LottieMarkers),
 * the way the active pin does.
 *
 * Needs no fade of its own: it's the same art the tiles show beneath, so as
 * the overlay fades out there's nothing to see change.
 */
export default function RouteArtwork() {
  const piece = useRouteArtwork();
  const url = piece && pieceMapUrl(piece);
  if (!piece || !url) return null;

  const [x, y, width, height] = piece.box;
  return <image href={url} x={x} y={y} width={width} height={height} preserveAspectRatio="none" />;
}
