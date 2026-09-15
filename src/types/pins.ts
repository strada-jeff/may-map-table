/** Shared taxonomy driving both the welcome-screen filter buttons and location pin filtering. */
export type Category = {
  id: string;
  label: string;
  icon: string;
};

/** Shared builder lookup, referenced by id from model homes. */
export type Builder = {
  id: string;
  name: string;
  logo?: string;
};

type BasePin = {
  id: string;
  images: string[];
  address: string;
  /** Destination URL — encoded into a QR code at render time, not stored pre-rendered. */
  directionsUrl: string;
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
  icon: string;
};

export type MapPin = ModelHome | Location;
