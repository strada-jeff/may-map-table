import { readFileSync } from 'node:fs'
import { parseHTML } from 'linkedom'
import { svgPathProperties } from 'svg-path-properties'
import simplify from 'simplify-js'
import { applyMatrix, IDENTITY, multiply, parseTransform, type Matrix } from './matrix'
import type { EdgeKind, Point } from '../src/routing/types'

export interface ExtractedPath {
  id: string
  kind: EdgeKind
  points: Point[]
  /** Closed paths (circles, ellipses, `Z`-terminated) form rings. */
  closed: boolean
  /** Drivable in the `points` order only. */
  oneWay: boolean
  /** Named sublayer it was found in, or null if loose in the root. */
  group: string | null
}

export interface ExtractedAnchor {
  id: string
  point: Point
}

export interface Extraction {
  /** viewBox of the source document, i.e. the canonical coordinate space. */
  bounds: readonly [Point, Point]
  /** Which candidate id(s) the roads were actually read from — more than one
   *  when separate networks each get their own top-level Illustrator layer. */
  networkLayerIds: string[]
  paths: ExtractedPath[]
  destinations: ExtractedAnchor[]
  origins: ExtractedAnchor[]
  /**
   * Ids of paths that sit outside every named sublayer. They still route, as
   * ordinary two-way roads, but a road meant for `one-way` and dropped at the
   * top level would land here and be silently bidirectional - so they get
   * reported rather than accepted quietly.
   */
  ungrouped: string[]
}

export interface ExtractOptions {
  /**
   * Candidate ids for the group(s) holding the routing paths. Every id that
   * actually exists in the document is read and merged — not just the first
   * match — so a second, physically separate network can live in its own
   * top-level Illustrator layer (e.g. "roads-network-2") instead of nested
   * inside the first one. The list is also still how a renamed/re-exported
   * single layer is found (Illustrator wraps everything in a new group on
   * re-import), which is why a plain rename doesn't accidentally double up:
   * re-exporting produces one new id, not both the old and new one at once.
   */
  networkLayer?: string | string[]
  destinationsLayer?: string | string[]
  originsLayer?: string | string[]
  /** Sampling step in map units. Smaller means more faithful curves. */
  step?: number
  /** Douglas-Peucker tolerance applied after sampling. */
  simplifyTolerance?: number
  /**
   * Which way one-way rings are made to circulate. `anticlockwise` is
   * right-hand traffic (US, most of Europe); `clockwise` is left-hand traffic
   * (UK, Ireland, Australia, Japan).
   */
  circulation?: 'anticlockwise' | 'clockwise'
}

/** Sublayer id -> edge kind. Anything else inherits `path`. */
const KIND_BY_LAYER: Record<string, EdgeKind> = {
  bridges: 'bridge',
}

/**
 * Ordinary two-way roads.
 *
 * Carries no behaviour at all - it resolves to exactly the same edge as a bare
 * path would. It exists so the *normal* case has a name: with it, the Layers
 * panel lists three groups that read as instructions, instead of two named
 * groups plus a pile of loose paths whose meaning has to be inferred from
 * where they are not.
 */
const TWO_WAY_LAYER = 'two-way'

/**
 * Sublayer marking paths as one-way. Orthogonal to kind: a one-way bridge is
 * both, so this is looked up separately rather than being another kind.
 *
 * Hyphenated to pair visibly with `two-way` in the Layers panel — the choice
 * between the two is the one the illustrator actually has to make.
 */
const ONEWAY_LAYER = 'one-way'

/** Every sublayer the extractor recognises, for the ungrouped-path report. */
const KNOWN_LAYERS = new Set([
  ...Object.keys(KIND_BY_LAYER),
  ONEWAY_LAYER,
  TWO_WAY_LAYER,
])

/**
 * Subtrees the road walk never enters, matched by id.
 *
 * `art` is the reference artwork traced over while drawing; `destinations` and
 * `origins` hold anchors. All three contain shapes and sit right next to the
 * roads in the document, so excluding them by name means they cannot become
 * roads however the layers end up nested or renamed. Without this, a guide
 * rectangle drawn on the art layer or an anchor dragged into the wrong group
 * becomes a road, silently.
 *
 * Placed images are skipped anyway — `<image>` is not a geometry tag — but a
 * traced reference is often a rect or a shape, which is.
 */
const NON_ROAD_LAYERS = new Set(['art', 'artwork', 'reference', 'destinations', 'origins'])

const GEOMETRY_TAGS = new Set([
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
])

