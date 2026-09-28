import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Transform } from "./mapTransform";

type Size = { width: number; height: number };
type Listener = (transform: Transform) => void;

export type MapControls = {
  /** Current pan/zoom. Read it when needed — don't hold onto it. */
  readonly state: Transform;
  /** The map's viewport element (MapView's wrapper), once mounted. */
  readonly wrapper: HTMLDivElement | null;
  /**
   * Applies a transform immediately, as-is — no clamping, no animation.
   * Programmatic moves animate by calling this per frame (see
   * tweenTransform); user gestures clamp before calling it (see
   * useMapGestures).
   */
  setTransform: (transform: Transform) => void;
  /** Subscribes to every transform change; returns the unsubscribe. */
  onChange: (listener: Listener) => () => void;
  /** Screen (client) px → content (artwork) px. */
  clientToContent: (clientX: number, clientY: number) => { x: number; y: number };
  /** Called by MapView's ref callback with its wrapper + scene elements. */
  attach: (wrapper: HTMLDivElement | null, scene: HTMLDivElement | null) => void;
};

const MapControlsContext = createContext<MapControls | null>(null);

function createMapControls(initialTransform: (wrapperSize: Size) => Transform): MapControls {
  let state: Transform = { x: 0, y: 0, scale: 1 };
  let wrapper: HTMLDivElement | null = null;
  let scene: HTMLDivElement | null = null;
  const listeners = new Set<Listener>();

  const setTransform = (transform: Transform) => {
    state = { ...transform };
    if (scene) scene.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    for (const listener of listeners) listener(state);
  };

  return {
    get state() {
      return state;
    },
    get wrapper() {
      return wrapper;
    },
    setTransform,
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clientToContent: (clientX, clientY) => {
      if (!wrapper) return { x: 0, y: 0 };
      const rect = wrapper.getBoundingClientRect();
      return { x: (clientX - rect.left - state.x) / state.scale, y: (clientY - rect.top - state.y) / state.scale };
    },
    attach: (nextWrapper, nextScene) => {
      const first = !wrapper && nextWrapper;
      wrapper = nextWrapper;
      scene = nextScene;
      // The wrapper's real size is only known once it's in the DOM, so the
      // opening view is set here, synchronously in the commit — before any
      // component's effects run, so everything mounts already seeing it.
      if (first && nextWrapper) {
        const { width, height } = nextWrapper.getBoundingClientRect();
        setTransform(initialTransform({ width, height }));
      }
    },
  };
}

/**
 * Owns the map's pan/zoom transform: one plain mutable object applied
 * straight to MapView's scene div, with change listeners — no React state,
 * so a gesture frame never re-renders anything that doesn't subscribe.
 * Replaces react-zoom-pan-pinch, whose gesture handling (no pan threshold,
 * pinch across *every* touch on screen) didn't survive the IR touch frame;
 * see useMapGestures for the input side.
 */
export function MapControlsProvider({
  initialTransform,
  children,
}: {
  /** The opening view, given the wrapper's measured size. */
  initialTransform: (wrapperSize: Size) => Transform;
  children: ReactNode;
}) {
  const [controls] = useState(() => createMapControls(initialTransform));
  return <MapControlsContext.Provider value={controls}>{children}</MapControlsContext.Provider>;
}

export function useMapControls(): MapControls {
  const context = useContext(MapControlsContext);
  if (!context) throw new Error("useMapControls must be used within a MapControlsProvider");
  return context;
}

/**
 * Calls `listener` with the current transform right away, then on every
 * change. Always sees the latest `listener` without resubscribing.
 */
export function useMapTransformEffect(listener: Listener) {
  const controls = useMapControls();
  const listenerRef = useRef(listener);
  useLayoutEffect(() => {
    listenerRef.current = listener;
  });
  useLayoutEffect(() => {
    listenerRef.current(controls.state);
    return controls.onChange((t) => listenerRef.current(t));
  }, [controls]);
}
