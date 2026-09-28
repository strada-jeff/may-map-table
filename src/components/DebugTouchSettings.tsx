import { useState } from "react";
import { CONFIG } from "../config";
import {
  resetTouchSettings,
  setTouchSettings,
  useTouchSettings,
  type TouchSettings,
} from "../hooks/touchSettings";
import { useTap } from "../hooks/useTap";

type Field = {
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** What the knob does, shown under it (toggled by the panel's Help button). */
  help: string;
  get: (s: TouchSettings) => number;
  set: (s: TouchSettings, value: number) => TouchSettings;
};

const top = (key: "panThresholdPx" | "inertiaStrength") => ({
  get: (s: TouchSettings) => s[key],
  set: (s: TouchSettings, v: number) => ({ ...s, [key]: v }),
});
const pinch = (key: keyof TouchSettings["pinch"]) => ({
  get: (s: TouchSettings) => s.pinch[key],
  set: (s: TouchSettings, v: number) => ({ ...s, pinch: { ...s.pinch, [key]: v } }),
});
const pinTap = (key: keyof TouchSettings["pinTap"]) => ({
  get: (s: TouchSettings) => s.pinTap[key],
  set: (s: TouchSettings, v: number) => ({ ...s, pinTap: { ...s.pinTap, [key]: v } }),
});

// Ranges from ~/Sandbox/touch-poc's settings panel.
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Pin tap",
    fields: [
      {
        label: "Max travel",
        min: 4,
        max: 80,
        step: 2,
        unit: "px",
        help: "How far a finger can move during a touch and still count as a tap. Beyond this it's a drag.",
        ...pinTap("maxMovePx"),
      },
      {
        label: "Min contact",
        min: 0,
        max: 120,
        step: 5,
        unit: "ms",
        help: "Touches shorter than this are ignored — the IR frame produces brief ghost touches.",
        ...pinTap("minContactMs"),
      },
      {
        label: "Map drift slack",
        min: 0,
        max: 60,
        step: 2,
        unit: "px",
        help: "A tap is rejected if the map moved more than the finger did, plus this. Catches a pinch where the finger on the pin stays still.",
        ...pinTap("mapDriftSlackPx"),
      },
      {
        label: "Max zoom change",
        min: 0,
        max: 0.1,
        step: 0.005,
        unit: "",
        help: "A tap is rejected if the zoom changed by more than this during it (0.01 = 1%).",
        ...pinTap("maxScaleChange"),
      },
    ],
  },
  {
    title: "Pan",
    fields: [
      {
        label: "Pan threshold",
        min: 0,
        max: 80,
        step: 2,
        unit: "px",
        help: "How far one finger must move before the map pans, so tap wobble never moves it. Keep ≥ max travel, or taps nudge the map.",
        ...top("panThresholdPx"),
      },
      {
        label: "Inertia strength",
        min: 0,
        max: 3,
        step: 0.1,
        unit: "×",
        help: "How far the map keeps gliding after a flick. 0 turns the glide off.",
        ...top("inertiaStrength"),
      },
    ],
  },
  {
    title: "Pinch",
    fields: [
      {
        label: "Zoom dead zone",
        min: 0,
        max: 120,
        step: 4,
        unit: "px",
        help: "How much the gap between two fingers must change before zooming starts, so resting fingers hold the zoom steady.",
        ...pinch("deadZonePx"),
      },
      {
        label: "Smoothing",
        min: 0,
        max: 120,
        step: 5,
        unit: "ms",
        help: "Evens out the IR frame's jumps in finger position: how long the map takes to close half the gap to the fingers. 0 = raw; higher = steadier but laggier.",
        ...pinch("smoothingMs"),
      },
    ],
  },
];

