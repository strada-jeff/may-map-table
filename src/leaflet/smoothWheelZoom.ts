import L from "leaflet";

declare module "leaflet" {
  interface MapOptions {
    /**
     * Enables SmoothWheelZoom (registered below) in place of the default
     * ScrollWheelZoom handler. "center" always zooms around the view's
     * center instead of the cursor position.
     */
    smoothWheelZoom?: boolean | "center";
    /** Wheel-zoom speed multiplier for the smooth handler. */
    smoothSensitivity?: number;
  }
}

/**
 * Continuous, per-frame wheel-zoom handler — ported from
 * https://github.com/mutsuyuki/Leaflet.SmoothWheelZoom (MIT) — registered
 * in place of Leaflet's default ScrollWheelZoom.
 *
 * The default handler debounces scroll input into discrete zoom steps
 * driven by a CSS transition, whose intermediate frames are computed
 * entirely by the browser's compositor and are invisible to JS. Any custom
 * overlay tracking the map in real time (our route line) only ever sees
 * that transition's start and end, not its in-between state, and visibly
 * desyncs from it. This handler instead calls the map's internal _move()
 * directly on every requestAnimationFrame tick — the same mechanism
 * Leaflet's own flyTo and pinch-zoom already use — so real intermediate
 * zoom/center values are always available to track, and, as a side
 * benefit, wheel-zooming feels continuous rather than stepped.
 *
 * Reaches into several of L.Map's undocumented internals (_move, _stop,
 * _moveStart, _moveEnd, _panAnim, _limitZoom) since there's no public API
 * for driving zoom this way — the same category of reliance Leaflet's own
 * bundled handlers (e.g. TouchZoom) have on themselves.
 */
const SmoothWheelZoom = L.Handler.extend({
  addHooks(this: any) {
    L.DomEvent.on(this._map._container, "wheel", this._onWheelScroll, this);
  },

  removeHooks(this: any) {
    L.DomEvent.off(this._map._container, "wheel", this._onWheelScroll, this);
  },

  _onWheelScroll(this: any, e: WheelEvent) {
    if (!this._isWheeling) this._onWheelStart(e);
    this._onWheeling(e);
  },

  _onWheelStart(this: any, e: WheelEvent) {
    const map = this._map;
    this._isWheeling = true;
    this._wheelMousePosition = map.mouseEventToContainerPoint(e);
    this._centerPoint = map.getSize()._divideBy(2);
    this._startLatLng = map.containerPointToLatLng(this._centerPoint);
    this._wheelMouseLatLng = map.containerPointToLatLng(this._wheelMousePosition);
    this._moved = false;

    map._stop();
    if (map._panAnim) map._panAnim.stop();

    this._goalZoom = map.getZoom();
    this._prevCenter = map.getCenter();
    this._prevZoom = map.getZoom();

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
  },

  _onWheeling(this: any, e: WheelEvent) {
    const map = this._map;

    this._goalZoom += L.DomEvent.getWheelDelta(e) * 0.003 * (map.options.smoothSensitivity ?? 1);
    if (this._goalZoom < map.getMinZoom() || this._goalZoom > map.getMaxZoom()) {
      this._goalZoom = map._limitZoom(this._goalZoom);
    }
    this._wheelMousePosition = map.mouseEventToContainerPoint(e);
    this._wheelMouseLatLng = map.containerPointToLatLng(this._wheelMousePosition);

    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(this._onWheelEnd.bind(this), 200);

    L.DomEvent.preventDefault(e);
    L.DomEvent.stopPropagation(e);
  },

  _onWheelEnd(this: any) {
    this._isWheeling = false;
    cancelAnimationFrame(this._zoomAnimationId);
    this._map._moveEnd(true);
  },

  _updateWheelZoom(this: any) {
    const map = this._map;

    if (!map.getCenter().equals(this._prevCenter) || map.getZoom() !== this._prevZoom) return;

    this._zoom = map.getZoom() + (this._goalZoom - map.getZoom()) * 0.3;
    this._zoom = Math.floor(this._zoom * 100) / 100;

    const delta = this._wheelMousePosition.subtract(this._centerPoint);
    if (delta.x === 0 && delta.y === 0) return;

    this._center =
      map.options.smoothWheelZoom === "center"
        ? this._startLatLng
        : map.unproject(map.project(this._wheelMouseLatLng, this._zoom).subtract(delta), this._zoom);

    if (!this._moved) {
      map._moveStart(true, false);
      this._moved = true;
    }

    map._move(this._center, this._zoom);
    this._prevCenter = map.getCenter();
    this._prevZoom = map.getZoom();

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
  },
});

L.Map.addInitHook("addHandler", "smoothWheelZoom", SmoothWheelZoom);
