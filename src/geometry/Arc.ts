import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad, normalizeAngle, EPSILON, approxEqual } from '../utils/math'
import { Circle } from './Circle'

/**
 * An arc of a circle, defined by center, radius, start angle, and end angle
 */
export class Arc {
  readonly kind = 'arc' as const
  readonly center: Point
  readonly radius: number
  readonly startAngle: number // degrees
  readonly endAngle: number // degrees
  readonly clockwise: boolean

  constructor(
    center: PointLike,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise = false
  ) {
    this.center = point(center.x, center.y)
    this.radius = Math.abs(radius)
    this.startAngle = normalizeAngle(startAngle)
    this.endAngle = normalizeAngle(endAngle)
    this.clockwise = clockwise
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start point of the arc
   */
  get start(): Point {
    return this.pointAt(0)
  }

  /**
   * End point of the arc
   */
  get end(): Point {
    return this.pointAt(1)
  }

  /**
   * Middle point of the arc
   */
  get midpoint(): Point {
    return this.pointAt(0.5)
  }

  /**
   * Sweep angle in degrees (always positive)
   * When startAngle equals endAngle, returns 360 (full circle)
   */
  get sweep(): number {
    // When start equals end, it's a full circle
    if (approxEqual(this.startAngle, this.endAngle, EPSILON)) {
      return 360
    }

    if (this.clockwise) {
      if (this.startAngle > this.endAngle) {
        return this.startAngle - this.endAngle
      }
      return 360 - this.endAngle + this.startAngle
    } else {
      if (this.endAngle > this.startAngle) {
        return this.endAngle - this.startAngle
      }
      return 360 - this.startAngle + this.endAngle
    }
  }

  /**
   * Arc length
   */
  get length(): number {
    return (this.sweep / 360) * 2 * Math.PI * this.radius
  }

  /**
   * Check if this is a full circle (sweep is 360)
   */
  get isFullCircle(): boolean {
    return approxEqual(this.sweep, 360, EPSILON)
  }

  /**
   * The circle this arc is part of
   */
  get circle(): Circle {
    return new Circle(this.center, this.radius)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Point Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get point at parameter t (0 = start, 1 = end)
   */
  pointAt(t: number): Point {
    const angle = this.angleAt(t)
    const rad = degToRad(angle)
    return point(
      this.center.x + this.radius * Math.cos(rad),
      this.center.y + this.radius * Math.sin(rad)
    )
  }

  /**
   * Get angle at parameter t (0 = startAngle, 1 = endAngle)
   */
  angleAt(t: number): number {
    if (this.clockwise) {
      // Clockwise: angles decrease
      let angle = this.startAngle - t * this.sweep
      return normalizeAngle(angle)
    } else {
      // Counter-clockwise: angles increase
      let angle = this.startAngle + t * this.sweep
      return normalizeAngle(angle)
    }
  }

  /**
   * Get the parameter t for a given angle
   * Returns null if angle is not on the arc
   */
  parameterOfAngle(angle: number, epsilon = EPSILON): number | null {
    angle = normalizeAngle(angle)

    if (this.clockwise) {
      let t: number
      if (this.startAngle >= this.endAngle) {
        if (angle <= this.startAngle && angle >= this.endAngle) {
          t = (this.startAngle - angle) / this.sweep
        } else {
          return null
        }
      } else {
        if (angle <= this.startAngle || angle >= this.endAngle) {
          if (angle <= this.startAngle) {
            t = (this.startAngle - angle) / this.sweep
          } else {
            t = (this.startAngle + 360 - angle) / this.sweep
          }
        } else {
          return null
        }
      }
      return t >= -epsilon && t <= 1 + epsilon ? Math.max(0, Math.min(1, t)) : null
    } else {
      let t: number
      if (this.endAngle >= this.startAngle) {
        if (angle >= this.startAngle && angle <= this.endAngle) {
          t = (angle - this.startAngle) / this.sweep
        } else {
          return null
        }
      } else {
        if (angle >= this.startAngle || angle <= this.endAngle) {
          if (angle >= this.startAngle) {
            t = (angle - this.startAngle) / this.sweep
          } else {
            t = (angle + 360 - this.startAngle) / this.sweep
          }
        } else {
          return null
        }
      }
      return t >= -epsilon && t <= 1 + epsilon ? Math.max(0, Math.min(1, t)) : null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometric Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if an angle is within the arc's sweep
   */
  containsAngle(angle: number, epsilon = EPSILON): boolean {
    return this.parameterOfAngle(angle, epsilon) !== null
  }

  /**
   * Check if a point lies on the arc
   */
  containsPoint(p: PointLike, epsilon = EPSILON): boolean {
    // First check if point is on the circle
    if (!approxEqual(this.center.distanceTo(p), this.radius, epsilon)) {
      return false
    }
    // Then check if angle is within sweep
    const angle = this.center.angleTo(p)
    return this.containsAngle(angle, epsilon)
  }

  /**
   * Get the closest point on the arc to a given point
   */
  closestPoint(p: PointLike): Point {
    const angle = this.center.angleTo(p)
    const t = this.parameterOfAngle(angle)

    if (t !== null) {
      // Point's radial projection is on the arc
      return this.circle.closestPoint(p)
    }

    // Find closest endpoint
    const distToStart = this.start.distanceTo(p)
    const distToEnd = this.end.distanceTo(p)
    return distToStart <= distToEnd ? this.start : this.end
  }

  /**
   * Reverse the arc direction
   */
  reverse(): Arc {
    return new Arc(this.center, this.radius, this.endAngle, this.startAngle, !this.clockwise)
  }

  /**
   * Split arc at parameter t
   */
  split(t: number): [Arc, Arc] {
    const midAngle = this.angleAt(t)
    return [
      new Arc(this.center, this.radius, this.startAngle, midAngle, this.clockwise),
      new Arc(this.center, this.radius, midAngle, this.endAngle, this.clockwise),
    ]
  }

  /**
   * Get a sub-arc from t1 to t2
   */
  subArc(t1: number, t2: number): Arc {
    const angle1 = this.angleAt(t1)
    const angle2 = this.angleAt(t2)
    return new Arc(this.center, this.radius, angle1, angle2, this.clockwise)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get bounding box as [minX, minY, maxX, maxY]
   */
  get bounds(): [number, number, number, number] {
    const points: Point[] = [this.start, this.end]

    // Check cardinal directions
    if (this.containsAngle(0)) points.push(this.circle.east)
    if (this.containsAngle(90)) points.push(this.circle.north)
    if (this.containsAngle(180)) points.push(this.circle.west)
    if (this.containsAngle(270)) points.push(this.circle.south)

    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)

    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  }

  /**
   * Convert to SVG arc path data
   */
  toSVGPath(): string {
    const largeArc = this.sweep > 180 ? 1 : 0
    const sweepFlag = this.clockwise ? 0 : 1

    return `M ${this.start.x} ${this.start.y} A ${this.radius} ${this.radius} 0 ${largeArc} ${sweepFlag} ${this.end.x} ${this.end.y}`
  }

  toString(): string {
    const dir = this.clockwise ? 'CW' : 'CCW'
    return `Arc(${this.center}, r=${this.radius}, ${this.startAngle}° -> ${this.endAngle}° ${dir})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an arc from center, radius, and angles
 */
export function arc(
  center: PointLike,
  radius: number,
  startAngle: number,
  endAngle: number,
  clockwise = false
): Arc {
  return new Arc(center, radius, startAngle, endAngle, clockwise)
}

/**
 * Create an arc from three points on the arc
 * Returns null if points are collinear
 */
export function arcThrough(start: PointLike, middle: PointLike, end: PointLike): Arc | null {
  // Find circumcircle
  const a = point(start.x, start.y)
  const b = point(middle.x, middle.y)
  const c = point(end.x, end.y)

  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (approxEqual(d, 0, EPSILON)) {
    return null
  }

  const aSq = a.x * a.x + a.y * a.y
  const bSq = b.x * b.x + b.y * b.y
  const cSq = c.x * c.x + c.y * c.y

  const centerX = (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d
  const centerY = (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d

  const center = point(centerX, centerY)
  const radius = center.distanceTo(a)

  const startAngle = center.angleTo(a)
  const middleAngle = center.angleTo(b)
  const endAngle = center.angleTo(c)

  // Determine direction based on middle point
  // Counter-clockwise from start to end should pass through middle
  const ccwSweep = normalizeAngle(endAngle - startAngle)
  const middleFromStart = normalizeAngle(middleAngle - startAngle)

  const clockwise = middleFromStart > ccwSweep

  return new Arc(center, radius, startAngle, endAngle, clockwise)
}

/**
 * Create an arc from start point, end point, and bulge
 * Bulge = tan(sweep/4), positive = CCW, negative = CW
 */
export function arcFromBulge(start: PointLike, end: PointLike, bulge: number): Arc {
  if (approxEqual(bulge, 0, EPSILON)) {
    // Straight line - create a large radius arc
    const mid = point(start.x, start.y).midpoint(end)
    return new Arc(mid, 0, 0, 0, false)
  }

  const chord = point(start.x, start.y).distanceTo(end)
  const sagitta = (chord / 2) * Math.abs(bulge)
  const radius = (chord * chord / 4 + sagitta * sagitta) / (2 * sagitta)

  const mid = point(start.x, start.y).midpoint(end)
  const chordAngle = point(start.x, start.y).angleTo(end)

  // Center is perpendicular to chord
  const perpAngle = chordAngle + (bulge > 0 ? -90 : 90)
  const centerDist = radius - sagitta
  const center = point(
    mid.x + centerDist * Math.cos(degToRad(perpAngle)),
    mid.y + centerDist * Math.sin(degToRad(perpAngle))
  )

  const startAngle = center.angleTo(start)
  const endAngle = center.angleTo(end)

  return new Arc(center, radius, startAngle, endAngle, bulge < 0)
}

/**
 * Create an arc from start, end, and radius
 * Returns the smaller arc unless largeArc is true
 */
export function arcFromRadius(
  start: PointLike,
  end: PointLike,
  radius: number,
  largeArc = false,
  clockwise = false
): Arc | null {
  const chord = point(start.x, start.y).distanceTo(end)

  if (chord > 2 * radius) {
    return null // Impossible arc
  }

  // Find center (two possible centers)
  const mid = point(start.x, start.y).midpoint(end)
  const chordAngle = point(start.x, start.y).angleTo(end)
  const halfChord = chord / 2
  const centerDist = Math.sqrt(radius * radius - halfChord * halfChord)

  // Choose which center based on clockwise and largeArc
  const perpAngle = chordAngle + (clockwise !== largeArc ? 90 : -90)
  const center = point(
    mid.x + centerDist * Math.cos(degToRad(perpAngle)),
    mid.y + centerDist * Math.sin(degToRad(perpAngle))
  )

  const startAngle = center.angleTo(start)
  const endAngle = center.angleTo(end)

  return new Arc(center, radius, startAngle, endAngle, clockwise)
}
