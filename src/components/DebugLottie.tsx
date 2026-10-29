import { useEffect, useRef, useState } from "react";
import lottie, { type AnimationItem } from "lottie-web/build/player/lottie_light";
import { LOTTIE_ANIMATIONS, type LottieAnimationId } from "../data/lottie";
import { setDisabledByDebug, setPausedByDebug, useDisabledByDebug, usePausedByDebug } from "../hooks/lottiePlayback";
import { useTap } from "../hooks/useTap";

/**
 * ?debug=lottie. Always shows a small bar with a frame-rate meter and a
 * switch to pause every Lottie on the map — compare the two on the table to
 * see what the animations cost on the kiosk's hardware. "Animations" lists
 * every animation with an on/off switch each (off = not loaded at all, on
 * the map, pins and CTA alike), to find which one the slow frames come
 * from — "All off" then one back on runs it alone. "Previews" opens
 * every generated Lottie (npm run build:lottie) away from the map: a grid
 * of loops; tap one to expand it with play/pause, a frame scrubber, and a
 * contact strip of frames across its loop — for checking joints and seams
 * at a glance. Measure with the previews closed: they're ~30 more
 * animations of their own.
 */

type LottieData = { w: number; h: number; op: number; fr: number };

const STRIP_FRAMES = 8;
const GRID_HEIGHT = 220;
const DETAIL_HEIGHT = 520;
const STRIP_HEIGHT = 200;

const ids = Object.keys(LOTTIE_ANIMATIONS) as LottieAnimationId[];
const dataOf = (id: LottieAnimationId) => LOTTIE_ANIMATIONS[id] as LottieData;

type Panel = "switches" | "previews";

export default function DebugLottie() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const paused = usePausedByDebug();
  const pauseTap = useTap(() => setPausedByDebug(!paused));
  const togglePanel = (which: Panel) => setPanel((open) => (open === which ? null : which));
  const switchesTap = useTap(() => togglePanel("switches"));
  const previewsTap = useTap(() => togglePanel("previews"));

  // Leaving the mode shouldn't leave the map frozen or missing animations.
  useEffect(
    () => () => {
      setPausedByDebug(false);
      setDisabledByDebug([]);
    },
    [],
  );

  return (
    <>
      <div className="debug-lottie-bar pointer-events-auto absolute left-12 top-12 z-[101] flex items-center gap-6 rounded-3xl bg-black/80 px-8 py-4 font-mono text-[28px] text-white">
        <FrameRateMeter />
        <button
          type="button"
          className={`debug-lottie-pause rounded-xl px-6 py-3 ${paused ? "bg-[#FACC15] text-black" : "bg-white/20"}`}
          {...pauseTap}
        >
          {paused ? "Map animations paused" : "Pause map animations"}
        </button>
        <button
          type="button"
          className={`debug-lottie-switches-toggle rounded-xl px-6 py-3 ${panel === "switches" ? "bg-[#FACC15] text-black" : "bg-white/20"}`}
          {...switchesTap}
        >
          Animations
        </button>
        <button
          type="button"
          className={`debug-lottie-previews-toggle rounded-xl px-6 py-3 ${panel === "previews" ? "bg-[#FACC15] text-black" : "bg-white/20"}`}
          {...previewsTap}
        >
          Previews
        </button>
      </div>
      {panel === "switches" && <LottieSwitches />}
      {panel === "previews" && <LottiePreviews />}
    </>
  );
}

// How often the meter refreshes, and what counts as a dropped frame on a
// 60Hz display (a frame that took over ~1.5 refresh intervals).
const METER_WINDOW_MS = 1000;
const LONG_FRAME_MS = 25;

/**
 * Frames per second and the slowest frame in each one-second window, from
 * requestAnimationFrame timing — includes the browser's style, paint and
 * composite work, which is where the animations' cost lands on the kiosk.
 */