/** The settings as a `touch: { ... }` block to paste over CONFIG.touch. */
function toConfig(value: unknown, key = "touch", indent = ""): string {
  if (typeof value !== "object" || value === null) return `${indent}${key}: ${String(value)},`;
  const inner = Object.entries(value).map(([k, v]) => toConfig(v, k, `${indent}  `));
  return [`${indent}${key}: {`, ...inner, `${indent}},`].join("\n");
}

/**
 * `?debug=touch` live tuning of CONFIG.touch — the same knobs as
 * touch-poc's panel, applied straight to the real gesture and pin-tap code
 * (via the touchSettings store). Values reset on reload; "Copy as config"
 * is how a tuned set makes it into config.ts.
 */
export default function DebugTouchSettings() {
  const settings = useTouchSettings();
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const configText = toConfig(settings);

  const helpTap = useTap(() => setShowHelp((show) => !show));
  const resetTap = useTap(() => {
    resetTouchSettings();
    setCopyStatus(null);
  });
  const copyTap = useTap(() => {
    console.log(`[debug-touch]\n${configText}`);
    // Clipboard needs a secure context — absent when the kiosk loads the dev
    // server over plain http on the LAN, so the block is shown on screen too.
    if (!navigator.clipboard) return setCopyStatus("failed");
    navigator.clipboard.writeText(configText).then(
      () => setCopyStatus("copied"),
      () => setCopyStatus("failed"),
    );
  });

  return (
    <div className="debug-touch-settings pointer-events-auto absolute left-12 top-12 z-[100] w-[960px] rounded-3xl bg-black/80 px-10 py-8 font-mono text-[28px] leading-snug text-white">
      <div className="debug-touch-settings-header flex items-center gap-6">
        <span className="debug-touch-settings-title grow font-bold">Touch tuning</span>
        <button
          type="button"
          className={`debug-touch-settings-help-toggle rounded-xl px-6 py-3 ${showHelp ? "bg-[#FACC15] text-black" : "bg-white/20"}`}
          {...helpTap}
        >
          Help
        </button>
        <button type="button" className="debug-touch-settings-reset rounded-xl bg-white/20 px-6 py-3" {...resetTap}>
          Reset
        </button>
        <button type="button" className="debug-touch-settings-copy rounded-xl bg-white/20 px-6 py-3" {...copyTap}>
          Copy as config
        </button>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="debug-touch-settings-group mt-6">
          <h2 className="debug-touch-settings-group-title text-white/60">{group.title}</h2>
          {group.fields.map((field) => {
            const value = field.get(settings);
            const configValue = field.get(CONFIG.touch);
            return (
              <label key={field.label} className="debug-touch-slider mt-2 block">
                <span className="debug-touch-slider-label flex gap-4">
                  <span className="debug-touch-slider-name grow">{field.label}</span>
                  {value !== configValue && (
                    <span className="debug-touch-slider-config text-white/50">
                      config {configValue}
                      {field.unit}
                    </span>
                  )}
                  <span className={`debug-touch-slider-value ${value !== configValue ? "text-[#FACC15]" : ""}`}>
                    {value}
                    {field.unit}
                  </span>
                </span>
                {showHelp && (
                  <span className="debug-touch-slider-help block text-[22px] leading-snug text-white/60">
                    {field.help}
                  </span>
                )}
                <input
                  type="range"
                  className="debug-touch-slider-input"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={value}
                  onChange={(e) => {
                    setTouchSettings(field.set(settings, Number(e.target.value)));
                    setCopyStatus(null);
                  }}
                />
              </label>
            );
          })}
        </section>
      ))}

      {copyStatus === "copied" && (
        <p className="debug-touch-settings-status mt-6 text-[#4ADE80]">Copied — paste over CONFIG.touch</p>
      )}
      {copyStatus === "failed" && (
        <>
          <p className="debug-touch-settings-status mt-6 text-[#FACC15]">No clipboard here (http?) — also logged to console:</p>
          <pre className="debug-touch-settings-config mt-3 text-[24px] text-white/80">{configText}</pre>
        </>
      )}
    </div>
  );
}
