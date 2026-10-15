import { Resvg } from "@resvg/resvg-js";
import { DOMParser } from "linkedom";
import sharp from "sharp";

/**
 * base.svg surgery shared by build-artwork (drop the art Lottie scenery
 * replaces before rasterizing tiles) and build-lottie (find where that art
 * sat, so the Lottie can be laid exactly over the hole it leaves).
 * base.svg itself is never edited — a fresh export from the designer keeps
 * working.
 */

// Non-rendering containers: kept when isolating a group, since the group's
// clip paths/masks/gradients live in them.
const NON_RENDERING = new Set(["defs", "clippath", "mask", "lineargradient", "radialgradient", "style", "symbol", "pattern", "filter"]);

export function parseSvg(source: string) {
  return new DOMParser().parseFromString(source, "image/svg+xml");
}

/** base.svg with the given group ids removed. Throws if any id is missing, so a renamed layer can't silently stop being hidden. */
export function withoutGroups(source: string, ids: string[]): string {
  const doc = parseSvg(source);
  for (const id of ids) {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`base.svg has no element with id "${id}"`);
    el.remove();
  }
  return doc.toString();
}

/** base.svg with everything except `id` (and its ancestors' non-rendering defs) removed. */
export function onlyGroup(source: string, id: string): string {
  const doc = parseSvg(source);
  const target = doc.getElementById(id);
  if (!target) throw new Error(`base.svg has no element with id "${id}"`);
  for (let node: Element = target; node.parentElement; node = node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling !== node && !NON_RENDERING.has(sibling.tagName.toLowerCase())) sibling.remove();
    }
  }
  return doc.toString();
}

export type Box = { x: number; y: number; width: number; height: number };

/**
 * Pixel bounds of everything an SVG paints, in its own user units —
 * rendered rather than computed from path geometry, so clip paths and
 * masks are honored exactly. `scale` sets the precision (1/scale units).
 */
export async function paintedBounds(svg: string, scale = 4): Promise<Box> {
  const rendered = new Resvg(svg, { fitTo: { mode: "zoom", value: scale }, background: "rgba(0,0,0,0)" }).render();
  const { info } = await sharp(rendered.asPng())
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .toBuffer({ resolveWithObject: true });
  return {
    x: -(info.trimOffsetLeft ?? 0) / scale,
    y: -(info.trimOffsetTop ?? 0) / scale,
    width: info.width / scale,
    height: info.height / scale,
  };
}
