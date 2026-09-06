import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { anchorOnRect, type AnchorSpec } from '../core/Anchor'
import { EPSILON, approxEqual } from '../utils/math'
import { Line } from './Line'
import type { Shape } from './Shape'

/**
 * An axis-aligned rectangle.
 * Implements the geometry-level {@link Shape} contract.
 */
export class Rectangle implements Shape {
  readonly type = 'rectangle' as const
  readonly x: number // left edge
  readonly y: number // top edge
  readonly width: number
  readonly height: number

  constructor(x: number, y: number, width: number, height: number) {
    // Normalize so width and height are positive
    if (width < 0) {
      x = x + width
      width = -width
    }
    if (height < 0) {
      y = y + height
      height = -height
    }
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  get left(): number {
    return this.x
  }
  get right(): number {
    return this.x + this.width
  }
  get top(): number {
    return this.y
  }
  get bottom(): number {
    return this.y + this.height
  }

  get area(): number {
    return this.width * this.height
  }

  get perimeter(): number {
    return 2 * (this.width + this.height)
  }

  get aspectRatio(): number {
    return this.height === 0 ? Infinity : this.width / this.height
  }

  get isSquare(): boolean {
    return approxEqual(this.width, this.height, EPSILON)
  }

  get isDegenerate(): boolean {
    return this.width === 0 || this.height === 0
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Corner and Anchor Points (TikZ-style naming)
  // ─────────────────────────────────────────────────────────────────────────────

  get center(): Point {
    return point(this.x + this.width / 2, this.y + this.height / 2)
  }

  // Cardinal anchors (center of edges)
  get north(): Point {
    return point(this.x + this.width / 2, this.y)
  }
  get south(): Point {
    return point(this.x + this.width / 2, this.y + this.height)
  }
  get east(): Point {
    return point(this.x + this.width, this.y + this.height / 2)
  }
  get west(): Point {
    return point(this.x, this.y + this.height / 2)
  }

  // Corner anchors
  get northWest(): Point {
    return point(this.x, this.y)
  }
  get northEast(): Point {
    return point(this.x + this.width, this.y)
  }
  get southWest(): Point {
    return point(this.x, this.y + this.height)
  }
  get southEast(): Point {
    return point(this.x + this.width, this.y + this.height)
  }

  // Aliases
  get topLeft(): Point {
    return this.northWest
  }
  get topRight(): Point {
    return this.northEast
  }
  get bottomLeft(): Point {
    return this.southWest
  }
  get bottomRight(): Point {
    return this.southEast
  }

  /**
   * Get all four corners in order (NW, NE, SE, SW)
   */
  get corners(): [Point, Point, Point, Point] {
    return [this.northWest, this.northEast, this.southEast, this.southWest]
  }

  /**
   * Get all four edges as Lines
   */
  get edges(): [Line, Line, Line, Line] {
    return [
      new Line(this.northWest, this.northEast), // top
      new Line(this.northEast, this.southEast), // right
      new Line(this.southEast, this.southWest), // bottom
      new Line(this.southWest, this.northWest), // left
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Point Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get a point at relative position (0-1 on each axis)
   * (0, 0) = top-left, (1, 1) = bottom-right
   */
  pointAt(tx: number, ty: number): Point {
    return point(this.x + this.width * tx, this.y + this.height * ty)
  }

  /**
   * Anchor point by name or angle. Delegates to {@link anchorOnRect}, the
   * single source of truth for rectangle anchoring: compass names refer
   * to what you see on screen (`north` = visual top edge midpoint),
   * corner names (including aliases 'ne', 'northeast', …) return the
   * literal bounding-box corner, and numeric specs (degrees, screen
   * convention — see {@link ANCHOR_ANGLES}) route through the center-ray
   * border intersection.
   */
  anchor(spec: AnchorSpec): Point {
    return anchorOnRect(this.center, this.width, this.height, spec)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometric Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if point is inside the rectangle
   */
  containsPoint(p: PointLike, epsilon = EPSILON): boolean {
    return (
      p.x >= this.left - epsilon &&
      p.x <= this.right + epsilon &&
      p.y >= this.top - epsilon &&
      p.y <= this.bottom + epsilon
    )
  }

  /**
   * Check if point is strictly inside (not on boundary)
   */
  containsPointStrict(p: PointLike, epsilon = EPSILON): boolean {
    return (
      p.x > this.left + epsilon &&
      p.x < this.right - epsilon &&
      p.y > this.top + epsilon &&
      p.y < this.bottom - epsilon
    )
  }

  /**
   * Check if point is on the boundary
   */
  containsPointOnBoundary(p: PointLike, epsilon = EPSILON): boolean {
    return this.containsPoint(p, epsilon) && !this.containsPointStrict(p, epsilon)
  }

  /**
   * Check if this rectangle contains another rectangle
   */
  containsRect(other: Rectangle, epsilon = EPSILON): boolean {
    return (
      other.left >= this.left - epsilon &&
      other.right <= this.right + epsilon &&
      other.top >= this.top - epsilon &&
      other.bottom <= this.bottom + epsilon
    )
  }

  /**
   * Check if this rectangle intersects another
   */
  intersectsRect(other: Rectangle, epsilon = EPSILON): boolean {
    return !(
      other.left > this.right + epsilon ||
      other.right < this.left - epsilon ||
      other.top > this.bottom + epsilon ||
      other.bottom < this.top - epsilon
    )
  }

  /**
   * Get intersection with another rectangle
   * Returns null if no intersection
   */
  intersection(other: Rectangle): Rectangle | null {
    const x = Math.max(this.left, other.left)
    const y = Math.max(this.top, other.top)
    const right = Math.min(this.right, other.right)
    const bottom = Math.min(this.bottom, other.bottom)

    if (x > right || y > bottom) {
      return null
    }

    return new Rectangle(x, y, right - x, bottom - y)
  }

  /**
   * Get union (bounding box) of this and another rectangle
   */
  union(other: Rectangle): Rectangle {
    const x = Math.min(this.left, other.left)
    const y = Math.min(this.top, other.top)
    const right = Math.max(this.right, other.right)
    const bottom = Math.max(this.bottom, other.bottom)

    return new Rectangle(x, y, right - x, bottom - y)
  }

  /**
   * Get closest point on rectangle boundary to a given point
   */
  closestPoint(p: PointLike): Point {
    // If inside, find closest edge
    const px = Math.max(this.left, Math.min(this.right, p.x))
    const py = Math.max(this.top, Math.min(this.bottom, p.y))

    if (this.containsPointStrict(p)) {
      // Point is inside - find closest edge
      const dLeft = p.x - this.left
      const dRight = this.right - p.x
      const dTop = p.y - this.top
      const dBottom = this.bottom - p.y
      const minD = Math.min(dLeft, dRight, dTop, dBottom)

      if (minD === dLeft) return point(this.left, p.y)
      if (minD === dRight) return point(this.right, p.y)
      if (minD === dTop) return point(p.x, this.top)
      return point(p.x, this.bottom)
    }

    return point(px, py)
  }

  /**
   * Get point on boundary in direction from center.
   * Delegates to {@link anchorOnRect} (ray–box intersection), which also
   * handles the degenerate zero-area case by returning the center.
   */
  boundaryPoint(angle: number): Point {
    return anchorOnRect(this.center, this.width, this.height, angle)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transformations
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // Shape interface (remaining members — anchor/boundaryPoint/bounds above)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Whether a point lies inside the rectangle (boundary inclusive).
   * Shape-interface form of {@link containsPoint}.
   */
  contains(p: PointLike): boolean {
    return this.containsPoint(p, EPSILON)
  }

  /**
   * SVG path data for the rectangle outline.
   */
  toSVGPath(): string {
    return `M ${this.left} ${this.top} L ${this.right} ${this.top} L ${this.right} ${this.bottom} L ${this.left} ${this.bottom} Z`
  }

  /**
   * Copy with center at `newCenter`, dimensions preserved.
   */
  moveTo(newCenter: PointLike): Rectangle {
    return new Rectangle(newCenter.x - this.width / 2, newCenter.y - this.height / 2, this.width, this.height)
  }

  /**
   * Copy with new width/height, centered on the current center.
   */
  resize(width: number, height: number): Rectangle {
    const cx = this.center.x
    const cy = this.center.y
    return new Rectangle(cx - width / 2, cy - height / 2, width, height)
  }

  /**
   * Translate the rectangle
   */
  translate(dx: number, dy: number): Rectangle {
    return new Rectangle(this.x + dx, this.y + dy, this.width, this.height)
  }

  /**
   * Scale the rectangle around its center
   */
  scale(factor: number): Rectangle
  scale(sx: number, sy: number): Rectangle
  scale(sx: number, sy?: number): Rectangle {
    const actualSy = sy ?? sx
    const newWidth = this.width * sx
    const newHeight = this.height * actualSy
    const cx = this.center.x
    const cy = this.center.y
    return new Rectangle(cx - newWidth / 2, cy - newHeight / 2, newWidth, newHeight)
  }

  /**
   * Scale around a specific point
   */
  scaleAround(p: PointLike, factor: number): Rectangle
  scaleAround(p: PointLike, sx: number, sy: number): Rectangle
  scaleAround(p: PointLike, sx: number, sy?: number): Rectangle {
    const actualSy = sy ?? sx
    return new Rectangle(
      p.x + (this.x - p.x) * sx,
      p.y + (this.y - p.y) * actualSy,
      this.width * sx,
      this.height * actualSy
    )
  }

  /**
   * Expand rectangle by adding padding on all sides
   */
  expand(padding: number): Rectangle
  expand(horizontal: number, vertical: number): Rectangle
  expand(left: number, top: number, right: number, bottom: number): Rectangle
  expand(a: number, b?: number, c?: number, d?: number): Rectangle {
    if (b === undefined) {
      // Single value: uniform padding
      return new Rectangle(
        this.x - a,
        this.y - a,
        this.width + 2 * a,
        this.height + 2 * a
      )
    } else if (c === undefined) {
      // Two values: horizontal and vertical
      return new Rectangle(
        this.x - a,
        this.y - b,
        this.width + 2 * a,
        this.height + 2 * b
      )
    } else {
      // Four values: left, top, right, bottom
      return new Rectangle(
        this.x - a,
        this.y - b,
        this.width + a + (c ?? a),
        this.height + b + (d ?? b)
      )
    }
  }

  /**
   * Shrink rectangle (negative expand)
   */
  shrink(padding: number): Rectangle
  shrink(horizontal: number, vertical: number): Rectangle
  shrink(a: number, b?: number): Rectangle {
    if (b === undefined) {
      return this.expand(-a)
    }
    return this.expand(-a, -b)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get bounding box as [minX, minY, maxX, maxY]
   */
  get bounds(): [number, number, number, number] {
    return [this.left, this.top, this.right, this.bottom]
  }

  equals(other: Rectangle, epsilon = EPSILON): boolean {
    return (
      approxEqual(this.x, other.x, epsilon) &&
      approxEqual(this.y, other.y, epsilon) &&
      approxEqual(this.width, other.width, epsilon) &&
      approxEqual(this.height, other.height, epsilon)
    )
  }

  toString(): string {
    return `Rectangle(${this.x}, ${this.y}, ${this.width}x${this.height})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create rectangle from position and size
 */
export function rect(x: number, y: number, width: number, height: number): Rectangle {
  return new Rectangle(x, y, width, height)
}

/**
 * Create rectangle from center and size
 */
export function rectFromCenter(center: PointLike, width: number, height: number): Rectangle {
  return new Rectangle(center.x - width / 2, center.y - height / 2, width, height)
}

/**
 * Create rectangle from two corner points
 */
export function rectFromCorners(p1: PointLike, p2: PointLike): Rectangle {
  const x = Math.min(p1.x, p2.x)
  const y = Math.min(p1.y, p2.y)
  const width = Math.abs(p2.x - p1.x)
  const height = Math.abs(p2.y - p1.y)
  return new Rectangle(x, y, width, height)
}

/**
 * Create a square from center and side length
 */
export function square(center: PointLike, side: number): Rectangle {
  return rectFromCenter(center, side, side)
}

/**
 * Create rectangle that fits around a set of points
 * This is the TikZ "fit" library functionality
 */
export function rectFit(points: PointLike[]): Rectangle | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  return new Rectangle(minX, minY, maxX - minX, maxY - minY)
}

/**
 * Create rectangle from bounds array
 */
export function rectFromBounds(bounds: [number, number, number, number]): Rectangle {
  const [minX, minY, maxX, maxY] = bounds
  return new Rectangle(minX, minY, maxX - minX, maxY - minY)
}