export function extractFromSvg(svgSource: string, opts: ExtractOptions = {}): Extraction {
  const {
    networkLayer = ['roads-network', 'network', 'roads'],
    destinationsLayer = 'destinations',
    originsLayer = 'origins',
    step = 3,
    simplifyTolerance = 1,
    circulation = 'anticlockwise',
  } = opts

  const { document } = parseHTML(`<html><body>${svgSource}</body></html>`)
  const svg = document.querySelector('svg')
  if (!svg) throw new Error('No <svg> element found')

  const bounds = readViewBox(svg)

  const candidates = Array.isArray(networkLayer) ? networkLayer : [networkLayer]
  const networkRoots = findRoots(document, candidates, svg as Element)
  if (networkRoots.length === 0) {
    throw new Error(
      `No routing layer found: expected a group with one of these ids — ` +
        `${candidates.map((c) => `"${c}"`).join(', ')}. ` +
        `Check the SVG export kept object ids (Illustrator: Object IDs -> Layer Names).`,
    )
  }

  const paths: ExtractedPath[] = []
  const ungrouped: string[] = []
  for (const { element: networkRoot } of networkRoots) {
    walk(networkRoot, baseMatrixFor(networkRoot, svg as Element), (el, matrix) => {
      const geometry = toPathData(el)
      if (!geometry) return
      const sampled = flatten(geometry.d, matrix, step)
      if (sampled.length < 2) return
      const points = simplifyPoints(sampled, simplifyTolerance, geometry.closed)
      if (points.length < 2) return

      const id = el.getAttribute('id') || `${el.tagName.toLowerCase()}-${paths.length}`
      const group = groupFor(el, networkRoot)
      if (group === null) ungrouped.push(id)

      const oneWay = isOneWay(el, networkRoot)
      // A drawing tool decides which way round it emits a circle, and the
      // illustrator has no reliable control over it. Normalising here means
      // a roundabout circulates correctly however it happened to be drawn.
      if (oneWay && geometry.closed) orientRing(points, circulation)

      paths.push({
        id,
        kind: kindFor(el, networkRoot),
        points,
        closed: geometry.closed,
        oneWay,
        group,
      })
    })
  }

  return {
    bounds,
    networkLayerIds: networkRoots.map((r) => r.id),
    paths,
    ungrouped,
    destinations: readAnchors(document, destinationsLayer, svg as Element),
    origins: readAnchors(document, originsLayer, svg as Element),
  }
}

/**
 * Every element whose *role* (see `nameOf`) matches a candidate — not just
 * the first, and not by literal id — except a match that turns out to be
 * an ancestor of another match.
 *
 * Matching by role rather than literal id is what lets a whole layer be
 * duplicated in Illustrator (to start a second, separate network) and just
 * work: the copy's ids get auto-suffixed to stay unique, but its
 * `data-name`s still read "roads-network"/"origins"/etc, so both the
 * original and the copy match the same plain candidate list.
 *
 * The ancestor exclusion handles a different, older Illustrator quirk:
 * re-importing wraps everything in a new outer layer group, so a
 * renamed/re-exported single layer can leave both its old and new name
 * matching at once, one nested inside the other (the outer one is
 * sometimes literally named "network", the same generic name Illustrator
 * also gives the whole artboard — excluded separately below since that one
 * isn't even a wrapper, just the `<svg>` root itself). Keeping the more
 * specific, nested match and dropping the outer wrapper is what makes that
 * safe: without it, the wrapper's subtree would read the inner layer's
 * content a second time.
 */
function findRoots(
  document: Document,
  candidates: string[],
  svg: Element,
): { id: string; element: Element }[] {
  const all = Array.from(document.querySelectorAll('[id], [data-name]')) as Element[]
  const roots: { id: string; element: Element }[] = []
  for (const id of candidates) {
    for (const el of all) {
      // `id` here is the actual attribute for reporting, not the matched
      // role name — with a layer duplicated, several roots share a role
      // (e.g. "roads-network") but must stay distinguishable by their own
      // real id (e.g. "roads-network" vs. "roads-network-2").
      if (el !== svg && nameOf(el) === id) roots.push({ id: el.getAttribute('id') ?? id, element: el })
    }
  }
  return roots.filter(
    (root) => !roots.some((other) => other.element !== root.element && isAncestor(root.element, other.element)),
  )
}

function isAncestor(ancestor: Element, node: Element): boolean {
  let current: Element | null = node.parentElement
  while (current) {
    if (current === ancestor) return true
    current = current.parentElement
  }
  return false
}

export function readViewBox(svg: Element): readonly [Point, Point] {
  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const [minX = 0, minY = 0, width = 0, height = 0] = viewBox
      .split(/[\s,]+/)
      .map(Number)
    if (width > 0 && height > 0) {
      return [
        [minX, minY],
        [minX + width, minY + height],
      ]
    }
  }
  const width = Number.parseFloat(svg.getAttribute('width') || '0')
  const height = Number.parseFloat(svg.getAttribute('height') || '0')
  if (width > 0 && height > 0) {
    return [
      [0, 0],
      [width, height],
    ]
  }
  throw new Error('SVG has neither a usable viewBox nor width/height')
}

