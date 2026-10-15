import { DEBUG_MODES, type DebugMode } from "../hooks/useDebugMode";
import { useTap } from "../hooks/useTap";

const LABELS: Record<DebugMode, string> = {
  network: "Network",
  points: "Find points",
  touch: "Touch",
  lottie: "Lottie",
};

type Props = {
  mode: DebugMode | null;
  onMode: (mode: DebugMode | null) => void;
  showNetwork: boolean;
  onShowNetwork: (show: boolean) => void;
};

/**
 * Always on screen in debug, so modes can be switched on the table without
 * touching the URL. Tapping the active mode turns it off again (back to the
 * bare app). The network toggle layers the road graph over the other modes.
 */
export default function DebugSwitcher({ mode, onMode, showNetwork, onShowNetwork }: Props) {
  return (
    <div className="debug-switcher pointer-events-auto absolute bottom-12 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-4 rounded-3xl bg-black/80 px-6 py-4 font-mono text-[32px] text-white">
      <span className="debug-switcher-label px-4 text-white/60">Debug</span>
      {DEBUG_MODES.map((m) => (
        <DebugSwitcherButton
          key={m}
          label={LABELS[m]}
          selected={mode === m}
          onTap={() => onMode(mode === m ? null : m)}
        />
      ))}
      {(mode === "points" || mode === "touch") && (
        <>
          <span className="debug-switcher-divider h-12 w-[2px] bg-white/30" />
          <DebugSwitcherButton
            label={showNetwork ? "Network on" : "Network off"}
            selected={showNetwork}
            onTap={() => onShowNetwork(!showNetwork)}
          />
        </>
      )}
    </div>
  );
}

function DebugSwitcherButton({ label, selected, onTap }: { label: string; selected: boolean; onTap: () => void }) {
  const tap = useTap(onTap);
  return (
    <button
      type="button"
      className={`debug-switcher-button rounded-2xl px-8 py-4 ${selected ? "bg-[#FACC15] font-bold text-black" : "bg-white/20"}`}
      {...tap}
    >
      {label}
    </button>
  );
}
