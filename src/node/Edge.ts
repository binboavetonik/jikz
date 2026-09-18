import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad, EPSILON } from '../utils/math'
import type { AnchorSpec, Anchorable } from '../core/Anchor'
import { bezierControlPoints } from '../path/bezier'

/**
 * Arrow tip styles. The named members are the built-ins; any name
 * registered via `registerArrowTip()` is accepted too (the
 * `string & {}` branch keeps autocomplete for built-ins).
 */
export type ArrowTip =
  | 'none'
  | 'stealth'    // TikZ stealth arrow
  | 'latex'      // LaTeX-style arrow
  | 'to'         // Simple triangle
  | '>'          // Alias for 'to'
  | '->'         // Right arrow only
  | '<-'         // Left arrow only
  | '<->'        // Both directions
  | '|'          // Bar/stop
  | '||'         // Double bar (TikZ `||`)
  | 'circle'     // Filled circle (TikZ `Circle`)
  | '*'          // Alias for 'circle'
  | 'openCircle' // Hollow circle (TikZ `Circle[open]`)
  | 'o'          // Alias for 'openCircle'
  | 'square'     // Filled square (TikZ `Square`)
  | 'diamond'    // Filled diamond (TikZ `Diamond`)
  | 'roundCap'   // Filled round cap (TikZ `Round Cap`)
  | 'doubleBar'  // Double bar (TikZ `||`)
  | (string & {})

/**
 * Edge path routing styles
 */
export type EdgeRouting =
  | 'straight'   // Direct line
  | 'horizontal-vertical' // TikZ -| path
  | 'vertical-horizontal' // TikZ |- path
  | 'bezier'     // Smooth curve

/**
 * Anchor spec accepted at edge endpoints: any {@link AnchorSpec} plus
 * `'auto'` — resolve to the border point along the ray toward the other
 * endpoint (TikZ `\draw (A) -- (B)` behavior). Previously `'auto'` was
 * smuggled in via a cast; this type makes it part of the contract.
 */
export type EdgeAnchorSpec = AnchorSpec | 'auto'

/**
 * Which side of the node a self-loop bulges out on — TikZ's
 * `loop above` / `loop below` / `loop left` / `loop right`.
 */
export type LoopDirection = 'above' | 'below' | 'left' | 'right'

/**
 * Out/in angles per loop direction, in the library's screen convention
 * (0° = east, clockwise, so 270° = north).
 *
 * These are TikZ's `loop <dir>` angles mapped across the convention
 * change. TikZ measures counter-clockwise in y-up space, and its `in`
 * names the direction *outward* from the target, where jikz's `in`
 * names the direction of travel *into* it — so a TikZ angle θ becomes
 * `360 − θ` for `out`, and `(360 − θ) + 180` for `in`. TikZ's
 * `loop above` (out=60, in=120) is therefore out=300, in=60 here.
 *
 * The result places both bezier control points on the named side, which
 * is what makes the loop bulge there.
 */
export const LOOP_ANGLES: Record<LoopDirection, { out: number; in: number }> = {
  above: { out: 300, in: 60 },
  below: { out: 120, in: 240 },
  left: { out: 210, in: 330 },
  right: { out: 30, in: 150 },
}

/** Default direction for a self-edge that does not name one. */
const DEFAULT_LOOP: LoopDirection = 'above'

/**
 * Default looseness for a self-loop. The chord between the two boundary
 * anchors is short, so the loop needs a much larger multiplier than a
 * normal edge to clear the node (TikZ's `every loop` uses 8).
 */
const DEFAULT_LOOP_LOOSENESS = 5

/**
 * Options for creating an edge
 */
export interface EdgeOptions {
  /**
   * Source anchor on the from node (default: auto-calculated)
   */
  fromAnchor?: EdgeAnchorSpec

  /**
   * Target anchor on the to node (default: auto-calculated)
   */
  toAnchor?: EdgeAnchorSpec

  /**
   * Arrow tip at the start
   */
  arrowStart?: ArrowTip

  /**
   * Arrow tip at the end
   */
  arrowEnd?: ArrowTip

  /**
   * Path routing style
   */
  routing?: EdgeRouting

  /**
   * Intermediate points for a polyline path (`straight` routing only).
   * The path runs start → points → end; arrowheads stay at the real
   * endpoints and the `'auto'` endpoint anchors aim at the first/last
   * point. This is TikZ's `bend_points` (used by layered dummy-node
   * edges).
   */
  bendPoints?: PointLike[]

