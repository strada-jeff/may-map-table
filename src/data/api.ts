import type { Builder, Category, Location, ModelHome } from "../types/pins";
import type { LottieMarkerConfig } from "../types/lottie";
import { contentSchema, type Content, type Copy } from "./schema";
import snapshotData from "./content.json";
import lottieMarkersData from "./lottie-markers.json";

// Lottie markers are placed against the artwork, so they ship with it
// rather than coming from the CMS.
const lottieMarkers = lottieMarkersData as unknown as LottieMarkerConfig[];

/** The CMS's content endpoint; unset, the app runs on the bundled snapshot. */
const CONTENT_URL: string | undefined = import.meta.env.VITE_CONTENT_URL || undefined;
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_KEY = "may-map-table:content";

/**
 * Where content comes from, best first: the CMS, the last copy the CMS sent
 * (so a network drop on a reboot doesn't lose recent edits), then the
 * snapshot built into the app (npm run snapshot:content), which always
 * parses. Every source is validated, so a bad CMS response falls through
 * rather than rendering broken pins.
 */
async function loadContent(): Promise<Content> {
  if (CONTENT_URL) {
    try {
      const content = await fetchContent(CONTENT_URL);
      saveCache(content);
      return content;
    } catch (error) {
      console.error("Content: CMS unavailable, using the last good copy.", error);
    }
  }
  return readCache() ?? contentSchema.parse(snapshotData);
}

async function fetchContent(url: string): Promise<Content> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return contentSchema.parse(await response.json());
}

function readCache(): Content | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? contentSchema.parse(JSON.parse(cached)) : null;
  } catch {
    return null;
  }
}

function saveCache(content: Content): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(content));
  } catch {
    // Storage full or blocked: the snapshot still covers a reboot offline.
  }
}

// Loaded once and shared, so every hook mounting at startup reads the same
// response instead of each fetching its own.
let content: Promise<Content> | null = null;
function getContent(): Promise<Content> {
  content ??= loadContent();
  return content;
}

/**
 * True when the CMS has published changes since this page loaded. The new
 * content is cached first, so a reload picks it up even if the CMS drops
 * out in between. Never throws: an unreachable CMS just means no update.
 */
export async function hasContentUpdate(): Promise<boolean> {
  if (!CONTENT_URL) return false;
  try {
    const [current, latest] = await Promise.all([getContent(), fetchContent(CONTENT_URL)]);
    if (latest.version === current.version) return false;
    saveCache(latest);
    return true;
  } catch {
    return false;
  }
}

export async function getCategories(): Promise<Category[]> {
  return (await getContent()).categories;
}

export async function getBuilders(): Promise<Builder[]> {
  return (await getContent()).builders;
}

export async function getModelHomes(): Promise<ModelHome[]> {
  return (await getContent()).modelHomes;
}

export async function getLocations(): Promise<Location[]> {
  return (await getContent()).locations;
}

export async function getCopy(): Promise<Copy> {
  return (await getContent()).copy;
}

export async function getLottieMarkers(): Promise<LottieMarkerConfig[]> {
  return lottieMarkers;
}
