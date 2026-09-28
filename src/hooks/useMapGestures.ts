import { useEffect, useRef, type RefObject } from "react";
import { useGesture } from "@use-gesture/react";
import { useMapControls } from "./MapControlsContext";
import { clampScale, clampTransform, type Transform } from "./mapTransform";
import { useTouchSettings } from "./touchSettings";
import { logGesture } from "./gestureLog";

/** Per-frame decay of the inertia glide's velocity (at 60fps). */
const INERTIA_FRICTION = 0.92;
/** The glide stops once slower than this, px/ms. */
const INERTIA_MIN_SPEED = 0.02;
/** Mouse wheel zoom rate — desk testing only, the kiosk has no wheel. */
const WHEEL_ZOOM_SPEED = 0.002;
/** A pinch settling after release stops once this close to where the fingers left off, px. */
const SETTLE_EPSILON_PX = 0.5;
/** A pinch starting this soon after the last one ended is logged as a likely IR finger-ID drop. */
const PINCH_RESTART_MS = 250;

type PinchMemo = {
  /** Content point under the pinch midpoint at the start, kept pinned under it. */
  anchor: { x: number; y: number };
  startScale: number;
  /** Scale when the pinch began (startScale re-baselines at zoom limits), for the debug log. */
  initialScale: number;
  /** Finger distance zoom is measured against (moves once, at the dead zone's edge). */
  baseDistance: number;
  zooming: boolean;
  /** Smoothed finger distance and midpoint. */
  distance: number;
  x: number;
  y: number;
  /** The latest raw finger distance and midpoint, which the smoothed ones ease toward. */
  target: { distance: number; x: number; y: number };
  /** timeStamp of the last update, for time-based smoothing. */
  t: number;
  startedAt: number;
};

/** Share of the remaining gap to close after `dt` ms, for a smoothing half-life. */
const easeFactor = (dt: number, halfLifeMs: number) =>
  halfLifeMs <= 0 ? 1 : 1 - Math.pow(0.5, dt / halfLifeMs);

function easeToward(pinch: PinchMemo, k: number) {
  pinch.distance += (pinch.target.distance - pinch.distance) * k;
  pinch.x += (pinch.target.x - pinch.x) * k;
  pinch.y += (pinch.target.y - pinch.y) * k;
}

/**
 * Pan, pinch and inertia for the map, tuned on the IR touch frame in
 * ~/Sandbox/touch-poc. use-gesture only interprets input — which pointers,
 * how far, how fast; everything that moves the map is here, through
 * MapControls.
 *
 * - One-finger pan waits for panThresholdPx of travel, so tap
 *   jitter on a pin never moves the map (and so never trips usePinClick's
 *   map-drift check).
 * - Pinch tracks exactly the two pointers that started it (not every touch
 *   on screen), holds zoom inside a dead zone, and smooths the IR frame's
 *   frame-to-frame jitter. Smoothing is by elapsed time, not per event, so
 *   it behaves the same whatever rate the frame reports at; on release the
 *   map eases the rest of the way to where the fingers left off.
 * - A finger still down when its pinch ends has to travel a fresh pan
 *   threshold before it pans, and never flicks a glide: its velocity is
 *   pinch motion, not a flick.
 * - Scale is clamped *before* positioning: placing the anchor at an
 *   out-of-range scale and clamping only afterwards slides the map.
 */
