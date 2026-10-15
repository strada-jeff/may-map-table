import type { Rig } from "../lottie";
import type { Rgb, SvgModel } from "../svg-model";
import playground from "./playground";

// The map's third playground (base.svg Layer_199) is a light-blue recolor of
// Figma's playground: same art, same swing, different paint.
export const source = "playground";

// Figma playground fill -> Layer_199's fill, read off base.svg by matching
// the two playgrounds' fill sequences. Anything unlisted (the climbing
// holds) keeps its color.
const RECOLOR: Record<string, string> = {
  "#054860": "#4988b5", // frame, rails, chains, seat
  "#4a88b5": "#7ab9e5", // roof
  "#fee1cf": "#f2f0ee", // climbing wall
  "#f2f1ef": "#7ab9e5", // slide
};

export default function playgroundBlue(model: SvgModel): Rig {
  for (const shape of model.shapes) {
    const to = RECOLOR[toHex(shape.fill)];
    if (to) shape.fill = fromHex(to);
  }
  return playground(model);
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`;
}

function fromHex(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
}
