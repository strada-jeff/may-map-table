/**
 * The map on a pin's "Map position" field (see inc/map-field.php).
 *
 * Click places the map position (or the icon, when that's selected); drag a
 * marker to move it; drag the map to pan, scroll to zoom. Coordinates are
 * map units: the 3840 x 2160 artwork's pixels, y down — the same space as
 * the app's `anchor` and `iconOffset`. Writes go into the ACF inputs, which
 * remain what's saved.
 */
(function () {
  const config = window.maytableMapField;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MAX_ZOOM = 4; // map units per screen px at full zoom-in: 1 unit = 4 px
  const CLICK_SLOP_PX = 4; // pointer travel beyond which a press is a pan, not a click

  acf.addAction("ready", () => {
    const field = document.querySelector('.acf-field[data-key="field_pin_anchor"]');
    if (field) fetch(config.mapData).then((r) => r.json()).then((data) => mount(field, data));
  });

  function mount(field, data) {
    const input = (key) => document.querySelector(`.acf-field[data-key="${key}"] input`);
    const inputs = {
      anchorX: input("field_pin_anchor_x"),
      anchorY: input("field_pin_anchor_y"),
      offsetX: input("field_pin_icon_offset_x"),
      offsetY: input("field_pin_icon_offset_y"),
    };

    const ui = element("div", "maytable-map");
    ui.innerHTML = `
      <div class="maytable-map__toolbar">
        <span class="maytable-map__mode">
          <label><input type="radio" name="maytable-map-mode" value="anchor" checked> Click places the map position</label>
          <label><input type="radio" name="maytable-map-mode" value="icon"> Click places the icon</label>
        </span>
        <button type="button" class="button" data-action="snap">Snap to road</button>
        <button type="button" class="button" data-action="clear-offset">Reset icon</button>
        <span class="maytable-map__spacer"></span>
        <label><input type="checkbox" data-action="roads" checked> Roads</label>
        <button type="button" class="button" data-action="zoom-out" aria-label="Zoom out">−</button>
        <button type="button" class="button" data-action="zoom-in" aria-label="Zoom in">+</button>
        <button type="button" class="button" data-action="fit">Fit</button>
      </div>
      <div class="maytable-map__viewport">
        <div class="maytable-map__stage" style="width:${data.width}px;height:${data.height}px">
          <img src="${config.mapImage}" alt="" draggable="false" width="${data.width}" height="${data.height}">
          <svg viewBox="0 0 ${data.width} ${data.height}" width="${data.width}" height="${data.height}">
            <g class="maytable-map__roads"></g>
            <g class="maytable-map__others"></g>
            <line class="maytable-map__snap-line"></line>
            <line class="maytable-map__offset-line"></line>
            <circle class="maytable-map__icon"></circle>
            <circle class="maytable-map__anchor"></circle>
          </svg>
        </div>
      </div>
      <p class="maytable-map__status"></p>`;
    field.querySelector(".acf-input").prepend(ui);

    const viewport = ui.querySelector(".maytable-map__viewport");
    const stage = ui.querySelector(".maytable-map__stage");
    const roads = ui.querySelector(".maytable-map__roads");
    const others = ui.querySelector(".maytable-map__others");
    const snapLine = ui.querySelector(".maytable-map__snap-line");
    const offsetLine = ui.querySelector(".maytable-map__offset-line");
    const anchorMarker = ui.querySelector(".maytable-map__anchor");
    const iconMarker = ui.querySelector(".maytable-map__icon");
    const status = ui.querySelector(".maytable-map__status");

    for (const road of data.roads) {
      const line = svg("polyline");
      line.setAttribute("points", road.map((p) => p.join(",")).join(" "));
      roads.append(line);
    }
    for (const origin of data.origins) {
      others.append(dot(origin.point, `Start of routes: ${origin.id}`, "maytable-map__origin"));
    }
    fetch(config.content)
      .then((r) => r.json())
      .then((content) => {
        for (const pin of [...content.modelHomes, ...content.locations]) {
          if (pin.id === config.pinId) continue;
          others.append(dot(pin.anchor, pin.name ?? pin.title, "maytable-map__other"));
        }
        render();
      })
      .catch(() => {}); // Reference only; the field works without them.

    // ── View: stage transform = translate(x, y) scale(scale) ──
    const view = { x: 0, y: 0, scale: 1 };
    const fitScale = () => viewport.clientWidth / data.width;

    function setView(scale, x, y) {
      const min = fitScale();
      view.scale = Math.min(MAX_ZOOM, Math.max(min, scale));
      // Keep the artwork covering the viewport: no panning off its edges.
      const w = data.width * view.scale;
      const h = data.height * view.scale;
      view.x = Math.min(0, Math.max(viewport.clientWidth - w, x));
      view.y = Math.min(0, Math.max(viewport.clientHeight - h, y));
      stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
      render();
    }

    /** Zoom to `scale` keeping the map point under screen point (sx, sy) still. */
    function zoomAt(scale, sx, sy) {
      const mx = (sx - view.x) / view.scale;
      const my = (sy - view.y) / view.scale;
      const next = Math.min(MAX_ZOOM, Math.max(fitScale(), scale));
      setView(next, sx - mx * next, sy - my * next);
    }

    function centerOn(point, scale) {
      setView(scale, viewport.clientWidth / 2 - point[0] * scale, viewport.clientHeight / 2 - point[1] * scale);
    }

    // ── Values, read from and written to the ACF inputs ──
    const read = (el) => (el.value === "" ? null : Number(el.value));
    const anchor = () => {
      const x = read(inputs.anchorX);
      const y = read(inputs.anchorY);
      return x === null || y === null ? null : [x, y];
    };
    const offset = () => [read(inputs.offsetX) ?? 0, read(inputs.offsetY) ?? 0];

    function write(el, value) {
      el.value = value === "" ? "" : String(Math.round(value * 100) / 100);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function setAnchor(point) {
      write(inputs.anchorX, point[0]);
      write(inputs.anchorY, point[1]);
      render();
    }
    function setIcon(point) {
      const a = anchor();
      if (!a) return setAnchor(point);
      write(inputs.offsetX, point[0] - a[0]);
      write(inputs.offsetY, point[1] - a[1]);
      render();
    }

    // ── Drawing ──
    function render() {
      // Markers keep a constant on-screen size whatever the zoom.
      const px = 1 / view.scale;
      anchorMarker.setAttribute("r", 9 * px);
      iconMarker.setAttribute("r", 7 * px);
      for (const other of others.children) other.setAttribute("r", 5 * px);

      const a = anchor();
      ui.classList.toggle("is-empty", !a);
      if (!a) {
        status.textContent = "Click the map to place this pin.";
        status.className = "maytable-map__status";
        return;
      }
      const o = offset();
      const icon = [a[0] + o[0], a[1] + o[1]];
      place(anchorMarker, a);
      place(iconMarker, icon);
      ui.classList.toggle("has-offset", o[0] !== 0 || o[1] !== 0);
      line(offsetLine, a, icon);

      const near = nearestRoadPoint(a);
      line(snapLine, a, near.point);
      const ok = near.distance <= data.maxSnapDistance;
      ui.classList.toggle("is-far", !ok);
      status.className = `maytable-map__status ${ok ? "is-ok" : "is-far"}`;
      status.textContent = ok
        ? `${near.distance.toFixed(1)} from the nearest road. Directions end where the dashed line meets it.`
        : `${near.distance.toFixed(1)} from the nearest road — over the ${data.maxSnapDistance} limit. ` +
          `Move the pin onto the road at the entrance, or use Snap to road.`;
    }

    function nearestRoadPoint(p) {
      let best = { distance: Infinity, point: p };
      for (const road of data.roads) {
        for (let i = 1; i < road.length; i++) {
          const q = projectOnSegment(p, road[i - 1], road[i]);
          const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (d < best.distance) best = { distance: d, point: q };
        }
      }
      return best;
    }

    // ── Input ──
    const mode = () => ui.querySelector('input[name="maytable-map-mode"]:checked').value;
    const toMap = (e) => {
      const r = viewport.getBoundingClientRect();
      return [(e.clientX - r.left - view.x) / view.scale, (e.clientY - r.top - view.y) / view.scale];
    };

    let press = null;
    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      viewport.setPointerCapture(e.pointerId);
      const target = e.target === anchorMarker ? "anchor" : e.target === iconMarker ? "icon" : null;
      press = { target, startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y, moved: false };
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!press) return;
      const dx = e.clientX - press.startX;
      const dy = e.clientY - press.startY;
      if (!press.moved && Math.hypot(dx, dy) < CLICK_SLOP_PX) return;
      press.moved = true;
      if (press.target === "anchor") setAnchor(toMap(e));
      else if (press.target === "icon") setIcon(toMap(e));
      else {
        viewport.classList.add("is-panning");
        setView(view.scale, press.viewX + dx, press.viewY + dy);
      }
    });
    viewport.addEventListener("pointerup", (e) => {
      if (press && !press.moved) (mode() === "icon" ? setIcon : setAnchor)(toMap(e));
      press = null;
      viewport.classList.remove("is-panning");
    });
    viewport.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const r = viewport.getBoundingClientRect();
        zoomAt(view.scale * Math.exp(-e.deltaY * 0.002), e.clientX - r.left, e.clientY - r.top);
      },
      { passive: false },
    );

    ui.querySelector(".maytable-map__toolbar").addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      const middle = () => [viewport.clientWidth / 2, viewport.clientHeight / 2];
      if (action === "zoom-in") zoomAt(view.scale * 1.5, ...middle());
      if (action === "zoom-out") zoomAt(view.scale / 1.5, ...middle());
      if (action === "fit") setView(fitScale(), 0, 0);
      if (action === "snap" && anchor()) setAnchor(nearestRoadPoint(anchor()).point);
      if (action === "clear-offset") {
        write(inputs.offsetX, "");
        write(inputs.offsetY, "");
        render();
      }
    });
    ui.querySelector('[data-action="roads"]').addEventListener("change", (e) => {
      roads.style.display = e.target.checked ? "" : "none";
    });
    for (const el of Object.values(inputs)) el.addEventListener("input", render);

    // The viewport is hidden until its tab shows, so size the view then.
    let started = false;
    new ResizeObserver(() => {
      if (!viewport.clientWidth) return;
      const a = anchor();
      if (!started && a) centerOn(a, Math.min(MAX_ZOOM, fitScale() * 4));
      else setView(started ? view.scale : fitScale(), view.x, view.y);
      started = true;
    }).observe(viewport);
  }

  function projectOnSegment(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared)) : 0;
    return [a[0] + t * dx, a[1] + t * dy];
  }

  function element(tag, className) {
    const el = document.createElement(tag);
    el.className = className;
    return el;
  }

  function svg(tag) {
    return document.createElementNS(SVG_NS, tag);
  }

  function dot(point, label, className) {
    const circle = svg("circle");
    circle.setAttribute("class", className);
    place(circle, point);
    const title = svg("title");
    title.textContent = label;
    circle.append(title);
    return circle;
  }

  function place(circle, point) {
    circle.setAttribute("cx", point[0]);
    circle.setAttribute("cy", point[1]);
  }

  function line(el, from, to) {
    el.setAttribute("x1", from[0]);
    el.setAttribute("y1", from[1]);
    el.setAttribute("x2", to[0]);
    el.setAttribute("y2", to[1]);
  }
})();
