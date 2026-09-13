import { Point, point } from './Point'
import type { PointLike } from './types'
import { normalizeAngle, degToRad } from '../utils/math'

/**
 * Standard anchor names following TikZ conventions.
 */
export type CardinalAnchor =
  | 'center'
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'north east'
  | 'north west'
  | 'south east'
  | 'south west'

/**
 * Additional anchors for text positioning.
 */
export type TextAnchor = 'base' | 'base east' | 'base west' | 'mid' | 'mid east' | 'mid west'

/**
 * All standard anchor names.
 */
export type StandardAnchor = CardinalAnchor | TextAnchor

/**
 * Anchor specification: a named anchor, an angle in degrees, or a free-form string
 * (aliases like 'n', 'sw', 'c', or 'NN.Ndeg').
 */
export type AnchorSpec = StandardAnchor | number | string

/**
 * Interface for objects that provide anchors.
 * Implemented by geometric shapes and by Nodes.
 */
export interface Anchorable {
  /**
   * Get anchor point by name or angle.
   */
  anchor(spec: AnchorSpec): Point

  /**
   * Center point.
   */
  readonly center: Point
}

/**
 * Map of cardinal anchor names to angles in degrees.
 *
 * Angles follow the **screen convention** used throughout the library:
 * 0° = east, and angles increase **clockwise** in SVG's y-down space
 * (matching `Math.atan2(dy, dx)` and SVG's `rotate()`). Consequently
 * 90° = south (down) and 270° = north (up). Compass names always refer
 * to what you see on screen: `north` is the visual top of the shape.
 *
 * Note this differs from TikZ's *numeric* anchors, where `(A.90)` is the
 * top of the node. Here `A.north` == `A.270`. Named anchors match TikZ;
 * bare numbers match the screen.
 *
 * `center` is encoded as NaN and handled separately by consumers.
 */
export const ANCHOR_ANGLES: Record<CardinalAnchor, number> = {
  center: NaN,
  east: 0,
  south: 90,
  west: 180,
  north: 270,
  'south east': 45,
  'south west': 135,
  'north west': 225,
  'north east': 315,
}

const ANCHOR_ALIASES: Record<string, CardinalAnchor> = {
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  ne: 'north east',
  nw: 'north west',
  se: 'south east',
  sw: 'south west',
  northeast: 'north east',
  northwest: 'north west',
  southeast: 'south east',
  southwest: 'south west',
}

/**
 * Thrown by {@link parseAnchorSpec} for unrecognized anchor specs.
 * Strict by design: a typo'd anchor must fail loudly, not silently
 * render a plausible-looking wrong diagram.
 */
export class AnchorError extends Error {
  /** The spec that failed to parse. */
  readonly spec: AnchorSpec

  /** Custom names the shape does answer to, when it has any. */
  readonly known: readonly string[]

  constructor(spec: AnchorSpec, known: readonly string[] = []) {
    super(
      `Unknown anchor: ${JSON.stringify(spec)}. Expected a cardinal name ` +
        `('north', 'south east', …), an alias ('n', 'ne', 'c', …), a ` +
        `numeric angle (30 or '30deg'), or 'center'.` +
        (known.length
          ? ` This shape's own anchors: ${known.map((n) => `"${n}"`).join(', ')}.`
          : ` Custom anchor names (e.g. ports) must be intercepted by the ` +
            `shape's own anchor() before delegating to parseAnchorSpec.`)
    )
    this.name = 'AnchorError'
    this.spec = spec
    this.known = known
  }
}

/**
 * Parse an anchor specification into an angle (degrees, screen
 * convention — see {@link ANCHOR_ANGLES}), or null for center.
 * Numeric specs pass through normalized to [0, 360).
 *
 * @throws {AnchorError} on unrecognized string specs — there is no
 * silent fallback. Shape implementations with custom anchor names must
 * handle them before delegating.
 */
export function parseAnchorSpec(spec: AnchorSpec): number | null {
  if (typeof spec === 'number') {
    return normalizeAngle(spec)
  }

  const normalized = spec.toLowerCase().trim()

  if (normalized === 'center' || normalized === 'c') {
    return null
  }

  if (normalized in ANCHOR_ANGLES) {
    const angle = ANCHOR_ANGLES[normalized as CardinalAnchor]
    return Number.isNaN(angle) ? null : angle
  }

  if (normalized in ANCHOR_ALIASES) {
    return ANCHOR_ANGLES[ANCHOR_ALIASES[normalized]!]
  }

  const numMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(?:deg)?$/)
  if (numMatch) {
    return normalizeAngle(parseFloat(numMatch[1]!))
  }

  throw new AnchorError(spec)
}

const TEXT_ANCHOR_NAMES: ReadonlySet<string> = new Set([
  'base',
  'base east',
  'base west',
  'mid',
  'mid east',
  'mid west',
])

/**
 * Whether `spec` names a text anchor ('base', 'mid', 'base east', …).
 *
 * Text anchors are typographic — they depend on text metrics, not shape
 * geometry — so they are NOT handled by {@link parseAnchorSpec} or the
 * `anchorOn*` shape calculators. `Node.anchor` intercepts them and
 * computes them from the node's measured text; shape-level `anchor()`
 * implementations should never see them (and would warn via
 * `parseAnchorSpec`'s unknown-anchor fallback if they did).
 */
export function isTextAnchor(spec: AnchorSpec): spec is TextAnchor {
  return (
    typeof spec === 'string' && TEXT_ANCHOR_NAMES.has(spec.toLowerCase().trim())
  )
}