/** Compose transforms from the document root down to (and including) `el`. */
function baseMatrixFor(el: Element, svg: Element): Matrix {
  const chain: Element[] = []
  let current: Element | null = el
  while (current && current !== svg) {
    chain.unshift(current)
    current = current.parentElement
  }
  let matrix: Matrix = IDENTITY
  for (const node of chain) matrix = multiply(matrix, parseTransform(node.getAttribute('transform')))
  return matrix
}

/**
 * A layer's *role* (roads-network, two-way, origins, ...) — never an
 * individual anchor's identity. Illustrator auto-suffixes an `id` to keep
 * it unique when two layers share a name (duplicating a whole layer to
 * start a second network leaves both a "two-way" and a "two-way-2", say),
 * but preserves the original name in `data-name`, which is what every
 * layer-role check below matches against instead of the raw id. Anchors
 * (destinations/origins circles) are deliberately read by their literal
 * `id` elsewhere, never through this — two anchors ending up with the same
 * *role* name here is fine (both are "a two-way road"), but two anchors
 * resolving to the same *identity* would be a real collision.
 */
function nameOf(el: Element): string | null {
  return el.getAttribute('data-name') ?? el.getAttribute('id')
}

function walk(
  root: Element,
  matrix: Matrix,
  visit: (el: Element, matrix: Matrix) => void,
): void {
  for (const child of Array.from(root.children) as Element[]) {
    const childMatrix = multiply(matrix, parseTransform(child.getAttribute('transform')))
    // A hidden layer is the normal case here, so display:none is never a
    // reason to skip an element - only an explicit data-ignore is.
    if (child.getAttribute('data-ignore') !== null) continue
    // Skip whole non-road subtrees: reference artwork and anchor layers.
    const childName = nameOf(child)
    if (childName && NON_ROAD_LAYERS.has(childName)) continue
    if (GEOMETRY_TAGS.has(child.tagName.toLowerCase())) {
      visit(child, childMatrix)
    }
    if (child.children.length > 0) walk(child, childMatrix, visit)
  }
}

/** Nearest ancestor sublayer decides the edge kind. */
function kindFor(el: Element, root: Element): EdgeKind {
  let current: Element | null = el
  while (current && current !== root.parentElement) {
    const name = nameOf(current)
    if (name && KIND_BY_LAYER[name]) return KIND_BY_LAYER[name]!
    current = current.parentElement
  }
  return 'path'
}

/** True when the element sits anywhere under a one-way sublayer. */
function isOneWay(el: Element, root: Element): boolean {
  let current: Element | null = el
  while (current && current !== root.parentElement) {
    if (nameOf(current) === ONEWAY_LAYER) return true
    current = current.parentElement
  }
  return false
}

/** Nearest recognised sublayer, or null if the path sits loose in the root. */
function groupFor(el: Element, root: Element): string | null {
  let current: Element | null = el
  while (current && current !== root.parentElement) {
    const name = nameOf(current)
    if (name && KNOWN_LAYERS.has(name)) return name
    current = current.parentElement
  }
  return null
}

/**
 * Shoelace signed area.
 *
 * Map space has y pointing *down*, which inverts the usual sign convention: a
 * negative area here is a ring that reads anticlockwise on screen.
 */
export function signedArea(points: readonly Point[]): number {
  let sum = 0
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    sum += a[0] * b[1] - b[0] * a[1]
  }
  return sum / 2
}

/** Reverse a ring in place unless it already circulates the wanted way. */
export function orientRing(
  points: Point[],
  circulation: 'anticlockwise' | 'clockwise',
): void {
  const isAnticlockwise = signedArea(points) < 0
  if (isAnticlockwise !== (circulation === 'anticlockwise')) points.reverse()
}

function number(el: Element, name: string, fallback = 0): number {
  const raw = el.getAttribute(name)
  if (raw === null) return fallback
  const value = Number.parseFloat(raw)
  return Number.isNaN(value) ? fallback : value
}