  /**
   * Bend angle for curved paths in degrees.
   * Positive bends to the **left** of the travel direction (TikZ
   * `bend left`); negative bends right. Shortcut that sets symmetric
   * out/in angles.
   */
  bendAngle?: number

  /**
   * TikZ-style out angle: angle (degrees) at which the path leaves the
   * start point, in the library's screen convention: 0 = east,
   * 90 = south (down), 180 = west, 270 = north (up); clockwise positive.
   * Overrides bendAngle if specified.
   */
  out?: number

  /**
   * TikZ-style in angle: angle (degrees) at which the path arrives at
   * the end point, naming the direction of travel **into** the node —
   * so `in: 0` means "arrive heading east" (i.e. from the west side).
   * Same screen convention as `out`. Overrides bendAngle if specified.
   */
  in?: number

  /**
   * TikZ's `loop above` / `loop below` / `loop left` / `loop right`:
   * shorthand for the out/in angles that make a self-edge bulge out on
   * the named side. Sets `looseness` too, unless you pass your own.
   *
   * A self-edge with no `loop`, `out` or `in` defaults to `'above'`, so
   * `edge('A', 'A')` draws a visible loop rather than a zero-length
   * path. Explicit `out`/`in` always win.
   */
  loop?: LoopDirection

  /**
   * Looseness for bezier curves (default: 1)
   * Higher values = more curved, lower = tighter
   */
  looseness?: number

  /**
   * Looseness for the outgoing control point (overrides looseness for start)
   */
  outLooseness?: number

  /**
   * Looseness for the incoming control point (overrides looseness for end)
   */
  inLooseness?: number

  /**
   * Shorten the path at the start (in pixels)
   */
  shortenStart?: number

  /**
   * Shorten the path at the end (in pixels)
   */
  shortenEnd?: number

  /**
   * Label text
   */
  label?: string

  /**
   * Label position along path (0-1)
   */
  labelPos?: number

  /**
   * Label offset from the path, in pixels. Positive places the label to
   * the **left** of the travel direction (TikZ `auto=left`); negative
   * flips it to the right.
   */
  labelOffset?: number
}

/**
 * Default edge options.
 *
 * `fromAnchor` and `toAnchor` default to `'auto'`: the edge endpoint is
 * resolved by asking the node for the boundary point along the ray toward
 * the other endpoint's center. This keeps arrow tips on the node border
 * instead of at its center, which is how TikZ `\draw (A) -- (B);` behaves.
 *
 * Pass `'center'` explicitly to draw to/from the actual center point; pass
 * a named anchor (e.g. `'north'`) or a numeric angle to target a specific
 * point on the boundary.
 */
const DEFAULT_EDGE_OPTIONS = {
  fromAnchor: 'auto' as EdgeAnchorSpec,
  toAnchor: 'auto' as EdgeAnchorSpec,
  arrowStart: 'none' as ArrowTip,
  arrowEnd: 'stealth' as ArrowTip,
  routing: 'straight' as EdgeRouting,
  bendAngle: 0,
  loop: undefined as LoopDirection | undefined,
  out: undefined as number | undefined,
  in: undefined as number | undefined,
  looseness: 1,
  outLooseness: undefined as number | undefined,
  inLooseness: undefined as number | undefined,
  shortenStart: 0,
  shortenEnd: 0,
  label: '',
  labelPos: 0.5,
  labelOffset: 5,
}

/**
 * Whether both endpoints denote the same place — the same object, or
 * two Anchorables sitting on the same centre. Either way there is no
 * chord to route along, so the edge has to become a loop.
 */
function isSameEndpoint(
  from: PointLike | Anchorable,
  to: PointLike | Anchorable
): boolean {
  if (from === to) return true
  if ('anchor' in from && 'anchor' in to) {
    return (
      Math.abs(from.center.x - to.center.x) < EPSILON &&
      Math.abs(from.center.y - to.center.y) < EPSILON
    )
  }
  return false
}

/**
 * Interpret TikZ-style arrow specs. `'->'`/`'<-'`/`'<->'` describe the
 * whole path's decoration in one token, so they redistribute across
 * start/end: `arrowEnd: '<-'` puts the tip at the START, exactly like
 * TikZ `\draw[<-]`. Concrete tip names ('stealth', 'latex', 'to', '|')
 * are positional and left alone. Pure — the constructor assigns the
 * result to its readonly fields once.
 */
