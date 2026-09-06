import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad, EPSILON } from '../utils/math'
import type { AnchorSpec, Anchorable } from '../core/Anchor'

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

  // Control points for bezier curves
  private _controlPoints?: [Point, Point]

  constructor(
    from: PointLike | Anchorable,
    to: PointLike | Anchorable,
    options: EdgeOptions = {}
  ) {
    const opts = { ...DEFAULT_EDGE_OPTIONS, ...options }

    // Resolve from point
    if ('anchor' in from) {
      // It's an Anchorable (Node)
      this.fromAnchor = opts.fromAnchor
      this.from = this.resolveAnchor(from, to, opts.fromAnchor)
    } else {
      this.fromAnchor = 'center'
      this.from = point(from.x, from.y)
    }

    // Resolve to point
    if ('anchor' in to) {
      // It's an Anchorable (Node)
      this.toAnchor = opts.toAnchor
      this.to = this.resolveAnchor(to, from, opts.toAnchor)
    } else {
      this.toAnchor = 'center'
      this.to = point(to.x, to.y)
    }

    this.arrowStart = opts.arrowStart
    this.arrowEnd = opts.arrowEnd
    this.normalizeArrowTips()
    this.routing = opts.routing
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

    // If out/in/bendAngle is specified, automatically use bezier
    // routing — otherwise the curve options are silently ignored and
    // the edge renders straight.
    if (this.outAngle !== undefined || this.inAngle !== undefined || this.bendAngle !== 0) {
      (this as { routing: EdgeRouting }).routing = 'bezier'
    }
  }

  /**
   * Interpret TikZ-style arrow specs. `'->'`/`'<-'`/`'<->'` describe
   * the whole path's decoration in one token, so they redistribute
   * across arrowStart/arrowEnd: `arrowEnd: '<-'` puts the tip at the
   * START, exactly like TikZ `\draw[<-]`. Concrete tip names
   * ('stealth', 'latex', 'to', '|') are positional and left alone.
   */
  private normalizeArrowTips(): void {
    const self = this as { arrowStart: ArrowTip; arrowEnd: ArrowTip }
    for (const [key, value] of [
      ['arrowEnd', self.arrowEnd],
      ['arrowStart', self.arrowStart],
    ] as const) {
      if (value === '->') {
        self.arrowEnd = 'to'
      } else if (value === '<-') {
        self.arrowStart = 'to'
        if (key === 'arrowEnd') self.arrowEnd = 'none'
      } else if (value === '<->') {
        self.arrowStart = 'to'
        self.arrowEnd = 'to'
      }
    }
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
   * Control points for bezier routing
   */
  get controlPoints(): [Point, Point] {
    if (this._controlPoints) return this._controlPoints

    // Self-edges have zero endpoint distance, which would collapse
    // all control offsets to the point itself (the loop vanishes).
    // TikZ's loop opens regardless, so use a nominal chord: looseness
    // alone then drives the loop size.
    const effectiveLength = this.length < EPSILON ? 40 : this.length
    const baseDist = effectiveLength * this.looseness * 0.4
    const baseAngle = this.angle

    // Calculate looseness for each control point
    const outLoose = this.outLooseness ?? this.looseness
    const inLoose = this.inLooseness ?? this.looseness
    const outDist = effectiveLength * outLoose * 0.4
    const inDist = effectiveLength * inLoose * 0.4

    if (this.outAngle !== undefined || this.inAngle !== undefined) {
      // TikZ-style out/in angles (absolute angles)
      // out: angle leaving the start point
      // in: angle arriving at the end point (we need the opposite direction for control point)
      const outAng = this.outAngle ?? baseAngle
      const inAng = this.inAngle !== undefined ? this.inAngle + 180 : baseAngle + 180

      this._controlPoints = [
        point(
          this.start.x + outDist * Math.cos(degToRad(outAng)),
          this.start.y + outDist * Math.sin(degToRad(outAng))
        ),
        point(
          this.end.x + inDist * Math.cos(degToRad(inAng)),
          this.end.y + inDist * Math.sin(degToRad(inAng))
        ),
      ]
    } else if (this.bendAngle !== 0) {
      // Bent path (symmetric bend). Positive bendAngle bends LEFT of the
      // travel direction — counterclockwise on screen — so the outgoing
      // direction rotates by −bendAngle in our clockwise-positive angle
      // convention.
      const outAngle = baseAngle - this.bendAngle
      const inAngle = baseAngle + 180 + this.bendAngle

      this._controlPoints = [
        point(
          this.start.x + baseDist * Math.cos(degToRad(outAngle)),
          this.start.y + baseDist * Math.sin(degToRad(outAngle))
        ),
        point(
          this.end.x + baseDist * Math.cos(degToRad(inAngle)),
          this.end.y + baseDist * Math.sin(degToRad(inAngle))
        ),
      ]
    } else {
      // Straight bezier
      this._controlPoints = [
        this.start.toward(this.end, 0.33),
        this.start.toward(this.end, 0.67),
      ]
    }

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
      default:
        return this.start.toward(this.end, t)
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
        return [this.start, this.end]
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
      default:
        return `M ${this.start.x} ${this.start.y} L ${this.end.x} ${this.end.y}`
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
 * Create a self-loop edge (for connecting a node to itself)
 *
 * @param node - The node to create a loop on
 * @param direction - Direction of the loop: 'above', 'below', 'left', 'right' (default: 'above')
 * @param options - Additional edge options
 */
export function loopEdge(
  node: PointLike | Anchorable,
  direction: 'above' | 'below' | 'left' | 'right' = 'above',
  options: Omit<EdgeOptions, 'out' | 'in' | 'routing' | 'looseness'> = {}
): Edge {
  // Screen convention: up = 270°, down = 90°. The loop leaves and
  // returns on the named side of the node.
  const angles = {
    above: { out: 240, in: 300 },
    below: { out: 120, in: 60 },
    left: { out: 210, in: 150 },
    right: { out: 330, in: 30 },
  }
  const { out, in: inAngle } = angles[direction]
  return new Edge(node, node, { ...options, out, in: inAngle, looseness: 5 })
}
