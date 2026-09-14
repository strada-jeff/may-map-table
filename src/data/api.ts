import type { Builder, Category, Location, ModelHome } from "../types/pins";
import categoriesData from "./categories.json";
import buildersData from "./builders.json";
import modelHomesData from "./model-homes.json";
import locationsData from "./locations.json";

const categories = categoriesData satisfies Category[];
const builders = buildersData satisfies Builder[];

// TS widens JSON string fields to `string`, so the `kind`/`categoryId`
// discriminants can't be structurally checked against the literal union
// types here — these are asserted, not validated. Worth a runtime
// validator (e.g. zod) once a CMS is writing this data instead of us.
const modelHomes = modelHomesData as ModelHome[];
const locations = locationsData as Location[];

/**
 * Static JSON today; swap each body for a `fetch()` against the CMS later.
 * Every call site already awaits these, so that migration stays contained
 * to this file.
 */
export async function getCategories(): Promise<Category[]> {
  return categories;
}

export async function getBuilders(): Promise<Builder[]> {
  return builders;
}

export async function getModelHomes(): Promise<ModelHome[]> {
  return modelHomes;
}

export async function getLocations(): Promise<Location[]> {
  return locations;
}