export function useMapGestures(wrapperRef: RefObject<HTMLDivElement | null>) {
  const controls = useMapControls();
  // CONFIG.touch, unless ?debug=touch is retuning it live.
  const touch = useTouchSettings();
  /** rAF id of the glide or pinch settle in flight. */
  const motion = useRef<number | null>(null);
  const moving = useRef(false);
  const downIds = useRef(new Set<number>());
  /**
   * Pointers that have been part of a pinch, until they lift. The value is
   * where the finger was when it went back to one-finger dragging (null
   * until then) — the origin of its fresh pan threshold.
   */
  const pinchPointers = useRef(new Map<number, readonly [number, number] | null>());
  const lastPinchEnd = useRef(-Infinity);

  const wrapperSize = () => {
    const el = wrapperRef.current!;
    return { width: el.clientWidth, height: el.clientHeight };
  };
  const apply = (t: Transform) => controls.setTransform(clampTransform(t, wrapperSize()));

  const stopMotion = () => {
    if (motion.current !== null) cancelAnimationFrame(motion.current);
    motion.current = null;
  };

  /** Runs `frame` every animation frame until it returns false. */
  const animate = (frame: (dt: number) => boolean) => {
    stopMotion();
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      moving.current = true;
      const more = frame(dt);
      moving.current = false;
      motion.current = more ? requestAnimationFrame(step) : null;
    };
    motion.current = requestAnimationFrame(step);
  };

  const startGlide = (vx: number, vy: number) =>
    animate((dt) => {
      const decay = Math.pow(INERTIA_FRICTION, dt / 16.67);
      vx *= decay;
      vy *= decay;
      if (Math.hypot(vx, vy) < INERTIA_MIN_SPEED) return false;
      const t = controls.state;
      apply({ ...t, x: t.x + vx * dt, y: t.y + vy * dt });
      return true;
    });

  const placePinch = (pinch: PinchMemo) => {
    const { deadZonePx } = touch.pinch;
    // Past the dead zone, re-baseline at its edge so zoom picks up from
    // the current scale instead of jumping.
    const spread = pinch.distance - pinch.baseDistance;
    if (!pinch.zooming && Math.abs(spread) > deadZonePx) {
      pinch.zooming = true;
      pinch.baseDistance += Math.sign(spread) * deadZonePx;
    }
    const wanted = pinch.zooming
      ? pinch.startScale * (pinch.distance / pinch.baseDistance)
      : pinch.startScale;
    const scale = clampScale(wanted);
    if (scale !== wanted) {
      // At a zoom limit: re-baseline so reversing the pinch responds
      // straight away instead of first retracing the over-pinch.
      pinch.startScale = scale;
      pinch.baseDistance = pinch.distance;
    }
    apply({ scale, x: pinch.x - pinch.anchor.x * scale, y: pinch.y - pinch.anchor.y * scale });
  };

  /** After release, ease the smoothed pinch the rest of the way to where the fingers left off. */
  const settlePinch = (pinch: PinchMemo) =>
    animate((dt) => {
      easeToward(pinch, easeFactor(dt, touch.pinch.smoothingMs));
      const { target } = pinch;
      const done =
        Math.abs(target.distance - pinch.distance) < SETTLE_EPSILON_PX &&
        Math.hypot(target.x - pinch.x, target.y - pinch.y) < SETTLE_EPSILON_PX;
      if (done) Object.assign(pinch, target);
      placePinch(pinch);
      return !done;
    });

  const release = (pointerId: number) => {
    downIds.current.delete(pointerId);
    // After use-gesture's own pointerup handling (drag's last event
    // still needs to see this pointer was in a pinch).
    window.setTimeout(() => pinchPointers.current.delete(pointerId), 0);
  };

  // Any other transform change — a programmatic tween (pin details, route
  // fit, idle reset), the zoom slider, a new drag — takes over from a glide
  // or settle in flight instead of fighting it frame by frame.
  useEffect(
    () =>
      controls.onChange(() => {
        if (!moving.current) stopMotion();
      }),
    [controls],
  );
  useEffect(() => stopMotion, []);

  useGesture(
    {
      onPointerDown: ({ event }) => {
        stopMotion();
        downIds.current.add(event.pointerId);
      },
      onPointerUp: ({ event }) => release(event.pointerId),
      onPointerCancel: ({ event }) => release(event.pointerId),
      onDrag: ({
        event,
        xy: [x, y],
        delta: [dx, dy],
        pinching,
        last,
        velocity: [vx, vy],
        direction: [dirX, dirY],
      }) => {
        if (pinching) return;
        const id = "pointerId" in event ? event.pointerId : null;
        if (id !== null && pinchPointers.current.has(id)) {
          // Left down after its pinch ended. Hold until it's travelled a
          // fresh pan threshold from here — the pinch already carried it
          // past use-gesture's own, so it would otherwise pan (at a
          // different feel from the smoothed pinch) the moment it moved.
          let from = pinchPointers.current.get(id);
          if (!from) {
            from = [x, y];
            pinchPointers.current.set(id, from);
            if (!last) logGesture("pan-held", () => "finger left down after a pinch");
          }
          if (Math.hypot(x - from[0], y - from[1]) < touch.panThresholdPx) {
            if (last) logGesture("glide-skipped", () => "finger lifted after a pinch");
            return;
          }
          pinchPointers.current.delete(id);
          logGesture("pan-resumed", () => `moved ${touch.panThresholdPx}px after the pinch`);
        }
        const t = controls.state;
        apply({ ...t, x: t.x + dx, y: t.y + dy });
        const strength = touch.inertiaStrength;
        if (last && strength > 0) {
          startGlide(vx * dirX * strength, vy * dirY * strength);
          logGesture("glide", () => `${(Math.hypot(vx, vy) * strength).toFixed(2)}px/ms`);
        }
      },
      onPinch: ({ origin: [ox, oy], da: [distance], first, last, memo, event, timeStamp }) => {
        const rect = wrapperRef.current!.getBoundingClientRect();
        const px = ox - rect.left;
        const py = oy - rect.top;

        if (first) {
          stopMotion();
          const t = controls.state;
          const pinch: PinchMemo = {
            anchor: { x: (px - t.x) / t.scale, y: (py - t.y) / t.scale },
            startScale: t.scale,
            initialScale: t.scale,
            baseDistance: distance,
            zooming: touch.pinch.deadZonePx <= 0,
            distance,
            x: px,
            y: py,
            target: { distance, x: px, y: py },
            t: timeStamp,
            startedAt: timeStamp,
          };
          for (const id of downIds.current) pinchPointers.current.set(id, null);
          if ("pointerId" in event) pinchPointers.current.set(event.pointerId, null);
          const gap = timeStamp - lastPinchEnd.current;
          logGesture(
            "pinch-start",
            () =>
              gap < PINCH_RESTART_MS
                ? `restarted ${Math.round(gap)}ms after the last one ended (finger ID dropped?)`
                : `${downIds.current.size} fingers down`,
            gap < PINCH_RESTART_MS,
          );
          placePinch(pinch);
          return pinch;
        }

        const pinch: PinchMemo = memo;
        if (last) {
          // use-gesture's last pinch event repeats the previous values (a
          // lifted finger has no position), so there's nothing new to take
          // in — just let the smoothing finish catching up.
          lastPinchEnd.current = timeStamp;
          logGesture(
            "pinch-end",
            () =>
              `${Math.round(timeStamp - pinch.startedAt)}ms, zoom ×${(controls.state.scale / pinch.initialScale).toFixed(2)}` +
              (pinch.zooming ? "" : " (held in dead zone)"),
          );
          settlePinch(pinch);
          return pinch;
        }

        pinch.target = { distance, x: px, y: py };
        easeToward(pinch, easeFactor(timeStamp - pinch.t, touch.pinch.smoothingMs));
        pinch.t = timeStamp;
        placePinch(pinch);
        return pinch;
      },
      onWheel: ({ event, delta: [, dy] }) => {
        stopMotion();
        const rect = wrapperRef.current!.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const t = controls.state;
        const scale = clampScale(t.scale * Math.exp(-dy * WHEEL_ZOOM_SPEED));
        apply({
          scale,
          x: px - ((px - t.x) / t.scale) * scale,
          y: py - ((py - t.y) / t.scale) * scale,
        });
      },
    },
    {
      target: wrapperRef,
      eventOptions: { passive: false },
      drag: { threshold: touch.panThresholdPx },
      pinch: { pinchOnWheel: false },
    },
  );
}
