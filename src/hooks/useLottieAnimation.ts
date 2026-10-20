import { useEffect, useRef, type RefObject } from "react";
// Light build: no AE expressions interpreter (this project's animations
// don't use them), which also drops the `eval()` the full build ships for it.
import lottie, { type AnimationItem } from "lottie-web/build/player/lottie_light";
import { LOTTIE_ANIMATIONS, type LottieAnimationId } from "../data/lottie";
import { isLottiePaused, subscribeLottiePaused, useDisabledByDebug } from "./lottiePlayback";

type Options = {
  /** False pauses it regardless of visibility (e.g. under a faded-out overlay). Default true. */
  active?: boolean;
  /** Runs once the animation's SVG exists — for adding runtime content into its layers. */
  onLoad?: (container: HTMLElement) => void;
};

/**
 * Plays a looping Lottie into `containerRef`'s element.
 *
 * - Starts at a random frame, so the map's ~15 identical flags (and any
 *   repeated scenery) don't move in lockstep.
 * - Pauses while the element is offscreen. There can be ~50 of these on
 *   the map at once and the kiosk's NUC has integrated graphics; an
 *   IntersectionObserver sees through the map's pan/zoom CSS transform for
 *   free, so no viewport math is needed here.
 * - Pauses while the map moves (see lottiePlayback).
 * - Renders only at the files' authored 30fps, not every display frame:
 *   lottie-web's default interpolates in-between frames at 60fps, doubling
 *   the update and repaint work for motion that's mostly stop-motion
 *   anyway.
 * - Isn't loaded at all while ?debug=lottie has switched its id off.
 */
export function useLottieAnimation(
  containerRef: RefObject<HTMLElement | null>,
  id: LottieAnimationId,
  { active = true, onLoad }: Options = {},
) {
  const disabled = useDisabledByDebug().has(id);
  const animationRef = useRef<AnimationItem | null>(null);
  const onScreenRef = useRef(false);
  const activeRef = useRef(active);
  const onLoadRef = useRef(onLoad);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  // Plays only when on screen, wanted by the caller, and not globally paused.
  const sync = () => {
    const animation = animationRef.current;
    if (!animation) return;
    if (onScreenRef.current && activeRef.current && !isLottiePaused()) animation.play();
    else animation.pause();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;
    const animation = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: true,
      autoplay: false,
      animationData: LOTTIE_ANIMATIONS[id],
    });
    animation.setSubframe(false);
    animationRef.current = animation;
    animation.goToAndStop(Math.floor(Math.random() * animation.totalFrames), true);
    const loaded = () => onLoadRef.current?.(container);
    if (animation.isLoaded) loaded();
    else animation.addEventListener("DOMLoaded", loaded);

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreenRef.current = entry.isIntersecting;
        sync();
      },
      { rootMargin: "200px" },
    );
    observer.observe(container);
    const unsubscribe = subscribeLottiePaused(sync);

    return () => {
      unsubscribe();
      observer.disconnect();
      animation.destroy();
      animationRef.current = null;
    };
  }, [containerRef, id, disabled]);

  useEffect(() => {
    activeRef.current = active;
    sync();
  }, [active]);
}