function normalizeArrowTips(
  arrowStart: ArrowTip,
  arrowEnd: ArrowTip
): { start: ArrowTip; end: ArrowTip } {
  let start = arrowStart
  let end = arrowEnd
  for (const [key, value] of [
    ['arrowEnd', arrowEnd],
    ['arrowStart', arrowStart],
  ] as const) {
    if (value === '->') {
      end = 'to'
    } else if (value === '<-') {
      start = 'to'
      if (key === 'arrowEnd') end = 'none'
    } else if (value === '<->') {
      start = 'to'
      end = 'to'
    }
  }
  return { start, end }
}

/**
 * An edge connecting two nodes or points
 */
export class Edge {
  readonly kind = 'edge' as const
  readonly from: Point
  readonly to: Point
  readonly fromAnchor: EdgeAnchorSpec
  readonly toAnchor: EdgeAnchorSpec
  readonly arrowStart: ArrowTip
  readonly arrowEnd: ArrowTip
  readonly routing: EdgeRouting
  readonly bendAngle: number
  readonly outAngle?: number
  readonly inAngle?: number
  readonly looseness: number
  readonly outLooseness?: number
  readonly inLooseness?: number
  readonly shortenStart: number
  readonly shortenEnd: number
  readonly label: string
  readonly labelPos: number
  readonly labelOffset: number
  readonly bendPoints: Point[]

  // Control points for bezier curves
  private _controlPoints?: [Point, Point]

  constructor(
    from: PointLike | Anchorable,
    to: PointLike | Anchorable,
    options: EdgeOptions = {}
  ) {
    const opts = { ...DEFAULT_EDGE_OPTIONS, ...options }

    // A self-edge has no chord to aim along, so the loop's out/in
    // angles have to be settled BEFORE the anchors are resolved — they
    // are what 'auto' aims at. `edge('A', 'A')` with nothing else said
    // becomes a loop above rather than a zero-length path.
    const selfEdge = isSameEndpoint(from, to)
    if (selfEdge) {
      const named = opts.loop ?? (opts.out === undefined && opts.in === undefined
        ? DEFAULT_LOOP
        : undefined)
      if (named) {
        const angles = LOOP_ANGLES[named]
        opts.out = opts.out ?? angles.out
        opts.in = opts.in ?? angles.in
      }
      if (options.looseness === undefined) opts.looseness = DEFAULT_LOOP_LOOSENESS
    } else if (opts.loop) {
      const angles = LOOP_ANGLES[opts.loop]
      opts.out = opts.out ?? angles.out
      opts.in = opts.in ?? angles.in
      if (options.looseness === undefined) opts.looseness = DEFAULT_LOOP_LOOSENESS
    }

    // Resolve intermediate bend points (polyline routing).
    this.bendPoints = (opts.bendPoints ?? []).map((p) => point(p.x, p.y))
    const firstBend = this.bendPoints[0]
    const lastBend = this.bendPoints[this.bendPoints.length - 1]

    // Resolve from point — 'auto' aims at the first bend point if any.
    // On a self-edge there is no other endpoint to aim at, so 'auto'
    // takes the boundary point in the direction the path leaves.
    if ('anchor' in from) {
      // It's an Anchorable (Node)
      this.fromAnchor = opts.fromAnchor
      this.from =
        selfEdge && opts.fromAnchor === 'auto' && opts.out !== undefined
          ? from.anchor(opts.out)
          : this.resolveAnchor(from, firstBend ?? to, opts.fromAnchor)
    } else {
      this.fromAnchor = 'center'
      this.from = point(from.x, from.y)
    }

    // Resolve to point — 'auto' aims at the last bend point if any.
    // On a self-edge it takes the boundary point the path comes back
    // to: `in` is the direction of travel inward, so the anchor sits
    // 180° round from it.
    if ('anchor' in to) {
      // It's an Anchorable (Node)
      this.toAnchor = opts.toAnchor
      this.to =
        selfEdge && opts.toAnchor === 'auto' && opts.in !== undefined
          ? to.anchor(opts.in + 180)
          : this.resolveAnchor(to, lastBend ?? from, opts.toAnchor)
    } else {
      this.toAnchor = 'center'
      this.to = point(to.x, to.y)
    }

    const tips = normalizeArrowTips(opts.arrowStart, opts.arrowEnd)
    this.arrowStart = tips.start
    this.arrowEnd = tips.end
    // out/in/bendAngle imply bezier routing — otherwise the curve
    // options would be silently ignored and the edge render straight.
    this.routing =
      opts.out !== undefined || opts.in !== undefined || opts.bendAngle !== 0
        ? 'bezier'
        : opts.routing
    this.bendAngle = opts.bendAngle
    this.outAngle = opts.out
    this.inAngle = opts.in
    this.looseness = opts.looseness
    this.outLooseness = opts.outLooseness
    this.inLooseness = opts.inLooseness
    this.shortenStart = opts.shortenStart
    this.shortenEnd = opts.shortenEnd
    this.label = opts.label
    this.labelPos = opts.labelPos
    this.labelOffset = opts.labelOffset
  }

