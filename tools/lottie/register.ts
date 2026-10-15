import { Resvg } from "@resvg/resvg-js";
import { onlyGroup, paintedBounds, type Box } from "./artwork";
import type { SvgModel } from "./svg-model";

/**
 * Where a Figma "Animated Elements" frame lands on the map. The map art in
 * base.svg was laid out in Illustrator at its own scale (the Figma comps are
 * ~0.85-1.2x off), and some pieces are rotated to follow a road (Car-3
 * drives up a diagonal) with the transform baked into the path data — so
 * there's nothing to read back. Instead: rasterize both silhouettes and
 * search for the similarity transform (uniform scale, rotation, optional
 * mirror) that best overlaps them.
 *
 *   map = cBase + R(θ) · S(k, mirror) · (frame - cFrame)
 */
export type Registration = {
  scale: number;
  rotation: number; // degrees, clockwise (CSS rotate())
  mirror: boolean;
  /** Intersection-over-union of the two silhouettes at the best fit; <0.85 is worth a look. */
  iou: number;
  frameCentroid: [number, number];
  mapCentroid: [number, number];
  mapBox: Box;
};

const RES = 4; // raster px per map unit

type Mask = { data: Uint8Array; width: number; height: number };

export async function register(baseSvg: string, artworkId: string, model: SvgModel): Promise<Registration> {
  const isolated = onlyGroup(baseSvg, artworkId);
  const mapBox = await paintedBounds(isolated, RES);
  const baseMask = renderMask(cropTo(isolated, mapBox), RES);

  const frameSvg = silhouette(model);
  const frameMask = renderMask(frameSvg, RES);

  const scale = Math.sqrt(area(baseMask) / area(frameMask)); // both at RES px/unit
  const cb = centroid(baseMask);
  const cf = centroid(frameMask);

  // Coarse sweep, then refine around the winner.
  let best = { iou: -1, rotation: 0, mirror: false, scale };
  for (const mirror of [false, true]) {
    for (let r = 0; r < 360; r += 3) {
      const iou = overlap(baseMask, cb, frameMask, cf, scale, r, mirror);
      if (iou > best.iou) best = { iou, rotation: r, mirror, scale };
    }
  }
  for (let r = best.rotation - 3; r <= best.rotation + 3; r += 0.25) {
    for (let s = best.scale * 0.96; s <= best.scale * 1.04; s += best.scale * 0.005) {
      const iou = overlap(baseMask, cb, frameMask, cf, s, r, best.mirror);
      if (iou > best.iou) best = { ...best, iou, rotation: r, scale: s };
    }
  }

  return {
    scale: best.scale,
    rotation: ((best.rotation % 360) + 360) % 360,
    mirror: best.mirror,
    iou: best.iou,
    frameCentroid: [cf[0] / RES, cf[1] / RES],
    mapCentroid: [mapBox.x + cb[0] / RES, mapBox.y + cb[1] / RES],
    mapBox,
  };
}

/** CSS matrix() taking Lottie comp pixels (frame + `pad` margin) to map units. */
export function compToMapMatrix(reg: Registration, pad: number): number[] {
  const t = (reg.rotation * Math.PI) / 180;
  const sx = reg.scale * (reg.mirror ? -1 : 1);
  const a = Math.cos(t) * sx;
  const b = Math.sin(t) * sx;
  const c = -Math.sin(t) * reg.scale;
  const d = Math.cos(t) * reg.scale;
  const ox = pad + reg.frameCentroid[0];
  const oy = pad + reg.frameCentroid[1];
  const e = reg.mapCentroid[0] - (a * ox + c * oy);
  const f = reg.mapCentroid[1] - (b * ox + d * oy);
  return [a, b, c, d, e, f].map((n) => Math.round(n * 10000) / 10000);
}

function silhouette(model: SvgModel): string {
  const paths = model.shapes
    .map((s) =>
      s.stroke
        ? `<path d="${s.path.pathData}" fill="none" stroke="#000" stroke-width="${s.stroke.width}" stroke-linecap="${s.stroke.cap}"/>`
        : `<path d="${s.path.pathData}" fill-rule="${s.evenOdd ? "evenodd" : "nonzero"}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.width}" height="${model.height}" viewBox="0 0 ${model.width} ${model.height}">${paths}</svg>`;
}

function cropTo(svg: string, box: Box): string {
  return svg
    .replace(/viewBox="[^"]*"/, `viewBox="${box.x} ${box.y} ${box.width} ${box.height}"`)
    .replace(/ width="\d+(\.\d+)?" height="\d+(\.\d+)?"/, ` width="${box.width}" height="${box.height}"`);
}

function renderMask(svg: string, zoom: number): Mask {
  const img = new Resvg(svg, { fitTo: { mode: "zoom", value: zoom }, background: "rgba(0,0,0,0)" }).render();
  const rgba = img.pixels;
  const data = new Uint8Array(img.width * img.height);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3] > 127 ? 1 : 0;
  return { data, width: img.width, height: img.height };
}

function area(m: Mask): number {
  let n = 0;
  for (const v of m.data) n += v;
  return n;
}

function centroid(m: Mask): [number, number] {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      if (m.data[y * m.width + x]) {
        sx += x + 0.5;
        sy += y + 0.5;
        n++;
      }
    }
  }
  return [sx / n, sy / n];
}

/**
 * IoU of the base mask against the frame mask placed by the candidate
 * transform, sampled over the base mask's grid (inverse-mapping each pixel
 * into frame space). Frame pixels that land outside the base crop count as
 * union only via the area term.
 */
function overlap(
  base: Mask,
  cb: [number, number],
  frame: Mask,
  cf: [number, number],
  scale: number,
  rotationDeg: number,
  mirror: boolean,
): number {
  const t = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const inv = 1 / scale;
  let inter = 0;
  for (let y = 0; y < base.height; y++) {
    for (let x = 0; x < base.width; x++) {
      if (!base.data[y * base.width + x]) continue;
      const dx = x + 0.5 - cb[0];
      const dy = y + 0.5 - cb[1];
      // R(-θ), then S⁻¹
      let fx = (cos * dx + sin * dy) * inv;
      const fy = (-sin * dx + cos * dy) * inv;
      if (mirror) fx = -fx;
      const px = Math.floor(cf[0] + fx);
      const py = Math.floor(cf[1] + fy);
      if (px >= 0 && py >= 0 && px < frame.width && py < frame.height && frame.data[py * frame.width + px]) inter++;
    }
  }
  const frameArea = area(frame) * scale * scale;
  return inter / (area(base) + frameArea - inter);
}
