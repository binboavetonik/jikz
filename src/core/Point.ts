import type { PointLike, Matrix, AngleOptions } from './types'
import { degToRad, radToDeg, approxEqual, lerp, EPSILON } from '../utils/math'

/**
 * Immutable 2D point with TikZ-style operations
 */
export class Point implements PointLike {
  readonly kind = 'point' as const
  readonly x: number
  readonly y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add another point or coordinates
   */
  add(other: PointLike): Point
  add(x: number, y: number): Point
  add(xOrPoint: PointLike | number, y?: number): Point {
    if (typeof xOrPoint === 'number') {
      return new Point(this.x + xOrPoint, this.y + (y ?? 0))
    }
    return new Point(this.x + xOrPoint.x, this.y + xOrPoint.y)
  }

  /**
   * Subtract another point or coordinates
   */
  sub(other: PointLike): Point
  sub(x: number, y: number): Point
  sub(xOrPoint: PointLike | number, y?: number): Point {
    if (typeof xOrPoint === 'number') {
      return new Point(this.x - xOrPoint, this.y - (y ?? 0))
    }
    return new Point(this.x - xOrPoint.x, this.y - xOrPoint.y)
  }

  /**
   * Scale by a factor (uniform or non-uniform)
   */
  scale(factor: number): Point
  scale(sx: number, sy: number): Point
  scale(sx: number, sy?: number): Point {
    return new Point(this.x * sx, this.y * (sy ?? sx))
  }

  /**
   * Negate the point (reflect through origin)
   */
  neg(): Point {
    return new Point(-this.x, -this.y)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Length (distance from origin)
   */
  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  /**
   * Angle from origin in degrees (0-360), screen convention:
   * 0° = +x (east), increasing clockwise toward +y (south) —
   * i.e. raw Math.atan2(y, x) normalized to [0, 360).
   */
  get angle(): number {
    const rad = Math.atan2(this.y, this.x)
    const deg = radToDeg(rad)
    return deg < 0 ? deg + 360 : deg
  }

  /**
   * Return a normalized (unit length) version of this point
   */
  normalize(): Point {
    const len = this.length
    if (len === 0) return new Point(0, 0)
    return new Point(this.x / len, this.y / len)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Relations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Distance to another point
   */
  distanceTo(other: PointLike): number {
    const dx = other.x - this.x
    const dy = other.y - this.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Angle to another point in degrees (screen convention — see
   * {@link Point.angle}).
   */
  angleTo(other: PointLike): number {
    const rad = Math.atan2(other.y - this.y, other.x - this.x)
    const deg = radToDeg(rad)
    return deg < 0 ? deg + 360 : deg
  }

  /**
   * Check equality with another point
   */
  equals(other: PointLike, epsilon = EPSILON): boolean {
    return approxEqual(this.x, other.x, epsilon) && approxEqual(this.y, other.y, epsilon)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TikZ Features
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Move toward another point by a fraction (0 = this, 1 = other)
   * Like TikZ: (A)!0.5!(B) for midpoint
   */
  toward(other: PointLike, t: number): Point {
    return new Point(lerp(this.x, other.x, t), lerp(this.y, other.y, t))
  }

  /**
   * Move toward another point by a fixed distance
   */
  towardByDistance(other: PointLike, distance: number): Point {
    const totalDist = this.distanceTo(other)
    if (totalDist === 0) return new Point(this.x, this.y)
    const t = distance / totalDist
    return this.toward(other, t)
  }

  /**
   * Midpoint between this and another point
   */
  midpoint(other: PointLike): Point {
    return this.toward(other, 0.5)
  }

  /**
   * Project this point onto the line defined by two points
   */
  project(lineStart: PointLike, lineEnd: PointLike): Point {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y
    const lenSq = dx * dx + dy * dy

    if (lenSq === 0) {
      return new Point(lineStart.x, lineStart.y)
    }

    const t = ((this.x - lineStart.x) * dx + (this.y - lineStart.y) * dy) / lenSq
    return new Point(lineStart.x + t * dx, lineStart.y + t * dy)
  }

  /**
   * TikZ `|-` operator: the vertical line through this point meets the
   * horizontal line through `other`. Returns (this.x, other.y).
   */
  horAt(other: PointLike): Point {
    return new Point(this.x, other.y)
  }

  /**
   * TikZ `-|` operator: the horizontal line through this point meets the
   * vertical line through `other`. Returns (other.x, this.y).
   */
  verAt(other: PointLike): Point {
    return new Point(other.x, this.y)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transforms
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Rotate around the origin by an angle in degrees. Positive angles
   * rotate clockwise on screen (x toward y), matching SVG's rotate().
   */
  rotate(angle: number, options?: AngleOptions): Point {
    const rad = options?.unit === 'rad' ? angle : degToRad(angle)
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return new Point(this.x * cos - this.y * sin, this.x * sin + this.y * cos)
  }

  /**
   * Rotate around a center point
   */
  rotateAround(center: PointLike, angle: number, options?: AngleOptions): Point {
    return this.sub(center).rotate(angle, options).add(center)
  }

  /**
   * Reflect across a line defined by two points
   */
  reflect(lineStart: PointLike, lineEnd: PointLike): Point {
    const projected = this.project(lineStart, lineEnd)
    return new Point(2 * projected.x - this.x, 2 * projected.y - this.y)
  }

  /**
   * Apply a 2D affine transformation matrix
   */
  transform(matrix: Matrix): Point {
    const [a, b, c, d, e, f] = matrix
    return new Point(a * this.x + c * this.y + e, b * this.x + d * this.y + f)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Return as a plain object
   */
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }

  /**
   * Return as an array [x, y]
   */
  toArray(): [number, number] {
    return [this.x, this.y]
  }

  /**
   * String representation
   */
  toString(): string {
    return `(${this.x}, ${this.y})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a point from Cartesian coordinates
 */
export function point(x: number, y: number): Point {
  return new Point(x, y)
}

/**
 * Create a point from polar coordinates (angle in degrees, radius).
 * Screen convention: 0° = east (+x), angles increase clockwise, so
 * 90° = south (+y) and 270° = north (−y). Matches Math.atan2 and
 * SVG rotate().
 */
export function polar(angle: number, radius: number, options?: AngleOptions): Point {
  const rad = options?.unit === 'rad' ? angle : degToRad(angle)
  return new Point(radius * Math.cos(rad), radius * Math.sin(rad))
}

/**
 * Origin point (0, 0)
 */
export const origin = point(0, 0)