  /**
   * Resolve an anchor specification to a point on (or within) `node`.
   *
   * - `'auto'` (the default) computes the boundary point along the ray
   *   from `node.center` toward `other`'s center — the edge terminates on
   *   the node border, pointing at the other endpoint.
   * - `'center'` returns the node's actual center. Previously this silently
   *   aliased to `'auto'`; the refactor makes the two means-what-it-says.
   * - Any other spec is delegated to `node.anchor(spec)` (named cardinals,
   *   corners, numeric angles, aliases).
   */
  private resolveAnchor(
    node: Anchorable,
    other: PointLike | Anchorable,
    spec: EdgeAnchorSpec
  ): Point {
    if (spec === 'auto') {
      const otherCenter =
        'center' in other ? other.center : point(other.x, other.y)
      const angle = node.center.angleTo(otherCenter)
      return node.anchor(angle)
    }
    return node.anchor(spec)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start point (with shortening applied)
   */
  get start(): Point {
    if (this.shortenStart === 0) return this.from
    return this.from.towardByDistance(this.to, this.shortenStart)
  }

  /**
   * End point (with shortening applied)
   */
  get end(): Point {
    if (this.shortenEnd === 0) return this.to
    return this.to.towardByDistance(this.from, this.shortenEnd)
  }

  /**
   * Length of the direct path
   */
  get length(): number {
    return this.from.distanceTo(this.to)
  }

  /**
   * Midpoint of the edge
   */
  get midpoint(): Point {
    return this.pointAt(0.5)
  }

  /**
   * Angle from start to end in degrees
   */
  get angle(): number {
    return this.from.angleTo(this.to)
  }

  /**
   * Bounding box as [minX, minY, maxX, maxY].
   *
   * Includes the bend points and, on a curved edge, the bezier control
   * points — a bent edge or a loop bulges well past its endpoints, and a
   * box that ignored that would clip it. Control points bound the curve
   * conservatively (the curve lies inside their hull), so the box is
   * never too small. Stroke width and arrow tips are not included.
   */
  get bounds(): [number, number, number, number] {
    const pts: Point[] = [this.from, this.to, ...this.bendPoints]
    if (this.routing === 'bezier') pts.push(...this.controlPoints)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    return [minX, minY, maxX, maxY]
  }

  /**
   * Control points for bezier routing
   */
  get controlPoints(): [Point, Point] {
    if (this._controlPoints) return this._controlPoints

    this._controlPoints = bezierControlPoints(this.from, this.to, {
      out: this.outAngle,
      in: this.inAngle,
      bend: this.bendAngle,
      looseness: this.looseness,
      outLooseness: this.outLooseness,
      inLooseness: this.inLooseness,
    })

    return this._controlPoints
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Path Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get point at parameter t along the path (0 = start, 1 = end)
   */
  pointAt(t: number): Point {
    switch (this.routing) {
      case 'horizontal-vertical': {
        // -| path: horizontal first, then vertical
        const corner = point(this.end.x, this.start.y)
        const totalDist = Math.abs(this.end.x - this.start.x) + Math.abs(this.end.y - this.start.y)
        const horizDist = Math.abs(this.end.x - this.start.x)
        const horizT = totalDist > 0 ? horizDist / totalDist : 0.5

        if (t <= horizT) {
          return this.start.toward(corner, t / horizT)
        } else {
          return corner.toward(this.end, (t - horizT) / (1 - horizT))
        }
      }

      case 'vertical-horizontal': {
        // |- path: vertical first, then horizontal
        const corner = point(this.start.x, this.end.y)
        const totalDist = Math.abs(this.end.x - this.start.x) + Math.abs(this.end.y - this.start.y)
        const vertDist = Math.abs(this.end.y - this.start.y)
        const vertT = totalDist > 0 ? vertDist / totalDist : 0.5

        if (t <= vertT) {
          return this.start.toward(corner, t / vertT)
        } else {
          return corner.toward(this.end, (t - vertT) / (1 - vertT))
        }
      }

      case 'bezier': {
        // Cubic bezier
        const [cp1, cp2] = this.controlPoints
        const t2 = t * t
        const t3 = t2 * t
        const mt = 1 - t
        const mt2 = mt * mt
        const mt3 = mt2 * mt

        return point(
          mt3 * this.start.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * this.end.x,
          mt3 * this.start.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * this.end.y
        )
      }

      case 'straight':
      default: {
        if (this.bendPoints.length === 0) {
          return this.start.toward(this.end, t)
        }
        const pts = [this.start, ...this.bendPoints, this.end]
        const segLens: number[] = []
        let total = 0
        for (let i = 0; i < pts.length - 1; i++) {
          const seg = pts[i]!.distanceTo(pts[i + 1]!)
          segLens.push(seg)
          total += seg
        }
        let target = t * total
        for (let i = 0; i < segLens.length; i++) {
          const seg = segLens[i]!
          if (target <= seg || i === segLens.length - 1) {
            return pts[i]!.toward(pts[i + 1]!, seg > 0 ? target / seg : 0)
          }
          target -= seg
        }
        return pts[pts.length - 1]!
      }
    }
  }

  /**
   * Get tangent angle at parameter t (in degrees)
   */
  tangentAt(t: number): number {
    const delta = 0.001
    const p1 = this.pointAt(Math.max(0, t - delta))
    const p2 = this.pointAt(Math.min(1, t + delta))
    return p1.angleTo(p2)
  }

  /**
   * Get label position point: the point on the path at `labelPos`,
   * offset to the left of the travel direction by `labelOffset`
   * (TikZ `auto=left`; negative offset flips sides).
   */
  get labelPoint(): Point {
    const p = this.pointAt(this.labelPos)
    const tangent = this.tangentAt(this.labelPos)
    // Left of travel = counterclockwise normal = tangent − 90° in
    // screen convention.
    const normalAngle = tangent - 90
    const rad = degToRad(normalAngle)
    return point(
      p.x + this.labelOffset * Math.cos(rad),
      p.y + this.labelOffset * Math.sin(rad)
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Path Generation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get waypoints for the path (for non-bezier routing)
   */
  get waypoints(): Point[] {
    switch (this.routing) {
      case 'horizontal-vertical':
        return [this.start, point(this.end.x, this.start.y), this.end]

      case 'vertical-horizontal':
        return [this.start, point(this.start.x, this.end.y), this.end]

      case 'straight':
      default:
        return this.bendPoints.length > 0
          ? [this.start, ...this.bendPoints, this.end]
          : [this.start, this.end]
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate SVG path data
   */
  toSVGPath(): string {
    switch (this.routing) {
      case 'horizontal-vertical': {
        const corner = point(this.end.x, this.start.y)
        return `M ${this.start.x} ${this.start.y} L ${corner.x} ${corner.y} L ${this.end.x} ${this.end.y}`
      }

      case 'vertical-horizontal': {
        const corner = point(this.start.x, this.end.y)
        return `M ${this.start.x} ${this.start.y} L ${corner.x} ${corner.y} L ${this.end.x} ${this.end.y}`
      }

      case 'bezier': {
        const [cp1, cp2] = this.controlPoints
        return `M ${this.start.x} ${this.start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${this.end.x} ${this.end.y}`
      }

      case 'straight':
      default: {
        if (this.bendPoints.length === 0) {
          return `M ${this.start.x} ${this.start.y} L ${this.end.x} ${this.end.y}`
        }
        const pts = [this.start, ...this.bendPoints, this.end]
        return pts
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ')
      }
    }
  }

  /**
   * Generate SVG marker ID for arrow tips
   */
  static arrowMarkerId(tip: ArrowTip): string {
    return `arrow-${tip}`
  }

  /**
   * Generate SVG marker definition for an arrow tip
   */
  static arrowMarkerDef(tip: ArrowTip, color = '#000'): string {
    const id = Edge.arrowMarkerId(tip)

    switch (tip) {
      case 'stealth':
        return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 L 3 5 z" fill="${color}"/>
        </marker>`

      case 'latex':
        return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="${color}" stroke-width="1.5"/>
        </marker>`

      case 'to':
      case '>':
        return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/>
        </marker>`

      case '|':
        return `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 5 0 L 5 10" stroke="${color}" stroke-width="2"/>
        </marker>`

      default:
        return ''
    }
  }

  toString(): string {
    return `Edge(${this.from} -> ${this.to}, ${this.routing})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an edge between two nodes or points
 */
export function edge(
  from: PointLike | Anchorable,
  to: PointLike | Anchorable,
  options: EdgeOptions = {}
): Edge {
  return new Edge(from, to, options)
}

/**
 * Create a straight edge with an arrow at the end
 */
export function arrow(
  from: PointLike | Anchorable,
  to: PointLike | Anchorable,
  options: Omit<EdgeOptions, 'arrowEnd'> = {}
): Edge {
  return new Edge(from, to, { ...options, arrowEnd: 'stealth' })
}

/**
 * Create a bidirectional edge
 */
export function biEdge(
  from: PointLike | Anchorable,
  to: PointLike | Anchorable,
  options: Omit<EdgeOptions, 'arrowStart' | 'arrowEnd'> = {}
): Edge {
  return new Edge(from, to, { ...options, arrowStart: 'stealth', arrowEnd: 'stealth' })
}

/**
 * Create a bent edge (curved path)
 */
export function bentEdge(
  from: PointLike | Anchorable,
  to: PointLike | Anchorable,
  bendAngle: number,
  options: Omit<EdgeOptions, 'routing' | 'bendAngle'> = {}
): Edge {
  return new Edge(from, to, { ...options, routing: 'bezier', bendAngle })
}

/**
 * TikZ-style "to" path with out/in angles
 * Creates a curved edge leaving at `out` angle and arriving at `in` angle
 *
 * @example
 * // Curve leaving A heading up-right, arriving at B heading down-right
 * toEdge(A, B, 315, 45)
 *
 * // Self-loop going out the top and back in from the right
 * toEdge(node, node, 270, 0, { looseness: 4 })
 */
export function toEdge(
  from: PointLike | Anchorable,
  to: PointLike | Anchorable,
  out: number,
  inAngle: number,
  options: Omit<EdgeOptions, 'out' | 'in' | 'routing'> = {}
): Edge {
  return new Edge(from, to, { ...options, out, in: inAngle })
}

/**
 * Create a "bend left" edge (TikZ style)
 * The path curves to the left of the straight line
 *
 * @param angle - Bend angle in degrees (default: 30)
 */
export function bendLeft(
  from: PointLike | Anchorable,
  to: PointLike | Anchorable,
  angle = 30,
  options: Omit<EdgeOptions, 'routing' | 'bendAngle'> = {}
): Edge {
  return new Edge(from, to, { ...options, routing: 'bezier', bendAngle: angle })
}

/**
 * Create a "bend right" edge (TikZ style)
 * The path curves to the right of the straight line
 *
 * @param angle - Bend angle in degrees (default: 30)
 */
export function bendRight(
  from: PointLike | Anchorable,
  to: PointLike | Anchorable,
  angle = 30,
  options: Omit<EdgeOptions, 'routing' | 'bendAngle'> = {}
): Edge {
  return new Edge(from, to, { ...options, routing: 'bezier', bendAngle: -angle })
}

/**
 * Create a self-loop edge — TikZ's `\draw (A) to[loop above] (A);`
 *
 * Sugar for `edge(node, node, { loop: direction })`. On an
 * {@link Anchorable} the two endpoints land on the node's boundary in
 * the out and in directions, so the loop hangs off the named side; on a
 * bare point they coincide and `looseness` alone sets the size.
 *
 * @param node - The node to create a loop on
 * @param direction - Direction of the loop: 'above', 'below', 'left', 'right' (default: 'above')
 * @param options - Additional edge options
 */
export function loopEdge(
  node: PointLike | Anchorable,
  direction: LoopDirection = 'above',
  options: Omit<EdgeOptions, 'out' | 'in' | 'routing' | 'loop'> = {}
): Edge {
  return new Edge(node, node, { ...options, loop: direction })
}
