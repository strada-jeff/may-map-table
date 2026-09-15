import type { Point } from "../routing/types";

/** Shared taxonomy driving both the welcome-screen filter buttons and location pin filtering. */
export type Category = {
  id: string;
  label: string;
  /** Welcome-button glyph for a category that doesn't use the shared color flag (currently just model-homes). */
  icon?: string;
  /** Hex color for the shared flag icon (destination pin + welcome button), e.g. "#E7B78A". */
  color?: string;
};

/** Shared builder lookup, referenced by id from model homes. */
export type Builder = {
  id: string;
  name: string;
  logo?: string;
  /** Short mark shown on the model-home balloon icon, e.g. "CH". */
  abbreviation: string;
};

/**
 * Nudge for a pin's icon, in map units — the same artwork-pixel space as
 * network.svg's anchors, y-down (positive y moves down, matching that
 * space, not screen convention). Scales with zoom like the road does,
 * rather than staying a fixed screen-pixel gap. Anchors are placed right on
 * the road in network.svg for accurate routing/snapping, so the icon needs
 * its own way to move off the road without moving the anchor itself.
 */
type MapOffset = { x: number; y: number };

type BasePin = {
  id: string;
  images: string[];
  address: string;
  /** Destination URL — encoded into a QR code at render time, not stored pre-rendered. */
  directionsUrl: string;
  iconOffset?: MapOffset;
};

export type ModelHome = BasePin & {
  kind: "model-home";
  builderId: Builder["id"];
  name: string;
  collection: string;
  squareFootage: number;
  beds: number;
  baths: number;
  garage: number;
  stories: number;
  priceText: string;
  priceValue: number;
  hours: string;
};

export type Location = BasePin & {
  kind: "location";
  categoryId: Category["id"];
  title: string;
  location: string;
  description: string;
};

export type MapPin = ModelHome | Location;

/** Model homes have no categoryId of their own; this is their category.json id for filtering/display purposes. */
export const MODEL_HOMES_CATEGORY_ID = "model-homes";

export type DestinationPin = MapPin & {
  position: Point;
  /** Model-home only — builder abbreviation overlaid on the balloon. */
  markerLabel?: string;
  /** Location only — resolved from its category's color. */
  markerColor?: string;
  /** Location's categoryId, or MODEL_HOMES_CATEGORY_ID for a model home — normalizes both kinds for filtering. */
  categoryId: Category["id"];
};
