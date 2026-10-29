import { z } from "zod";
import type { Builder, Category, Location, ModelHome, NumberRange } from "../types/pins";

// Runtime checks for what the CMS sends, each annotated with its type in
// types/pins.ts so the two can't drift: pins.ts stays the source of truth,
// and a schema that stops matching it is a type error here.

const point = z.tuple([z.number(), z.number()]);
const numberRange: z.ZodType<NumberRange> = z.union([z.number(), z.tuple([z.number(), z.number()])]);

const category: z.ZodType<Category> = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const builder: z.ZodType<Builder> = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().optional(),
  abbreviation: z.string(),
  description: z.string().optional(),
});

const basePin = {
  id: z.string(),
  anchor: point,
  images: z.array(z.string()),
  address: z.string(),
  directionsUrl: z.string(),
  iconOffset: z.object({ x: z.number(), y: z.number() }).optional(),
  artwork: z.string().optional(),
};

const modelHome: z.ZodType<ModelHome> = z.object({
  ...basePin,
  kind: z.literal("model-home"),
  builderId: z.string(),
  name: z.string(),
  collection: z.string(),
  squareFootage: numberRange,
  beds: numberRange,
  baths: numberRange,
  garage: numberRange,
  stories: z.number(),
  priceText: z.string(),
  priceValue: z.number(),
  hours: z.string(),
});

const location: z.ZodType<Location> = z.object({
  ...basePin,
  kind: z.literal("location"),
  categoryId: z.string(),
  title: z.string(),
  location: z.string(),
  description: z.string(),
});

/** GET /wp-json/maytable/v1/content (cms/theme/inc/rest.php). */
export const contentSchema = z.object({
  /** Changes whenever any entry does. */
  version: z.string(),
  categories: z.array(category),
  builders: z.array(builder),
  modelHomes: z.array(modelHome),
  locations: z.array(location),
  copy: z.object({
    help: z.object({ heading: z.string(), body: z.string() }),
    signup: z.object({ heading: z.string(), qrValue: z.string() }),
  }),
});

export type Content = z.infer<typeof contentSchema>;
export type Copy = Content["copy"];
