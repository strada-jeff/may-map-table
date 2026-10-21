import { useTap } from "../hooks/useTap";

/**
 * Temporary dev-only way into debug on the kiosk, which has no address bar
 * for ?debug=1. Shown while CONFIG.debug.showEntryButton is on; above the
 * welcome overlay so it works from any screen.
 */
export default function DebugEntryButton({ onEnter }: { onEnter: () => void }) {
  const tap = useTap(onEnter);
  return (
    <button
      type="button"
      className="debug-entry-button pointer-events-auto absolute right-12 top-12 z-[100] rounded-2xl bg-black/50 px-8 py-4 font-mono text-[32px] text-white"
      {...tap}
    >
      Debug
    </button>
  );
}
