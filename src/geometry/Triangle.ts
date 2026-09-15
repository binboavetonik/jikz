import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { EPSILON, approxEqual } from '../utils/math'
import { Line } from './Line'
import { Circle } from './Circle'
import { Polygon } from './Polygon'

/**
 * A triangle with specialized geometric properties.
 * Inherits the {@link Shape} contract from {@link Polygon}; only the
 * `type` tag is narrowed — moveTo/resize return Polygon instances, which
 * satisfies the interface (triangles are not preserved across resize).
 */
export class Triangle extends Polygon {
  override readonly type: string = 'triangle'

  constructor(p1: PointLike, p2: PointLike, p3: PointLike) {
    super([p1, p2, p3])
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Vertices and Sides (named access)
  // ─────────────────────────────────────────────────────────────────────────────

  get A(): Point {
    return this.vertices[0]!
  }
  get B(): Point {
    return this.vertices[1]!
  }
  get C(): Point {
    return this.vertices[2]!
  }

  /** Side opposite to vertex A (from B to C) */
  get sideA(): Line {
    return new Line(this.B, this.C)
  }
  /** Side opposite to vertex B (from A to C) */
  get sideB(): Line {
    return new Line(this.A, this.C)
  }
  /** Side opposite to vertex C (from A to B) */
  get sideC(): Line {
    return new Line(this.A, this.B)
  }

  /** Length of side a (opposite to A) */
  get a(): number {
    return this.sideA.length
  }
  /** Length of side b (opposite to B) */
  get b(): number {
    return this.sideB.length
  }
  /** Length of side c (opposite to C) */
  get c(): number {
    return this.sideC.length
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Triangle Centers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Centroid (intersection of medians)
   * The center of mass, divides each median in ratio 2:1
   */
  override get centroid(): Point {
    return point(
      (this.A.x + this.B.x + this.C.x) / 3,
      (this.A.y + this.B.y + this.C.y) / 3
    )
  }

  /**
   * Circumcenter (intersection of perpendicular bisectors)
   * Center of the circumscribed circle (equidistant from all vertices)
   */
  get circumcenter(): Point {
    const ax = this.A.x, ay = this.A.y
    const bx = this.B.x, by = this.B.y
    const cx = this.C.x, cy = this.C.y

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))

    if (approxEqual(d, 0, EPSILON)) {
      // Degenerate triangle (collinear points)
      return this.centroid
    }

    const aSq = ax * ax + ay * ay
    const bSq = bx * bx + by * by
    const cSq = cx * cx + cy * cy

    const ux = (aSq * (by - cy) + bSq * (cy - ay) + cSq * (ay - by)) / d
    const uy = (aSq * (cx - bx) + bSq * (ax - cx) + cSq * (bx - ax)) / d

    return point(ux, uy)
  }

  /**
   * Incenter (intersection of angle bisectors)
   * Center of the inscribed circle (equidistant from all sides)
   */
  get incenter(): Point {
    const a = this.a
    const b = this.b
    const c = this.c
    const p = a + b + c

    return point(
      (a * this.A.x + b * this.B.x + c * this.C.x) / p,
      (a * this.A.y + b * this.B.y + c * this.C.y) / p
    )
  }