/** Normalise every supported shape to path data plus a closed flag. */
function toPathData(el: Element): { d: string; closed: boolean } | null {
  const tag = el.tagName.toLowerCase()
  switch (tag) {
    case 'path': {
      const d = el.getAttribute('d')
      if (!d) return null
      return { d, closed: /[zZ]\s*$/.test(d.trim()) }
    }
    case 'circle': {
      const cx = number(el, 'cx')
      const cy = number(el, 'cy')
      const r = number(el, 'r')
      if (r <= 0) return null
      // Two half-arcs, because a single arc of 360 degrees is a no-op in SVG.
      return {
        d: `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`,
        closed: true,
      }
    }
    case 'ellipse': {
      const cx = number(el, 'cx')
      const cy = number(el, 'cy')
      const rx = number(el, 'rx')
      const ry = number(el, 'ry')
      if (rx <= 0 || ry <= 0) return null
      return {
        d: `M ${cx - rx},${cy} A ${rx},${ry} 0 1,0 ${cx + rx},${cy} A ${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`,
        closed: true,
      }
    }
    case 'line':
      return {
        d: `M ${number(el, 'x1')},${number(el, 'y1')} L ${number(el, 'x2')},${number(el, 'y2')}`,
        closed: false,
      }
    case 'polyline':
    case 'polygon': {
      const raw = el.getAttribute('points')?.trim()
      if (!raw) return null
      const coords = raw.split(/[\s,]+/).map(Number)
      if (coords.length < 4) return null
      const parts: string[] = []
      for (let i = 0; i + 1 < coords.length; i += 2) {
        parts.push(`${i === 0 ? 'M' : 'L'} ${coords[i]},${coords[i + 1]}`)
      }
      const closed = tag === 'polygon'
      return { d: parts.join(' ') + (closed ? ' Z' : ''), closed }
    }
    case 'rect': {
      const x = number(el, 'x')
      const y = number(el, 'y')
      const w = number(el, 'width')
      const h = number(el, 'height')
      if (w <= 0 || h <= 0) return null
      return {
        d: `M ${x},${y} L ${x + w},${y} L ${x + w},${y + h} L ${x},${y + h} Z`,
        closed: true,
      }
    }
    default:
      return null
  }
}

/** Sample a path at a fixed arc-length step, baking the transform in. */
function flatten(d: string, matrix: Matrix, step: number): Point[] {
  const properties = new svgPathProperties(d)
  const total = properties.getTotalLength()
  if (!Number.isFinite(total) || total <= 0) return []

  const count = Math.max(2, Math.ceil(total / step))
  const points: Point[] = []
  for (let i = 0; i <= count; i++) {
    const at = (total * i) / count
    const { x, y } = properties.getPointAtLength(at)
    points.push(applyMatrix(matrix, x, y))
  }
  return points
}

/**
 * Douglas-Peucker, protecting a ring's closure.
 *
 * simplify-js would happily drop the duplicated first/last point of a closed
 * path, turning a roundabout into an open arc that no longer connects to
 * itself. Simplify the interior and re-close afterwards.
 */
function simplifyPoints(points: Point[], tolerance: number, closed: boolean): Point[] {
  if (tolerance <= 0) return points
  const input = points.map(([x, y]) => ({ x, y }))
  const simplified = simplify(input, tolerance, true).map(
    ({ x, y }) => [x, y] as Point,
  )
  if (!closed || simplified.length < 3) return simplified

  const first = simplified[0]!
  const last = simplified.at(-1)!
  if (first[0] !== last[0] || first[1] !== last[1]) simplified.push(first)
  return simplified
}

function readAnchors(
  document: Document,
  layerId: string | string[],
  svg: Element,
): ExtractedAnchor[] {
  const candidates = Array.isArray(layerId) ? layerId : [layerId]
  const anchors: ExtractedAnchor[] = []
  for (const { id: rootId, element: root } of findRoots(document, candidates, svg)) {
    walk(root, baseMatrixFor(root, svg), (el, matrix) => {
      const id = el.getAttribute('id')
      // An unnamed anchor cannot be referenced by the UI, so it is a
      // mis-export rather than a silently-ignorable element.
      if (!id) {
        throw new Error(
          `Anchor in #${rootId} has no id. Name it in the Layers panel and ` +
            `export with Object IDs -> Layer Names.`,
        )
      }
      anchors.push({ id, point: centroidOf(el, matrix) })
    })
  }
  return anchors
}

/** Anchors are usually small circles; fall back to the path midpoint. */
function centroidOf(el: Element, matrix: Matrix): Point {
  const tag = el.tagName.toLowerCase()
  if (tag === 'circle' || tag === 'ellipse') {
    return applyMatrix(matrix, number(el, 'cx'), number(el, 'cy'))
  }
  if (tag === 'rect') {
    return applyMatrix(
      matrix,
      number(el, 'x') + number(el, 'width') / 2,
      number(el, 'y') + number(el, 'height') / 2,
    )
  }
  const geometry = toPathData(el)
  if (!geometry) throw new Error(`Anchor ${el.getAttribute('id')} has no usable geometry`)
  const properties = new svgPathProperties(geometry.d)
  const { x, y } = properties.getPointAtLength(properties.getTotalLength() / 2)
  return applyMatrix(matrix, x, y)
}

export function extractFromFile(path: string, opts: ExtractOptions = {}): Extraction {
  return extractFromSvg(readFileSync(path, 'utf8'), opts)
}
