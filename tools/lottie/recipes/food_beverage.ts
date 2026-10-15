import type { Part, Rig, Vec } from "../lottie";
import { bob, centerOf, sway } from "../motion";
import type { SvgModel } from "../svg-model";

// "The ice cubes in the drink float up and down slightly as the liquid
// waves and ripples."
const FRAMES = 90;

const LIQUID = 44;
const ICE = [45, 46, 47, 48, 49, 50];

// The liquid's surface sits at y≈40; the ripple fades out below it so the
// bottom of the cup stays put.
const SURFACE_Y = 40;
const RIPPLE_DEPTH = 8;
const RIPPLE_AMP = 0.8;
const RIPPLE_WAVELENGTH = 12;
const RIPPLE_PERIOD = 45;

const ICE_PERIOD = 45;
const ICE_BOB = 0.6;
const ICE_TILT = 6; // degrees

function ripple(x: number, y: number, f: number): Vec {
  const w = Math.min(1, Math.max(0, (SURFACE_Y + RIPPLE_DEPTH - y) / RIPPLE_DEPTH));
  return [0, w * RIPPLE_AMP * Math.sin(2 * Math.PI * (x / RIPPLE_WAVELENGTH - f / RIPPLE_PERIOD))];
}

export default function foodBeverage({ shapes }: SvgModel): Rig {
  // Each cube floats on its own phase so they don't move as a block.
  const cubes: Part[] = ICE.map((index, i) => ({
    name: `ice-${i}`,
    select: [index],
    pivot: centerOf(shapes, [index]),
    offset: bob(ICE_PERIOD, ICE_BOB, i / ICE.length),
    rotation: sway(FRAMES, ICE_TILT, (i * 0.37) % 1),
  }));

  return {
    frames: FRAMES,
    parts: [{ name: "liquid", select: [LIQUID], deform: { fn: ripple, step: 3 } }, ...cubes],
  };
}
