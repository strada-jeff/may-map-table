import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(here, "../..");
/** Figma SVG exports of the "Animated Elements" frames, one per animation. */
export const SOURCE_DIR = resolve(here, "source");
export const OUTPUT_DIR = resolve(ROOT, "src/data/lottie");
