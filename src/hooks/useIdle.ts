import { useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "touchstart", "keydown", "wheel"] as const;

/**
 * isIdle is true on mount, and again after `timeoutMs` passes with no
 * activity. `wake()` lets a caller mark activity manually (e.g. a
 * deliberate dismiss action) in addition to the tracked window events.
 */
export function useIdle(timeoutMs: number): [boolean, () => void] {
  const [isIdle, setIsIdle] = useState(true);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const wake = () => {
      setIsIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsIdle(true), timeoutMs);
    };
    wakeRef.current = wake;

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, wake);
    }

    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, wake);
      }
    };
  }, [timeoutMs]);

  return [isIdle, () => wakeRef.current()];
}