function FrameRateMeter() {
  const [stats, setStats] = useState({ fps: 0, worstMs: 0, longFrames: 0 });

  useEffect(() => {
    let raf = 0;
    let windowStart = performance.now();
    let last = windowStart;
    let frames = 0;
    let worst = 0;
    let long = 0;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      frames++;
      worst = Math.max(worst, delta);
      if (delta > LONG_FRAME_MS) long++;
      if (now - windowStart >= METER_WINDOW_MS) {
        setStats({ fps: Math.round((frames * 1000) / (now - windowStart)), worstMs: Math.round(worst), longFrames: long });
        windowStart = now;
        frames = 0;
        worst = 0;
        long = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className="debug-lottie-meter whitespace-nowrap">
      <span className="debug-lottie-meter-fps">{stats.fps} fps</span>
      <span className="debug-lottie-meter-detail text-white/60">
        {" "}
        · worst {stats.worstMs}ms · {stats.longFrames} slow
      </span>
    </span>
  );
}

/**
 * An on/off chip per animation id. Sits under the bar, clear of the map's
 * middle, so the meter can be read against the scene as switches change.
 */
function LottieSwitches() {
  const disabled = useDisabledByDebug();
  const allOnTap = useTap(() => setDisabledByDebug([]));
  const allOffTap = useTap(() => setDisabledByDebug(ids));

  return (
    <div className="debug-lottie-switches pointer-events-auto absolute left-12 right-12 top-40 z-[100] rounded-3xl bg-black/80 px-8 py-6 font-mono text-[24px] text-white">
      <div className="debug-lottie-switches-header flex items-center gap-4">
        <span className="debug-lottie-switches-hint grow text-white/60">
          {ids.length - disabled.size}/{ids.length} on · off = not loaded
        </span>
        <button type="button" className="debug-lottie-switches-all-on rounded-xl bg-white/20 px-6 py-3" {...allOnTap}>
          All on
        </button>
        <button type="button" className="debug-lottie-switches-all-off rounded-xl bg-white/20 px-6 py-3" {...allOffTap}>
          All off
        </button>
      </div>
      <div className="debug-lottie-switches-list mt-4 flex flex-wrap gap-3">
        {ids.map((id) => (
          <LottieSwitch key={id} id={id} on={!disabled.has(id)} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

function LottieSwitch({ id, on, disabled }: { id: LottieAnimationId; on: boolean; disabled: ReadonlySet<LottieAnimationId> }) {
  const tap = useTap(() =>
    setDisabledByDebug(on ? [...disabled, id] : [...disabled].filter((other) => other !== id)),
  );
  return (
    <button
      type="button"
      className={`debug-lottie-switch rounded-xl px-5 py-2 ${on ? "bg-[#FACC15] text-black" : "bg-white/10 text-white/50 line-through"}`}
      {...tap}
    >
      {id}
    </button>
  );
}

function LottiePreviews() {
  const [selected, setSelected] = useState<LottieAnimationId | null>(null);

  return (
    <div className="debug-lottie pointer-events-auto absolute inset-x-12 bottom-48 top-40 z-[100] touch-pan-y overflow-y-auto rounded-3xl bg-black/85 px-10 py-8 font-mono text-[28px] text-white">
      <div className="debug-lottie-header flex items-center gap-6">
        <span className="debug-lottie-title grow font-bold">Lottie</span>
        <span className="debug-lottie-hint text-white/60">Tap an animation to inspect it</span>
      </div>

      {selected && (
        <LottieDetail key={selected} id={selected} onClose={() => setSelected(null)} />
      )}

      <div className="debug-lottie-grid mt-8 flex flex-wrap gap-6">
        {ids.map((id) => (
          <LottieCard key={id} id={id} selected={id === selected} onSelect={() => setSelected(id)} />
        ))}
      </div>
    </div>
  );
}

function LottieCard({
  id,
  selected,
  onSelect,
}: {
  id: LottieAnimationId;
  selected: boolean;
  onSelect: () => void;
}) {
  const tap = useTap(onSelect);
  return (
    <button
      type="button"
      className={`debug-lottie-card rounded-2xl p-4 text-left ${selected ? "bg-[#FACC15] text-black" : "bg-white/10"}`}
      {...tap}
    >
      <LottieView id={id} height={GRID_HEIGHT} playing />
      <span className="debug-lottie-card-name mt-2 block text-[24px]">{id}</span>
    </button>
  );
}

function LottieDetail({ id, onClose }: { id: LottieAnimationId; onClose: () => void }) {
  const data = dataOf(id);
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const playTap = useTap(() => setPlaying((p) => !p));
  const closeTap = useTap(onClose);
  const stripFrames = Array.from({ length: STRIP_FRAMES }, (_, i) => Math.round((i / STRIP_FRAMES) * data.op));

  return (
    <section className="debug-lottie-detail mt-8 rounded-2xl bg-white/10 p-6">
      <div className="debug-lottie-detail-header flex items-center gap-6">
        <span className="debug-lottie-detail-name grow font-bold">{id}</span>
        <span className="debug-lottie-detail-meta text-white/60">
          {data.w}x{data.h} · {data.op}f @ {data.fr}fps
        </span>
        <button type="button" className="debug-lottie-close rounded-xl bg-white/20 px-6 py-3" {...closeTap}>
          Close
        </button>
      </div>

      <div className="debug-lottie-stage mt-6 inline-block bg-[#dfdfdf]">
        <LottieView
          id={id}
          height={DETAIL_HEIGHT}
          playing={playing}
          frame={playing ? undefined : frame}
          onFrame={setFrame}
        />
      </div>

      <div className="debug-lottie-controls mt-4 flex items-center gap-6">
        <button type="button" className="debug-lottie-play w-48 rounded-xl bg-white/20 px-6 py-3" {...playTap}>
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          className="debug-lottie-scrubber debug-touch-slider-input grow"
          min={0}
          max={data.op - 1}
          value={frame}
          onChange={(e) => {
            setPlaying(false);
            setFrame(Number(e.target.value));
          }}
        />
        <span className="debug-lottie-frame w-32 text-right">f{frame}</span>
      </div>

      <div className="debug-lottie-strip mt-6 flex flex-wrap gap-4">
        {stripFrames.map((f) => (
          <figure key={f} className="debug-lottie-strip-cell m-0">
            <div className="debug-lottie-strip-stage bg-[#dfdfdf]">
              <LottieView id={id} height={STRIP_HEIGHT} playing={false} frame={f} />
            </div>
            <figcaption className="debug-lottie-strip-frame text-[22px] text-white/60">f{f}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/**
 * One lottie-web instance sized to `height`. `playing` loops it; otherwise
 * it holds on `frame`. Starts at frame 0 (unlike the map's
 * useLottieAnimation, which randomizes) so what's shown is reproducible.
 */
function LottieView({
  id,
  height,
  playing,
  frame,
  onFrame,
}: {
  id: LottieAnimationId;
  height: number;
  playing: boolean;
  frame?: number;
  onFrame?: (frame: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const onFrameRef = useRef(onFrame);
  const data = dataOf(id);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const animation = lottie.loadAnimation({ container, renderer: "svg", loop: true, autoplay: false, animationData: data });
    animation.setSubframe(false); // the map's playback rate (see useLottieAnimation)
    animation.addEventListener("enterFrame", () => onFrameRef.current?.(Math.floor(animation.currentFrame)));
    animationRef.current = animation;
    return () => {
      animation.destroy();
      animationRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    const animation = animationRef.current;
    if (!animation) return;
    if (playing) animation.play();
    else animation.goToAndStop(frame ?? 0, true);
  }, [playing, frame]);

  return (
    <div
      ref={containerRef}
      className="debug-lottie-view"
      style={{ height, width: (height * data.w) / data.h }}
    />
  );
}
