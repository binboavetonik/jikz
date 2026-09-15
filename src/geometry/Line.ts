import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { approxEqual, EPSILON, PIXEL_EPSILON } from '../utils/math'

/**
 * A line defined by two points, supporting both infinite line
 * and line segment operations.
 */
export class Line {
  readonly kind = 'line' as const
  readonly start: Point
  readonly end: Point

  constructor(start: PointLike, end: PointLike) {
    this.start = point(start.x, start.y)
    this.end = point(end.x, end.y)
  }

  /**
   * Point at parameter t ∈ [0,1] along the line (TikZ `(A)!t!(B)`).
   */
  pointAt(t: number): Point {
    return this.start.toward(this.end, t)
  }

  /**
   * Direction of travel in degrees (screen convention) — constant
   * along a line, so `t` is ignored. Matches the `pointAt`/`tangentAt`
   * pair edges and arcs expose for path-relative placement.
   */
  tangentAt(_t: number): number {
    return this.start.angleTo(this.end)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Direction vector (not normalized)
   */
  get direction(): Point {
    return this.end.sub(this.start)
  }

  /**
   * Unit direction vector
   */
  get unitDirection(): Point {
    return this.direction.normalize()
  }

  /**
   * Normal vector (perpendicular to direction, not normalized)
   */
  get normal(): Point {
    const d = this.direction
    return point(-d.y, d.x)
  }

  /**
   * Unit normal vector
   */
  get unitNormal(): Point {
    return this.normal.normalize()
  }

  /**
   * Length of the line segment
   */
  get length(): number {
    return this.start.distanceTo(this.end)
  }

  /**
   * Angle of the line in degrees (0-360)
   */
  get angle(): number {
    return this.start.angleTo(this.end)
  }

  /**
   * Midpoint of the line segment
   */
  get midpoint(): Point {
    return this.start.midpoint(this.end)
  }

  /**
   * Check if this is a degenerate line (start equals end)
   */
  get isDegenerate(): boolean {
    return this.start.equals(this.end)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Parametric Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get point at parameter t (0 = start, 1 = end)
   * t can be outside [0,1] for points on the extended line
   */
  at(t: number): Point {
    return this.start.toward(this.end, t)
  }

  /**
   * Get point at a fixed distance from start
   */
  atDistance(distance: number): Point {
    return this.start.towardByDistance(this.end, distance)
  }

  /**
   * Find parameter t for a point on the line
   * Returns null if point is not on the line
   */
  parameterOf(p: PointLike, epsilon = EPSILON): number | null {
    const dx = this.end.x - this.start.x
    const dy = this.end.y - this.start.y

    let t: number
    if (Math.abs(dx) > Math.abs(dy)) {
      t = (p.x - this.start.x) / dx
    } else if (Math.abs(dy) > epsilon) {
      t = (p.y - this.start.y) / dy
    } else {
      // Degenerate line
      return this.start.equals(p, epsilon) ? 0 : null
    }

    // Verify the point is actually on the line
    const projected = this.at(t)
    if (projected.equals(p, epsilon)) {
      return t
    }
    return null
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometric Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Project a point onto this line (infinite line, not segment)
   */
  projectPoint(p: PointLike): Point {
    return point(p.x, p.y).project(this.start, this.end)
  }

  /**
   * Distance from a point to this line (infinite line)
   */
  distanceToPoint(p: PointLike): number {
    const projected = this.projectPoint(p)
    return projected.distanceTo(p)
  }

  /**
   * Distance from a point to this line segment
   */
  distanceToPointSegment(p: PointLike): number {
    const t = this.parameterOf(this.projectPoint(p))
    if (t !== null && t >= 0 && t <= 1) {
      return this.distanceToPoint(p)
    }
    // Point projects outside segment, return distance to nearest endpoint
    return Math.min(this.start.distanceTo(p), this.end.distanceTo(p))
  }

  /**
   * Check if a point lies on the infinite line
   */
  containsPoint(p: PointLike, epsilon = EPSILON): boolean {
    return this.parameterOf(p, epsilon) !== null
  }

  /**
   * Check if a point lies on the line segment
   */
  containsPointSegment(p: PointLike, epsilon = EPSILON): boolean {
    const t = this.parameterOf(p, epsilon)
    return t !== null && t >= -epsilon && t <= 1 + epsilon
  }

  /**
   * Get the perpendicular line through a point
   */
  perpendicularThrough(p: PointLike): Line {
    const n = this.unitNormal
    return new Line(p, point(p.x + n.x, p.y + n.y))
  }

  /**
   * Get the perpendicular bisector of this line segment
   */
  perpendicularBisector(): Line {
    const mid = this.midpoint
    const n = this.unitNormal
    return new Line(mid, mid.add(n))
  }

  /**
   * Get a parallel line at a given offset distance
   * Positive offset is in the direction of the normal
   */
  parallel(offset: number): Line {
    const n = this.unitNormal.scale(offset)
    return new Line(this.start.add(n), this.end.add(n))
  }

  /**
   * Extend the line by a distance at each end
   */
  extend(startExtension: number, endExtension: number = startExtension): Line {
    const dir = this.unitDirection
    return new Line(
      this.start.sub(dir.scale(startExtension)),
      this.end.add(dir.scale(endExtension))
    )
  }

  /**
   * Reverse the line direction
   */
  reverse(): Line {
    return new Line(this.end, this.start)
  }

  /**
   * Check if two lines are parallel
   */
  isParallelTo(other: Line, epsilon = PIXEL_EPSILON): boolean {
    const cross = this.direction.x * other.direction.y - this.direction.y * other.direction.x
    return approxEqual(cross, 0, epsilon)
  }

  /**
   * Check if two lines are perpendicular
   */
  isPerpendicularTo(other: Line, epsilon = PIXEL_EPSILON): boolean {
    const dot = this.direction.x * other.direction.x + this.direction.y * other.direction.y
    return approxEqual(dot, 0, epsilon)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get bounding box as [minX, minY, maxX, maxY]
   */
  get bounds(): [number, number, number, number] {
    return [
      Math.min(this.start.x, this.end.x),
      Math.min(this.start.y, this.end.y),
      Math.max(this.start.x, this.end.x),
      Math.max(this.start.y, this.end.y),
    ]
  }

  toString(): string {
    return `Line(${this.start} -> ${this.end})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a line from two points
 */
export function line(start: PointLike, end: PointLike): Line {
  return new Line(start, end)
}

/**
 * Create a line from a point, angle (degrees), and length
 */
export function lineFromAngle(
  start: PointLike,
  angle: number,
  length: number
): Line {
  const end = point(start.x, start.y).add(
    point(Math.cos((angle * Math.PI) / 180) * length, Math.sin((angle * Math.PI) / 180) * length)
  )
  return new Line(start, end)
}

/**
 * Create a horizontal line through a point
 */
export function horizontalLine(p: PointLike, length = 100): Line {
  return new Line(point(p.x - length / 2, p.y), point(p.x + length / 2, p.y))
}

/**
 * Create a vertical line through a point
 */
export function verticalLine(p: PointLike, length = 100): Line {
  return new Line(point(p.x, p.y - length / 2), point(p.x, p.y + length / 2))
}