/**
 * Get the opposite anchor.
 * For named anchors: flips cardinal directions.
 * For numeric angles: adds 180°.
 */
export function oppositeAnchor(spec: AnchorSpec): AnchorSpec {
  if (typeof spec === 'number') {
    return normalizeAngle(spec + 180)
  }

  const opposites: Record<string, CardinalAnchor> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
    'north east': 'south west',
    'north west': 'south east',
    'south east': 'north west',
    'south west': 'north east',
    n: 'south',
    s: 'north',
    e: 'west',
    w: 'east',
    ne: 'south west',
    nw: 'south east',
    se: 'north west',
    sw: 'north east',
    northeast: 'south west',
    northwest: 'south east',
    southeast: 'north west',
    southwest: 'north east',
  }

  const normalized = spec.toLowerCase().trim()
  return opposites[normalized] ?? spec
}

// ─────────────────────────────────────────────────────────────────────────────
// Anchor point calculators (shared by geometry shapes and node shapes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Corner-name → unit-direction signs for {@link anchorOnRect}'s corner
 * fast-path.
 *
 * Named corner anchors must resolve to the literal bounding-box corner,
 * NOT to the border point on the named angle's ray — a wide rectangle's
 * 315° ray hits the top edge, not the NE corner. All alias forms are
 * listed here so this fast-path is the single place that knows corner
 * syntax. ({@link parseAnchorSpec} deliberately maps the same names to
 * angles, which is correct for shapes whose diagonal anchors DO lie on
 * the center ray — circle, ellipse, diamond.)
 */
const RECT_CORNER_SIGNS: Record<string, readonly [number, number]> = {
  'north east': [1, -1],
  northeast: [1, -1],
  ne: [1, -1],
  'north west': [-1, -1],
  northwest: [-1, -1],
  nw: [-1, -1],
  'south east': [1, 1],
  southeast: [1, 1],
  se: [1, 1],
  'south west': [-1, 1],
  southwest: [-1, 1],
  sw: [-1, 1],
}

/**
 * Calculate anchor point on an axis-aligned bounding box.
 *
 * This is the single source of truth for rectangle anchoring:
 * {@link Rectangle.anchor} and `Rectangle.boundaryPoint` delegate here.
 */
export function anchorOnRect(
  center: PointLike,
  width: number,
  height: number,
  spec: AnchorSpec
): Point {
  const halfW = width / 2
  const halfH = height / 2

  if (typeof spec === 'string') {
    const signs = RECT_CORNER_SIGNS[spec.toLowerCase().trim()]
    if (signs) {
      return point(center.x + signs[0] * halfW, center.y + signs[1] * halfH)
    }
  }

  const angle = parseAnchorSpec(spec)

  if (angle === null) {
    return point(center.x, center.y)
  }

  const rad = degToRad(angle)
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)

  let t = Infinity

  if (dx !== 0) {
    const tRight = halfW / dx
    const tLeft = -halfW / dx
    if (tRight > 0) t = Math.min(t, tRight)
    if (tLeft > 0) t = Math.min(t, tLeft)
  }

  if (dy !== 0) {
    const tTop = halfH / dy
    const tBottom = -halfH / dy
    if (tTop > 0) t = Math.min(t, tTop)
    if (tBottom > 0) t = Math.min(t, tBottom)
  }

  if (!isFinite(t)) {
    return point(center.x, center.y)
  }

  return point(center.x + dx * t, center.y + dy * t)
}

/**
 * Calculate anchor point on a circle.
 */
export function anchorOnCircle(
  center: PointLike,
  radius: number,
  spec: AnchorSpec
): Point {
  const angle = parseAnchorSpec(spec)

  if (angle === null) {
    return point(center.x, center.y)
  }

  const rad = degToRad(angle)
  return point(
    center.x + radius * Math.cos(rad),
    center.y + radius * Math.sin(rad)
  )
}

/**
 * Calculate anchor point on an ellipse.
 *
 * Single source of truth for ellipse anchoring — {@link Ellipse.anchor}
 * delegates here. `rotation` (degrees, clockwise on screen) matches
 * `Ellipse.rotation`; omit it for axis-aligned ellipses.
 */
export function anchorOnEllipse(
  center: PointLike,
  radiusX: number,
  radiusY: number,
  spec: AnchorSpec,
  rotation = 0
): Point {
  const angle = parseAnchorSpec(spec)

  if (angle === null) {
    return point(center.x, center.y)
  }

  const rad = degToRad(angle)
  const x = radiusX * Math.cos(rad)
  const y = radiusY * Math.sin(rad)

  if (rotation === 0) {
    return point(center.x + x, center.y + y)
  }

  const rotRad = degToRad(rotation)
  const cosRot = Math.cos(rotRad)
  const sinRot = Math.sin(rotRad)
  return point(
    center.x + x * cosRot - y * sinRot,
    center.y + x * sinRot + y * cosRot
  )
}

/**
 * Calculate anchor point on a diamond (axis-aligned rhombus with width/height).
 */
export function anchorOnDiamond(
  center: PointLike,
  width: number,
  height: number,
  spec: AnchorSpec
): Point {
  const angle = parseAnchorSpec(spec)

  if (angle === null) {
    return point(center.x, center.y)
  }

  const halfW = width / 2
  const halfH = height / 2

  const rad = degToRad(angle)
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)

  const t = 1 / (Math.abs(dx) / halfW + Math.abs(dy) / halfH)

  return point(center.x + dx * t, center.y + dy * t)
}
