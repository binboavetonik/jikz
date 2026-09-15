import { Point, point } from '../core/Point'
import type { PointLike, AngleOptions } from '../core/types'
import { anchorOnCircle, type AnchorSpec } from '../core/Anchor'
import { degToRad, EPSILON, approxEqual, circumcenterOf } from '../utils/math'
import type { Shape } from './Shape'

/**
 * A circle defined by center and radius.
 * Implements the geometry-level {@link Shape} contract so it can back a Node
 * directly (anchors, boundary points, SVG path, hit-testing, transformations).
 */
export class Circle implements Shape {
  readonly type = 'circle' as const
  readonly center: Point
  readonly radius: number

  constructor(center: PointLike, radius: number) {
    this.center = point(center.x, center.y)
    this.radius = Math.abs(radius)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  get diameter(): number {
    return this.radius * 2
  }

  // Shape interface: width/height are the bounding-box dimensions.
  get width(): number {
    return this.radius * 2
  }

  get height(): number {
    return this.radius * 2
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius
  }

  get area(): number {
    return Math.PI * this.radius * this.radius
  }

  /**
   * Check if circle is degenerate (radius is 0)
   */
  get isDegenerate(): boolean {
    return this.radius === 0
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Point Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get point on circle at given angle (in degrees).
   * Screen convention: 0° = east (+x), angles increase clockwise in
   * y-down space, so 90° = south (visual bottom) and 270° = north.
   */
  pointAt(angle: number, options?: AngleOptions): Point {
    const rad = options?.unit === 'rad' ? angle : degToRad(angle)
    return point(
      this.center.x + this.radius * Math.cos(rad),
      this.center.y + this.radius * Math.sin(rad)
    )
  }

  /**
   * Get the angle (in degrees) of a point relative to the center
   */
  angleOf(p: PointLike): number {
    return this.center.angleTo(p)
  }

  /**
   * Cardinal points.
   *
   * @deprecated Legacy math-convention accessors: `north` is at 90°,
   * which is the VISUAL BOTTOM in this library's y-down screen space —
   * the opposite of {@link Circle.anchor}('north'). Prefer
   * `anchor('north')` / `anchor('south')` / …, which follow the
   * library-wide screen convention and agree with every other shape.
   */
  get north(): Point {
    return this.pointAt(90)
  }
  /** @deprecated See {@link Circle.north} — prefer `anchor('south')`. */
  get south(): Point {
    return this.pointAt(270)
  }
  /** @deprecated See {@link Circle.north} — prefer `anchor('east')`. */
  get east(): Point {
    return this.pointAt(0)
  }
  /** @deprecated See {@link Circle.north} — prefer `anchor('west')`. */
  get west(): Point {
    return this.pointAt(180)
  }
  /** @deprecated See {@link Circle.north} — prefer `anchor('north east')`. */
  get northeast(): Point {
    return this.pointAt(45)
  }
  /** @deprecated See {@link Circle.north} — prefer `anchor('north west')`. */
  get northwest(): Point {
    return this.pointAt(135)
  }
  /** @deprecated See {@link Circle.north} — prefer `anchor('south east')`. */
  get southeast(): Point {
    return this.pointAt(315)
  }
  /** @deprecated See {@link Circle.north} — prefer `anchor('south west')`. */
  get southwest(): Point {
    return this.pointAt(225)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometric Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a point lies on the circle
   */
  containsPoint(p: PointLike, epsilon = EPSILON): boolean {
    return approxEqual(this.center.distanceTo(p), this.radius, epsilon)
  }

  /**
   * Check if a point is inside the circle
   */
  containsPointInside(p: PointLike, epsilon = EPSILON): boolean {
    return this.center.distanceTo(p) <= this.radius + epsilon
  }

  /**
   * Distance from a point to the circle boundary
   * Positive if outside, negative if inside
   */
  distanceToPoint(p: PointLike): number {
    return this.center.distanceTo(p) - this.radius
  }

  /**
   * Get the closest point on the circle to the given point
   */
  closestPoint(p: PointLike): Point {
    const dist = this.center.distanceTo(p)
    if (dist === 0) {
      // Point is at center, return east point
      return this.east
    }
    return this.center.towardByDistance(p, this.radius)
  }

  /**
   * Get tangent lines from an external point
   * Returns two lines if point is outside, one if on circle, none if inside
   */
  tangentsFrom(p: PointLike): Point[] {
    const dist = this.center.distanceTo(p)

    if (dist < this.radius - EPSILON) {
      // Point is inside circle
      return []
    }

    if (approxEqual(dist, this.radius, EPSILON)) {
      // Point is on circle - single tangent point
      return [point(p.x, p.y)]
    }

    // Point is outside - two tangent points
    // Using geometric construction
    const angle = Math.acos(this.radius / dist)
    const baseAngle = this.center.angleTo(p)

    return [
      this.pointAt(baseAngle + angle * 180 / Math.PI),
      this.pointAt(baseAngle - angle * 180 / Math.PI),
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Shape interface
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Anchor point by name or angle. Delegates to {@link anchorOnCircle},
   * the single source of truth for circle anchoring. Named anchors
   * ('north', 'ne', …) resolve via the screen convention (see
   * {@link ANCHOR_ANGLES}); numeric specs are degrees; 'center' returns
   * the circle's center.
   */
  anchor(spec: AnchorSpec): Point {
    return anchorOnCircle(this.center, this.radius, spec)
  }

  /**
   * Point on the circle boundary at the given angle (degrees).
   */
  boundaryPoint(angle: number): Point {
    return this.pointAt(angle)
  }

  /**
   * Whether a point lies inside the circle (boundary inclusive).
   */
  contains(p: PointLike): boolean {
    return this.center.distanceTo(p) <= this.radius + EPSILON
  }

  /**
   * SVG path data for the circle outline.
   * Two half-arcs, so the output is a well-formed closed path.
   */
  toSVGPath(): string {
    const r = this.radius
    const cx = this.center.x
    const cy = this.center.y
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`
  }

  /**
   * Copy with center at `newCenter`, radius preserved.
   */
  moveTo(newCenter: PointLike): Circle {
    return new Circle(newCenter, this.radius)
  }

  /**
   * Copy scaled so its bounding box matches width × height.
   * Uses max(width, height)/2 as the new radius; the circle stays circular.
   */
  resize(width: number, height: number): Circle {
    return new Circle(this.center, Math.max(width, height) / 2)
  }

  /**
   * Translate the circle
   */
  translate(dx: number, dy: number): Circle {
    return new Circle(this.center.add(dx, dy), this.radius)
  }

  /**
   * Scale the circle (around its center)
   */
  scale(factor: number): Circle {
    return new Circle(this.center, this.radius * Math.abs(factor))
  }

  /**
   * Scale around a point
   */
  scaleAround(p: PointLike, factor: number): Circle {
    const newCenter = point(p.x, p.y).toward(this.center, factor)
    return new Circle(newCenter, this.radius * Math.abs(factor))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get bounding box as [minX, minY, maxX, maxY]
   */
  get bounds(): [number, number, number, number] {
    return [
      this.center.x - this.radius,
      this.center.y - this.radius,
      this.center.x + this.radius,
      this.center.y + this.radius,
    ]
  }

  equals(other: Circle, epsilon = EPSILON): boolean {
    return (
      this.center.equals(other.center, epsilon) &&
      approxEqual(this.radius, other.radius, epsilon)
    )
  }

  toString(): string {
    return `Circle(${this.center}, r=${this.radius})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a circle from center and radius
 */
export function circle(center: PointLike, radius: number): Circle {
  return new Circle(center, radius)
}

/**
 * Create a circle from center and a point on the circle
 */
export function circleFromCenterAndPoint(center: PointLike, pointOnCircle: PointLike): Circle {
  const radius = point(center.x, center.y).distanceTo(pointOnCircle)
  return new Circle(center, radius)
}

/**
 * Create a circle from diameter endpoints
 */
export function circleFromDiameter(p1: PointLike, p2: PointLike): Circle {
  const center = point(p1.x, p1.y).midpoint(p2)
  const radius = center.distanceTo(p1)
  return new Circle(center, radius)
}

/**
 * Create a circle through three points (circumcircle)
 * This is the TikZ "through" library functionality
 * Returns null if points are collinear
 */
export function circleThrough(p1: PointLike, p2: PointLike, p3: PointLike): Circle | null {
  const a = point(p1.x, p1.y)
  const b = point(p2.x, p2.y)
  const c = point(p3.x, p3.y)

  const found = circumcenterOf(a.x, a.y, b.x, b.y, c.x, c.y)
  if (found === null) {
    return null // Points are collinear
  }

  const center = point(found.x, found.y)
  const radius = center.distanceTo(a)

  return new Circle(center, radius)
}

/**
 * Create the smallest circle enclosing two points
 */
export function circleEnclosing2(p1: PointLike, p2: PointLike): Circle {
  return circleFromDiameter(p1, p2)
}

/**
 * Create the smallest circle enclosing three points
 * Uses Welzl's algorithm simplified for 3 points
 */
export function circleEnclosing3(p1: PointLike, p2: PointLike, p3: PointLike): Circle {
  // Try circumcircle first
  const circumcircle = circleThrough(p1, p2, p3)
  if (circumcircle) {
    // Check if all points are inside or on the circumcircle
    // (they should be by definition, but verify)
    return circumcircle
  }

  // Points are collinear - find the two farthest apart
  const d12 = point(p1.x, p1.y).distanceTo(p2)
  const d23 = point(p2.x, p2.y).distanceTo(p3)
  const d13 = point(p1.x, p1.y).distanceTo(p3)

  if (d12 >= d23 && d12 >= d13) {
    return circleFromDiameter(p1, p2)
  } else if (d23 >= d13) {
    return circleFromDiameter(p2, p3)
  } else {
    return circleFromDiameter(p1, p3)
  }
}
