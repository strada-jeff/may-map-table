import cat from "./cat.json";
import catTwo from "./cat-2.json";

/**
 * Static imports, not import.meta.glob — there are two of these, and a
 * hand-maintained map is more debuggable than a dynamic loader for
 * something a kiosk can't surface load errors for. Add a line here when a
 * new animation file shows up in this folder.
 */
export const LOTTIE_ANIMATIONS = {
  cat,
  "cat-2": catTwo,
} as const;

export type LottieAnimationId = keyof typeof LOTTIE_ANIMATIONS;
