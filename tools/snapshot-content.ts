import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { contentSchema } from "../src/data/schema";

// Saves the CMS's current content as src/data/content.json, the snapshot
// the app falls back to when it can't reach the CMS or anything it cached.
// `npm run build` runs this first, so every build ships a recent fallback:
//
//   npm run snapshot:content                 # VITE_CONTENT_URL from the environment or .env.production
//   npm run snapshot:content -- <url>        # or any endpoint
//
// With --if-available (as the build runs it), no URL or an unreachable CMS
// keeps the current snapshot rather than failing: a build without
// production settings, or a network blip mid-deploy, shouldn't block it.
// Content that fails validation always fails — the live table would be
// rejecting that same content.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "src/data/content.json");

const args = process.argv.slice(2);
const ifAvailable = args.includes("--if-available");
const url = args.find((arg) => !arg.startsWith("--")) ?? loadEnv("production", root).VITE_CONTENT_URL;

function unavailable(reason: string): never {
  if (!ifAvailable) throw new Error(reason);
  console.warn(`Content snapshot not updated (${reason}); keeping src/data/content.json.`);
  process.exit(0);
}

if (!url) unavailable("no URL: pass one, or set VITE_CONTENT_URL in the environment or .env.production");

console.log(`Fetching ${url}`);
let body: unknown;
try {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  body = await response.json();
} catch (error) {
  unavailable(`${url} unreachable: ${error instanceof Error ? error.message : error}`);
}

// Validated like the app does, so a snapshot that would break it never lands.
const content = contentSchema.parse(body);
writeFileSync(OUT, `${JSON.stringify(content, null, 2)}\n`);
console.log(
  `  wrote src/data/content.json — ${content.modelHomes.length} model homes, ` +
    `${content.locations.length} locations, ${content.builders.length} builders, ` +
    `${content.categories.length} categories`,
);