  /**
   * Orthocenter (intersection of the three altitudes). Lies outside the
   * triangle for obtuse ones, and on the right-angle vertex for right
   * ones.
   *
   * Computed from Euler's relation H = A + B + C − 2·O (O = the
   * {@link circumcenter}), which is exact and needs no case analysis.
   * The earlier hand-derived altitude intersection was wrong for
   * general triangles — it put H off the Euler line, which the
   * euler-line example drew for months.
   */
  get orthocenter(): Point {
    const o = this.circumcenter
    return point(
      this.A.x + this.B.x + this.C.x - 2 * o.x,
      this.A.y + this.B.y + this.C.y - 2 * o.y
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Special Lines
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Median from vertex A to midpoint of BC
   */
  get medianA(): Line {
    return new Line(this.A, this.sideA.midpoint)
  }

  /**
   * Median from vertex B to midpoint of AC
   */
  get medianB(): Line {
    return new Line(this.B, this.sideB.midpoint)
  }

  /**
   * Median from vertex C to midpoint of AB
   */
  get medianC(): Line {
    return new Line(this.C, this.sideC.midpoint)
  }

  /**
   * All three medians
   */
  get medians(): [Line, Line, Line] {
    return [this.medianA, this.medianB, this.medianC]
  }

  /**
   * Altitude from vertex A perpendicular to BC
   */
  get altitudeA(): Line {
    const foot = this.A.project(this.B, this.C)
    return new Line(this.A, foot)
  }

  /**
   * Altitude from vertex B perpendicular to AC
   */
  get altitudeB(): Line {
    const foot = this.B.project(this.A, this.C)
    return new Line(this.B, foot)
  }

  /**
   * Altitude from vertex C perpendicular to AB
   */
  get altitudeC(): Line {
    const foot = this.C.project(this.A, this.B)
    return new Line(this.C, foot)
  }

  /**
   * All three altitudes
   */
  get altitudes(): [Line, Line, Line] {
    return [this.altitudeA, this.altitudeB, this.altitudeC]
  }

  /**
   * Perpendicular bisector of side BC
   */
  get perpBisectorA(): Line {
    return this.sideA.perpendicularBisector()
  }

  /**
   * Perpendicular bisector of side AC
   */
  get perpBisectorB(): Line {
    return this.sideB.perpendicularBisector()
  }

  /**
   * Perpendicular bisector of side AB
   */
  get perpBisectorC(): Line {
    return this.sideC.perpendicularBisector()
  }

  /**
   * All three perpendicular bisectors
   */
  get perpendicularBisectors(): [Line, Line, Line] {
    return [this.perpBisectorA, this.perpBisectorB, this.perpBisectorC]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Circles
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Circumscribed circle (passes through all vertices)
   */
  get circumcircle(): Circle {
    const center = this.circumcenter
    const radius = center.distanceTo(this.A)
    return new Circle(center, radius)
  }

  /**
   * Radius of circumscribed circle
   */
  get circumradius(): number {
    return this.circumcircle.radius
  }

  /**
   * Inscribed circle (tangent to all sides)
   */
  get incircle(): Circle {
    const center = this.incenter
    // Inradius = Area / semi-perimeter
    const radius = this.area / (this.perimeter / 2)
    return new Circle(center, radius)
  }

  /**
   * Radius of inscribed circle
   */
  get inradius(): number {
    return this.area / (this.perimeter / 2)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Angles
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Angle at vertex A in radians
   */
  get angleA(): number {
    const ba = this.B.sub(this.A)
    const ca = this.C.sub(this.A)
    const dot = ba.x * ca.x + ba.y * ca.y
    return Math.acos(dot / (ba.length * ca.length))
  }

  /**
   * Angle at vertex B in radians
   */
  get angleB(): number {
    const ab = this.A.sub(this.B)
    const cb = this.C.sub(this.B)
    const dot = ab.x * cb.x + ab.y * cb.y
    return Math.acos(dot / (ab.length * cb.length))
  }

  /**
   * Angle at vertex C in radians
   */
  get angleC(): number {
    const ac = this.A.sub(this.C)
    const bc = this.B.sub(this.C)
    const dot = ac.x * bc.x + ac.y * bc.y
    return Math.acos(dot / (ac.length * bc.length))
  }

  /**
   * All three angles in radians [angleA, angleB, angleC]
   */
  get angles(): [number, number, number] {
    return [this.angleA, this.angleB, this.angleC]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Classification
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if triangle is equilateral (all sides equal)
   */
  get isEquilateral(): boolean {
    return approxEqual(this.a, this.b, EPSILON) && approxEqual(this.b, this.c, EPSILON)
  }

  /**
   * Check if triangle is isosceles (at least two sides equal)
   */
  get isIsosceles(): boolean {
    return (
      approxEqual(this.a, this.b, EPSILON) ||
      approxEqual(this.b, this.c, EPSILON) ||
      approxEqual(this.a, this.c, EPSILON)
    )
  }

  /**
   * Check if triangle is scalene (all sides different)
   */
  get isScalene(): boolean {
    return !this.isIsosceles
  }

  /**
   * Check if triangle is right-angled
   */
  get isRight(): boolean {
    const halfPi = Math.PI / 2
    return (
      approxEqual(this.angleA, halfPi, 0.001) ||
      approxEqual(this.angleB, halfPi, 0.001) ||
      approxEqual(this.angleC, halfPi, 0.001)
    )
  }

  /**
   * Check if triangle is acute (all angles < 90°)
   */
  get isAcute(): boolean {
    const halfPi = Math.PI / 2
    return this.angleA < halfPi && this.angleB < halfPi && this.angleC < halfPi
  }

  /**
   * Check if triangle is obtuse (one angle > 90°)
   */
  get isObtuse(): boolean {
    const halfPi = Math.PI / 2
    return this.angleA > halfPi || this.angleB > halfPi || this.angleC > halfPi
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transformations (return Triangle)
  // ─────────────────────────────────────────────────────────────────────────────

  override translate(dx: number, dy: number): Triangle {
    return new Triangle(
      this.A.add(dx, dy),
      this.B.add(dx, dy),
      this.C.add(dx, dy)
    )
  }

  override scale(factor: number, center?: PointLike): Triangle {
    const c = center ? point(center.x, center.y) : this.centroid
    return new Triangle(
      c.add(this.A.sub(c).scale(factor)),
      c.add(this.B.sub(c).scale(factor)),
      c.add(this.C.sub(c).scale(factor))
    )
  }

  override rotate(angle: number, center?: PointLike): Triangle {
    const c = center ? point(center.x, center.y) : this.centroid
    return new Triangle(
      this.A.rotateAround(c, angle),
      this.B.rotateAround(c, angle),
      this.C.rotateAround(c, angle)
    )
  }

  override reverse(): Triangle {
    return new Triangle(this.C, this.B, this.A)
  }

  override toString(): string {
    return `Triangle(${this.A}, ${this.B}, ${this.C})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a triangle from three points
 */
export function triangle(p1: PointLike, p2: PointLike, p3: PointLike): Triangle {
  return new Triangle(p1, p2, p3)
}

/**
 * Create a right triangle with legs along axes
 * @param origin - Right angle vertex
 * @param legX - Length of horizontal leg
 * @param legY - Length of vertical leg
 */
export function rightTriangle(origin: PointLike, legX: number, legY: number): Triangle {
  return new Triangle(
    origin,
    point(origin.x + legX, origin.y),
    point(origin.x, origin.y + legY)
  )
}

/**
 * Create an isosceles triangle
 * @param base - Base midpoint
 * @param baseWidth - Width of the base
 * @param height - Height from base to apex
 */
export function isoscelesTriangle(
  base: PointLike,
  baseWidth: number,
  height: number
): Triangle {
  const halfBase = baseWidth / 2
  return new Triangle(
    point(base.x - halfBase, base.y),
    point(base.x + halfBase, base.y),
    point(base.x, base.y - height)
  )
}

/**
 * Create an equilateral triangle from center and radius
 * @param center - Centroid of the triangle
 * @param radius - Distance from center to vertices
 */
export function equilateral(center: PointLike, radius: number): Triangle {
  const angle = -Math.PI / 2 // Start at top
  const step = (2 * Math.PI) / 3

  return new Triangle(
    point(
      center.x + radius * Math.cos(angle),
      center.y + radius * Math.sin(angle)
    ),
    point(
      center.x + radius * Math.cos(angle + step),
      center.y + radius * Math.sin(angle + step)
    ),
    point(
      center.x + radius * Math.cos(angle + 2 * step),
      center.y + radius * Math.sin(angle + 2 * step)
    )
  )
}
