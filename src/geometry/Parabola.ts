import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad, EPSILON, approxEqual } from '../utils/math'

/**
 * A parabola defined by vertex and focus (or vertex and directrix distance)
 *
 * Standard form: y = ax² (vertex at origin, opens upward)
 * General form: 4p(y - k) = (x - h)² where (h, k) is vertex, p is focal length
 *
 * Can be rotated to open in any direction.
 */
export class Parabola {
  readonly vertex: Point
  readonly focalLength: number  // Distance from vertex to focus (p)
  readonly rotation: number     // Rotation angle in degrees (0 = opens up)

  constructor(vertex: PointLike, focalLength: number, rotation = 0) {
    this.vertex = point(vertex.x, vertex.y)
    this.focalLength = focalLength  // Can be negative to flip direction
    this.rotation = rotation
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * The focus point of the parabola
   */
  get focus(): Point {
    const rotRad = degToRad(this.rotation)
    // Focus is at distance p from vertex in the direction of opening
    // rotation=0: up (+y), rotation=90: right (+x), rotation=180: down, rotation=270: left
    const dx = this.focalLength * Math.sin(rotRad)
    const dy = this.focalLength * Math.cos(rotRad)
    return point(this.vertex.x + dx, this.vertex.y + dy)
  }

  /**
   * The directrix is a line perpendicular to the axis of symmetry,
   * at distance p from vertex on the opposite side of focus.
   * Returns a point on the directrix (for the axis intersection)
   */
  get directrixPoint(): Point {
    const rotRad = degToRad(this.rotation)
    // Opposite direction from focus
    const dx = -this.focalLength * Math.sin(rotRad)
    const dy = -this.focalLength * Math.cos(rotRad)
    return point(this.vertex.x + dx, this.vertex.y + dy)
  }

  /**
   * The parameter 'a' in y = ax² form (at vertex origin)
   * a = 1/(4p)
   */
  get coefficient(): number {
    return 1 / (4 * this.focalLength)
  }

  /**
   * Latus rectum length (width at focus) = 4p
   */
  get latusRectum(): number {
    return Math.abs(4 * this.focalLength)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Point Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get point on parabola at given x value (in local coordinates)
   * Local coordinates: vertex at origin, parabola opens upward
   */
  pointAtX(x: number): Point {
    // y = x²/(4p) in local coords
    const y = (x * x) / (4 * this.focalLength)
    return this.localToWorld(x, y)
  }

  /**
   * Get point on parabola at given parameter t
   * Parametric form: x = 2pt, y = pt²
   * t can be any real number, t=0 is vertex
   */
  pointAtT(t: number): Point {
    const x = 2 * this.focalLength * t
    const y = this.focalLength * t * t
    return this.localToWorld(x, y)
  }

  /**
   * Get points along the parabola for rendering
   * @param tMin - Starting parameter value
   * @param tMax - Ending parameter value
   * @param segments - Number of line segments
   */
  getPoints(tMin = -2, tMax = 2, segments = 50): Point[] {
    const points: Point[] = []
    const step = (tMax - tMin) / segments

    for (let t = tMin; t <= tMax; t += step) {
      points.push(this.pointAtT(t))
    }

    return points
  }

  /**
   * Transform local coordinates (vertex at origin) to world coordinates
   */
  private localToWorld(x: number, y: number): Point {
    const rotRad = degToRad(this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)

    // Rotate then translate
    return point(
      this.vertex.x + x * cos - y * sin,
      this.vertex.y + x * sin + y * cos
    )
  }

  /**
   * Transform world coordinates to local coordinates
   */
  private worldToLocal(p: PointLike): Point {
    const dx = p.x - this.vertex.x
    const dy = p.y - this.vertex.y
    const rotRad = degToRad(-this.rotation)

    return point(
      dx * Math.cos(rotRad) - dy * Math.sin(rotRad),
      dx * Math.sin(rotRad) + dy * Math.cos(rotRad)
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometric Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a point lies on the parabola
   */
  containsPoint(p: PointLike, epsilon = EPSILON): boolean {
    const local = this.worldToLocal(p)
    const expectedY = (local.x * local.x) / (4 * this.focalLength)
    return approxEqual(local.y, expectedY, epsilon)
  }

  /**
   * Get the closest point on the parabola to a given point
   * (Approximate using sampling)
   */
  closestPoint(p: PointLike, tRange = 10, samples = 100): Point {
    let minDist = Infinity
    let closest = this.vertex

    const step = (2 * tRange) / samples
    for (let t = -tRange; t <= tRange; t += step) {
      const pt = this.pointAtT(t)
      const dist = pt.distanceTo(p)
      if (dist < minDist) {
        minDist = dist
        closest = pt
      }
    }

    return closest
  }

  /**
   * Translate the parabola
   */
  translate(dx: number, dy: number): Parabola {
    return new Parabola(this.vertex.add(dx, dy), this.focalLength, this.rotation)
  }

  /**
   * Scale the parabola (affects focal length)
   */
  scale(factor: number): Parabola {
    return new Parabola(this.vertex, this.focalLength * factor, this.rotation)
  }

  /**
   * Rotate the parabola by additional degrees
   */
  rotate(degrees: number): Parabola {
    return new Parabola(this.vertex, this.focalLength, this.rotation + degrees)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG Path
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate SVG path data for a segment of the parabola
   * Uses quadratic bezier approximation
   */
  toSVGPath(tMin = -2, tMax = 2, segments = 20): string {
    const points = this.getPoints(tMin, tMax, segments)
    if (points.length < 2) return ''

    let path = `M ${points[0]!.x} ${points[0]!.y}`

    // Use quadratic bezier curves for smoother rendering
    for (let i = 1; i < points.length; i++) {
      const p = points[i]!
      path += ` L ${p.x} ${p.y}`
    }

    return path
  }

  /**
   * Generate a smooth SVG path using bezier curves
   */
  toSVGPathSmooth(tMin = -2, tMax = 2, segments = 10): string {
    const step = (tMax - tMin) / segments
    const points: Point[] = []

    for (let t = tMin; t <= tMax; t += step) {
      points.push(this.pointAtT(t))
    }

    if (points.length < 2) return ''

    let path = `M ${points[0]!.x} ${points[0]!.y}`

    // Use cubic bezier for smooth curves
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]!
      const p1 = points[i + 1]!

      // Calculate control points using tangent at each point
      const t0 = tMin + i * step
      const t1 = t0 + step

      // Derivative of parametric parabola: dx/dt = 2p, dy/dt = 2pt
      const tangent0 = this.tangentAtT(t0)
      const tangent1 = this.tangentAtT(t1)

      const dist = p0.distanceTo(p1) / 3

      const cp1 = point(
        p0.x + tangent0.x * dist,
        p0.y + tangent0.y * dist
      )
      const cp2 = point(
        p1.x - tangent1.x * dist,
        p1.y - tangent1.y * dist
      )

      path += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${p1.x} ${p1.y}`
    }

    return path
  }

  /**
   * Get unit tangent vector at parameter t
   */
  tangentAtT(t: number): Point {
    // In local coords: dx/dt = 2p, dy/dt = 2pt
    const dx = 2 * this.focalLength
    const dy = 2 * this.focalLength * t
    const len = Math.sqrt(dx * dx + dy * dy)

    // Rotate to world coords
    const rotRad = degToRad(this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)

    return point(
      (dx * cos - dy * sin) / len,
      (dx * sin + dy * cos) / len
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get bounding box for a segment of the parabola
   */
  getBounds(tMin = -2, tMax = 2): [number, number, number, number] {
    const points = this.getPoints(tMin, tMax, 50)
    if (points.length === 0) {
      return [this.vertex.x, this.vertex.y, this.vertex.x, this.vertex.y]
    }

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    for (const p of points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    return [minX, minY, maxX, maxY]
  }

  equals(other: Parabola, epsilon = EPSILON): boolean {
    return (
      this.vertex.equals(other.vertex, epsilon) &&
      approxEqual(this.focalLength, other.focalLength, epsilon) &&
      approxEqual(this.rotation % 360, other.rotation % 360, epsilon)
    )
  }

  toString(): string {
    return `Parabola(vertex=${this.vertex}, p=${this.focalLength}, rot=${this.rotation}°)`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a parabola from vertex and focal length
 * @param vertex - The vertex point
 * @param focalLength - Distance from vertex to focus (p)
 * @param rotation - Opening direction in degrees (0 = up, 90 = right, etc.)
 */
export function parabola(vertex: PointLike, focalLength: number, rotation = 0): Parabola {
  return new Parabola(vertex, focalLength, rotation)
}

/**
 * Create a parabola from vertex and focus point
 */
export function parabolaFromFocus(vertex: PointLike, focus: PointLike): Parabola {
  const v = point(vertex.x, vertex.y)
  const f = point(focus.x, focus.y)

  const focalLength = v.distanceTo(f)
  // angleTo returns standard angle (0° = right, 90° = up)
  // Our rotation convention: 0° = up, 90° = right
  // So rotation = 90 - angle
  const angle = v.angleTo(f)
  const rotation = 90 - angle

  return new Parabola(vertex, focalLength, rotation)
}

/**
 * Create a parabola from three points
 * The vertex will be computed as the point with the smallest y (for upward parabola)
 */
export function parabolaThrough(p1: PointLike, p2: PointLike, p3: PointLike): Parabola | null {
  // Fit y = ax² + bx + c through three points
  const x1 = p1.x, y1 = p1.y
  const x2 = p2.x, y2 = p2.y
  const x3 = p3.x, y3 = p3.y

  // Solve system of equations
  const denom = (x1 - x2) * (x1 - x3) * (x2 - x3)
  if (Math.abs(denom) < EPSILON) {
    return null  // Points are collinear or coincident
  }

  const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom
  const b = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom
  const c = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom

  if (Math.abs(a) < EPSILON) {
    return null  // Not a parabola (linear)
  }

  // Vertex is at x = -b/(2a)
  const vx = -b / (2 * a)
  const vy = a * vx * vx + b * vx + c

  // Focal length: p = 1/(4a)
  const focalLength = 1 / (4 * a)

  // Rotation: 0 for opening up (a > 0), 180 for opening down (a < 0)
  const rotation = a > 0 ? 0 : 180

  return new Parabola(point(vx, vy), Math.abs(focalLength), rotation)
}

/**
 * TikZ-style parabola: from start point through bend to end point
 * This creates a parabola segment between two points with a specified bend point
 */
export function parabolaBend(start: PointLike, bend: PointLike, end: PointLike): Parabola | null {
  return parabolaThrough(start, bend, end)
}

/**
 * Create a simple y = ax² parabola (vertex at origin, opens up/down)
 */
export function parabolaFromCoefficient(a: number, vertex: PointLike = { x: 0, y: 0 }): Parabola {
  // a = 1/(4p), so p = 1/(4a)
  const focalLength = 1 / (4 * a)
  const rotation = a > 0 ? 0 : 180
  return new Parabola(vertex, Math.abs(focalLength), rotation)
}
