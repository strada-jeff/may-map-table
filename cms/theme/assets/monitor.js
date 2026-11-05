/**
 * Table Monitor (inc/monitor.php): polls the activity endpoint and shows
 * whether the table is in use, on the full-screen admin page or the
 * dashboard widget. Optional chime when a visit starts, which also plays
 * with the tab in the background.
 */
(() => {
	const root = document.querySelector('[data-table-monitor]');
	const config = window.maytableMonitor;
	if (!root || !config) return;

	const isPage = root.dataset.tableMonitor === 'page';
	const POLL_MS = 3000;
	const ACTIVE_STALE_S = 90; // the kiosk heartbeats every 30s while in use
	const IDLE_STALE_S = 11 * 60; // ...and every 5 min while idle
	const SOUND_KEY = 'maytable-monitor-sound';
	const RELOAD_KEY = 'maytable-monitor-reloaded';
	const TITLE = document.title;

	const el = (name) => root.querySelector(`[data-${name}]`);
	const LABELS = {
		details: (l) => `Viewed ${l}`,
		directions: (l) => `Directions to ${l}`,
		filter: (l) => `Filtered: ${l}`,
		drawer: () => 'Opened the list',
		help: () => 'Opened help',
		signup: () => 'Opened sign-up',
		rotate: () => 'Turned the screen around',
	};

	let state = null;
	let skew = 0; // server seconds minus ours
	let wasActive = null;
	let failures = 0;
	let polling = false;

	const serverNow = () => Date.now() / 1000 + skew;
	const clock = (t) => new Date((t - skew) * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	function ago(t) {
		const s = Math.max(0, Math.round(serverNow() - t));
		if (s < 10) return 'just now';
		if (s < 60) return `${s}s ago`;
		const m = Math.floor(s / 60);
		return m < 60 ? `${m} min ago` : clock(t);
	}
	function duration(t) {
		const m = Math.floor(Math.max(0, serverNow() - t) / 60);
		return m < 1 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
	}

	async function poll() {
		if (polling) return;
		polling = true;
		try {
			const url = new URL(config.endpoint);
			url.searchParams.set('t', Date.now());
			const res = await fetch(url, {
				cache: 'no-store',
				credentials: 'same-origin',
				headers: { 'X-WP-Nonce': config.nonce },
			});
			if (res.status === 401 || res.status === 403) {
				// Logged out, or the nonce expired (they last about a day):
				// a reload gets a fresh one, or the login screen. Once per
				// few minutes, so a real permission problem doesn't loop.
				const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
				if (Date.now() - last > 5 * 60_000) {
					sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
					location.reload();
					return;
				}
				throw new Error(String(res.status));
			}
			if (!res.ok) throw new Error(String(res.status));
			state = await res.json();
			skew = state.now - Date.now() / 1000;
			failures = 0;
		} catch {
			failures++;
		} finally {
			polling = false;
		}
		render();
	}

	function render() {
		let headline;
		let detail = '';
		let warning = '';
		let active = false;

		if (!state) {
			headline = failures ? 'Can’t reach the server' : 'Connecting…';
			if (failures) warning = 'Retrying every few seconds. Check this device’s connection.';
		} else {
			const sinceKiosk = state.kioskSeen ? serverNow() - state.kioskSeen : Infinity;
			if (failures >= 3) {
				headline = 'Can’t reach the server';
				warning = 'Retrying every few seconds. Check this device’s connection.';
			} else if (state.active && sinceKiosk <= ACTIVE_STALE_S) {
				active = true;
				headline = 'In use';
				detail = `For ${duration(state.startedAt)}` + (state.lastTouch ? ` · last touched ${ago(state.lastTouch)}` : '');
			} else if (state.active || sinceKiosk > IDLE_STALE_S) {
				headline = 'Table not reporting';
				warning = state.kioskSeen
					? `Last heard from the table ${ago(state.kioskSeen)}. It may be off or offline.`
					: 'The table hasn’t checked in yet.';
			} else {
				headline = 'Idle';
				detail = state.endedAt ? `Since ${clock(state.endedAt)}` : '';
			}
		}

		if (soundOn && audioBlocked()) {
			warning = warning ? `${warning} ` : '';
			warning += 'Click anywhere on this page to allow the chime.';
		}

		// The dot: green in use, red idle, grey when we can't say which.
		root.dataset.status = active ? 'active' : headline === 'Idle' ? 'idle' : 'unknown';
		root.classList.toggle('is-active', active);
		document.title = active ? `● In use · ${TITLE}` : TITLE;
		el('headline').textContent = headline;
		el('detail').textContent = detail;
		el('warning').textContent = warning;
		el('warning').hidden = !warning;
		renderEvents(active ? state.events : []);

		// Chime on a visit starting, not on the page opening or reconnecting.
		const known = state && failures < 3;
		if (known && wasActive === false && active) chime();
		if (known) wasActive = active;
	}

	function renderEvents(events) {
		const items = events.slice().reverse();
		if (isPage && root.classList.contains('is-active') && !items.length) {
			const li = document.createElement('li');
			li.className = 'is-empty';
			li.textContent = 'Nothing opened yet.';
			el('events').replaceChildren(li);
			return;
		}
		el('events').replaceChildren(...(isPage ? items : items.slice(0, 5)).map((event) => {
			const li = document.createElement('li');
			const what = document.createElement('span');
			what.className = 'what';
			what.textContent = (LABELS[event.type] || ((l) => l))(event.label);
			const when = document.createElement('span');
			when.className = 'when';
			when.textContent = ago(event.at);
			li.append(what, when);
			return li;
		}));
	}

	/* -------------------------------------------------------- toggles */

	// 24px line icons, drawn in the button's text color.
	const svg = (paths) =>
		`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
	const SPEAKER = '<path d="M4 9h4l5-4v14l-5-4H4z"/>';
	const SCREEN = '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>';
	const ICONS = {
		soundOn: svg(`${SPEAKER}<path d="M16.5 9.5a3.5 3.5 0 0 1 0 5M19 7a7 7 0 0 1 0 10"/>`),
		soundOff: svg(`${SPEAKER}<path d="M17 9.5l5 5M22 9.5l-5 5"/>`),
		// A sun on the screen: awake.
		wakeOn: svg(`${SCREEN}<circle cx="12" cy="10" r="2"/><path d="M12 6.5v.5M12 13v.5M8.5 10H9M15 10h.5"/>`),
		// Zzz on the screen: allowed to sleep.
		wakeOff: svg(`${SCREEN}<path d="M7.5 7.5h3l-3 4h3M12.5 9.5h2l-2 2.5h2" stroke-width="1.5"/>`),
	};

	/** Icon, label and pressed look all follow the state, so on/off reads at a glance. */
	function setToggle(button, on, icons, labels) {
		button.setAttribute('aria-pressed', String(on));
		button.classList.toggle('button-primary', on);
		button.innerHTML = `${on ? icons[0] : icons[1]}<span>${on ? labels[0] : labels[1]}</span>`;
	}

	/* ---------------------------------------------------------- sound */

	// Remembered per browser. Browsers only let a page make sound after
	// a click on it, so after a reload the first click anywhere unlocks it.
	// Once unlocked it plays from a background tab too.
	let soundOn = readSoundPref();
	let audio = null;
	const soundButton = el('sound');

	function readSoundPref() {
		try { return localStorage.getItem(SOUND_KEY) === 'on'; } catch { return false; }
	}
	function audioBlocked() {
		return !audio || audio.state !== 'running';
	}
	function unlockAudio() {
		if (!soundOn) return;
		audio ??= new AudioContext();
		if (audio.state !== 'running') audio.resume().then(render, () => {});
	}
	function updateSoundButton() {
		setToggle(soundButton, soundOn, [ICONS.soundOn, ICONS.soundOff], ['Sound on', 'Sound off']);
	}

	soundButton.addEventListener('click', () => {
		soundOn = !soundOn;
		try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch {}
		updateSoundButton();
		if (soundOn) {
			unlockAudio();
			setTimeout(chime, 50); // a sample, so they know what to listen for
		}
		render();
	});
	document.addEventListener('pointerdown', unlockAudio, true);
	document.addEventListener('keydown', unlockAudio, true);
	updateSoundButton();

	function chime() {
		if (!soundOn || audioBlocked()) return;
		const t = audio.currentTime;
		[880, 1318.5].forEach((freq, i) => {
			const start = t + i * 0.18;
			const osc = audio.createOscillator();
			const gain = audio.createGain();
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
			osc.connect(gain).connect(audio.destination);
			osc.start(start);
			osc.stop(start + 0.55);
		});
		navigator.vibrate?.([120, 80, 120]);
	}

	/* ----------------------------------------------------- wake lock */

	const wakeButton = el('wake');
	const showWake = (on) => setToggle(wakeButton, on, [ICONS.wakeOn, ICONS.wakeOff], ['Screen stays on', 'Screen can sleep']);
	if (wakeButton && !('wakeLock' in navigator)) {
		// Shown greyed out rather than hidden, with the reason. Browsers
		// only offer it on https (or localhost), so plain-http local sites
		// land here.
		showWake(false);
		wakeButton.disabled = true;
		wakeButton.title = window.isSecureContext
			? 'This browser can’t keep the screen on.'
			: 'Keeping the screen on needs a secure (https) connection.';
		// Spelled out too: there's no hover for the tooltip on a phone.
		const note = document.createElement('span');
		note.className = 'table-monitor__note';
		note.textContent = window.isSecureContext ? 'Not available in this browser' : 'Needs https';
		wakeButton.after(note);
	} else if (wakeButton) {
		let lock = null;
		let wanted = false;
		const acquire = async () => {
			try {
				lock = await navigator.wakeLock.request('screen');
			} catch {
				wanted = false; // refused (e.g. battery saver)
				showWake(false);
			}
		};
		showWake(false);
		wakeButton.addEventListener('click', () => {
			wanted = !wanted;
			showWake(wanted);
			if (wanted) acquire();
			else lock?.release();
		});
		// The browser drops the lock when the tab is hidden; take it back.
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible' && wanted) acquire();
		});
	}

	/* --------------------------------------------------------- timing */

	// Chrome slows a background tab's timers to once a minute after ~5
	// minutes, which would delay the chime. A worker's timers aren't
	// slowed that way, so it sets the pace; the page timer is the fallback.
	let ticker = null;
	try {
		const source = `setInterval(() => postMessage(0), ${POLL_MS});`;
		ticker = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
		ticker.onmessage = poll;
	} catch {
		setInterval(poll, POLL_MS);
	}
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') poll();
	});
	setInterval(() => state && render(), 1000); // keeps "12s ago" ticking while visible
	poll();
})();
