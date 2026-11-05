/**
 * Reports what the table is doing to the CMS, for the staff Table Monitor
 * (cms/theme/inc/monitor.php, in the WordPress admin). Fire-and-forget: events
 * queue up and are POSTed in small batches, a failed send is retried later,
 * and nothing here ever throws into the app.
 *
 * Off unless VITE_MONITOR_KEY is set (it must match MAYTABLE_KIOSK_KEY in the
 * CMS's wp-config.php). The endpoint defaults to the content endpoint's
 * sibling, so VITE_MONITOR_URL is only needed if that changes.
 */

export type MonitorEventType =
  | "session_start"
  | "session_end"
  | "heartbeat"
  | "details"
  | "directions"
  | "filter"
  | "drawer"
  | "help"
  | "signup"
  | "rotate";

type QueuedEvent = { type: MonitorEventType; label?: string; at: number };

const KEY: string | undefined = import.meta.env.VITE_MONITOR_KEY || undefined;
const ENDPOINT: string | undefined =
  import.meta.env.VITE_MONITOR_URL ||
  (import.meta.env.VITE_CONTENT_URL as string | undefined)?.replace(/\/content\/?$/, "/activity") ||
  undefined;

export const monitorEnabled = Boolean(KEY && ENDPOINT);

const FLUSH_DELAY_MS = 500; // gathers a tap's burst of state changes into one request
const RETRY_DELAY_MS = 15_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_QUEUE = 50; // the server keeps no more than this per session anyway
const MAX_BATCH = 20; // and takes no more than this per request

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight = false;
let sessionActive = false;
let lastTouchAt = 0;

if (monitorEnabled) {
  // Pans and zooms aren't worth listing, but "last touched 10s ago" tells
  // staff whether someone is still at the table or walked off.
  window.addEventListener("pointerdown", () => (lastTouchAt = Date.now()), { capture: true, passive: true });
  // Kiosk browser closed or reloaded mid-visit: end the session now rather
  // than leaving the monitor green until it notices the heartbeat stopped.
  window.addEventListener("pagehide", () => {
    endSession();
    flushNow();
  });
}

export function report(type: MonitorEventType, label?: string): void {
  if (!monitorEnabled) return;
  // Only the newest heartbeat matters if a few pile up while offline.
  if (type === "heartbeat") queue = queue.filter((event) => event.type !== "heartbeat");
  queue.push({ type, label, at: Date.now() });
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  schedule(FLUSH_DELAY_MS);
}

/** Idempotent, so StrictMode's double effects and repeat wakes send one start. */
export function startSession(): void {
  if (sessionActive) return;
  sessionActive = true;
  report("session_start");
}

export function endSession(): void {
  if (!sessionActive) return;
  sessionActive = false;
  report("session_end");
}

function schedule(delayMs: number): void {
  if (timer !== undefined) return;
  timer = setTimeout(flush, delayMs);
}

function flushNow(): void {
  clearTimeout(timer);
  timer = undefined;
  void flush();
}

async function flush(): Promise<void> {
  timer = undefined;
  if (inFlight || queue.length === 0 || !KEY || !ENDPOINT) return;

  const batch = queue.splice(0, MAX_BATCH);
  const now = Date.now();
  // Times go as "ms ago" rather than timestamps, so the kiosk's clock
  // doesn't have to agree with the server's.
  const body = JSON.stringify({
    key: KEY,
    touchAgo: lastTouchAt ? now - lastTouchAt : null,
    events: batch.map((event) => ({ type: event.type, label: event.label, ago: now - event.at })),
  });

  inFlight = true;
  try {
    // text/plain keeps this a "simple" cross-origin request: no preflight,
    // which keepalive requests (sent as the page unloads) can't make.
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body,
      keepalive: true,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status >= 500 || response.status === 429) throw new Error(`${response.status}`);
    // Any other refusal (a wrong key) won't fix itself on a retry: drop it.
    if (!response.ok) console.warn(`Monitor: CMS refused activity (${response.status}).`);
  } catch {
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
    inFlight = false;
    schedule(RETRY_DELAY_MS);
    return;
  }
  inFlight = false;
  if (queue.length > 0) schedule(FLUSH_DELAY_MS);
}
