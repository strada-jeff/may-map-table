import { useTap } from "../hooks/useTap";

/**
 * The way into debug, shown only when the page was opened with ?debug
 * (see useDebugMode); on the kiosk, via its launch URL. Above the
 * welcome overlay so it works from any screen. Left of the right-edge
 * column, clear of RotateControl at its top.
 */
export default function DebugEntryButton({ onEnter }: { onEnter: () => void }) {
  const tap = useTap(onEnter);
  return (
    <button
      type="button"
      className="debug-entry-button pointer-events-auto absolute right-[180px] top-12 z-[100] rounded-2xl bg-black/50 px-8 py-4 font-mono text-[32px] text-white"
      {...tap}
    >
      Debug
    </button>
  );
}
